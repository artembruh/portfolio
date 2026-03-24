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
import { Chain } from './chain.enum';
import { BlockSubscriberFactory } from './factories/block-subscriber.factory';

@WebSocketGateway({ cors: { origin: process.env['WS_CORS_ORIGIN'] ?? '*' } })
export class BlockchainGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BlockchainGateway.name);

  /** Each client subscribes to at most one chain at a time. */
  private readonly subscriptions = new Map<string, Chain>();

  constructor(private readonly blockSubscribers: BlockSubscriberFactory) {}

  onModuleInit(): void {
    for (const chain of Object.values(Chain)) {
      this.blockSubscribers.get(chain).onBlock((): void => {
        this.emitBlockUpdate(chain);
      });
    }
  }

  private emitBlockUpdate(chain: Chain): void {
    if (!this.server) return;
    const blockInfo = this.blockSubscribers.get(chain).getLatestBlock();
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
    const chainValues = Object.values(Chain) as string[];
    const chain = data.chain?.toLowerCase();
    if (!chain || !chainValues.includes(chain)) {
      client.emit('error', { message: `Unsupported chain: ${data.chain ?? ''}` });
      return;
    }

    const validChain = chain as Chain;

    const previousChain = this.subscriptions.get(client.id);
    if (previousChain && previousChain !== validChain) {
      await client.leave(previousChain);
    }

    await client.join(validChain);
    this.subscriptions.set(client.id, validChain);

    const blockInfo = this.blockSubscribers.get(validChain).getLatestBlock();
    client.emit('block_update', { chain: validChain, ...blockInfo });
  }
}
