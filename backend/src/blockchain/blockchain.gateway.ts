import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnModuleInit, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { BlockchainService } from './services/blockchain.service';

@WebSocketGateway({ cors: { origin: process.env['WS_CORS_ORIGIN'] ?? '*' } })
export class BlockchainGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BlockchainGateway.name);

  /** Maps socketId -> chainName */
  private readonly subscriptions = new Map<string, string>();

  constructor(private readonly blockchainService: BlockchainService) {}

  onModuleInit(): void {
    for (const chain of this.blockchainService.getSupportedChains()) {
      this.blockchainService.getBlockSubscriber(chain).onBlock((): void => {
        this.emitBlockUpdate(chain);
      });
    }
  }

  private emitBlockUpdate(chain: string): void {
    if (!this.server) return;
    const blockInfo = this.blockchainService.getBlockSubscriber(chain).getLatestBlock();
    this.server.to(chain).emit('block_update', { chain, ...blockInfo });
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const chain = this.subscriptions.get(client.id);
    if (chain) {
      await client.leave(chain);
    }
    this.subscriptions.delete(client.id);
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_chain')
  async handleSubscribeChain(
    @MessageBody() data: { chain?: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const chain = data.chain?.toLowerCase();
    if (!chain || !this.blockchainService.getSupportedChains().includes(chain)) {
      client.emit('error', { message: `Unsupported chain: ${data.chain ?? ''}` });
      return;
    }

    const previousChain = this.subscriptions.get(client.id);
    if (previousChain && previousChain !== chain) {
      await client.leave(previousChain);
    }

    await client.join(chain);
    this.subscriptions.set(client.id, chain);

    const blockInfo = this.blockchainService.getBlockSubscriber(chain).getLatestBlock();
    client.emit('block_update', { chain, ...blockInfo });
  }
}
