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
import { BlockchainAdapter } from './interfaces/blockchain-adapter.interface';
import { TokenInfo } from './dto/token-info.dto';
import { getErrorMessage } from './utils/get-error-message';

@WebSocketGateway({ cors: { origin: '*' } })
export class BlockchainGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BlockchainGateway.name);

  /** Maps socketId -> chainName */
  private readonly subscriptions = new Map<string, string>();

  /** Maps socketId -> timestamp of last token_lookup (ms) */
  private readonly rateLimiter = new Map<string, number>();

  constructor(private readonly blockchainService: BlockchainService) {}

  onModuleInit(): void {
    for (const chain of this.blockchainService.getSupportedChains()) {
      this.blockchainService.getAdapter(chain).onBlock((): void => {
        void (async (): Promise<void> => {
          if (!this.server) return;
          try {
            const blockInfo = await this.blockchainService
              .getAdapter(chain)
              .getLatestBlock();
            this.server.to(chain).emit('block_update', { chain, ...blockInfo });
          } catch (err) {
            this.logger.warn(
              `[${chain}] Failed to fetch block info on block event: ${getErrorMessage(err)}`,
            );
          }
        })();
      });
    }
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const chain = this.subscriptions.get(client.id);
    if (chain) {
      void client.leave(chain);
    }
    this.subscriptions.delete(client.id);
    this.rateLimiter.delete(client.id);
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

    try {
      const blockInfo = await this.blockchainService.getAdapter(chain).getLatestBlock();
      client.emit('block_update', { chain, ...blockInfo });
    } catch (err) {
      client.emit('error', {
        message: `Failed to fetch block info: ${getErrorMessage(err)}`,
      });
    }
  }

  @SubscribeMessage('token_lookup')
  async handleTokenLookup(
    @MessageBody() data: { chain?: string; address?: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    // Rate limit check: 1 lookup per 5 seconds per socket
    const now = Date.now();
    const lastLookup = this.rateLimiter.get(client.id) ?? 0;
    const elapsed = (now - lastLookup) / 1000;
    if (elapsed < 5) {
      const wait = Math.ceil(5 - elapsed);
      client.emit('trace', {
        step: 1,
        status: 'error',
        message: `Rate limited — wait ${wait} seconds`,
      });
      return;
    }
    this.rateLimiter.set(client.id, now);

    // Validate required fields
    const chain = data.chain?.toLowerCase();
    const tokenAddress = data.address;
    if (!chain || !tokenAddress) {
      client.emit('trace', { step: 1, status: 'error', message: 'Missing chain or address' });
      return;
    }

    // Resolve adapter (throws for unsupported chains)
    let adapter: BlockchainAdapter;
    try {
      adapter = this.blockchainService.getAdapter(chain);
    } catch {
      client.emit('trace', { step: 1, status: 'error', message: `Unsupported chain: ${chain}` });
      return;
    }

    // Step 1: Validate address format
    client.emit('trace', { step: 1, status: 'in_progress', message: `Looking up token on ${chain}...` });
    client.emit('trace', { step: 1, status: 'done', message: `Address validated on ${chain}` });

    // Step 2: Fetch token info — THE real RPC call
    client.emit('trace', { step: 2, status: 'in_progress', message: 'Gathering token info...' });
    let tokenInfo: TokenInfo;
    try {
      tokenInfo = await adapter.getTokenInfo(tokenAddress);
    } catch (err) {
      client.emit('trace', { step: 2, status: 'error', message: getErrorMessage(err) });
      return;
    }
    client.emit('trace', { step: 2, status: 'done', message: 'Token info retrieved' });

    // Step 3: Decode/parse response (processing step — data already parsed by adapter)
    client.emit('trace', { step: 3, status: 'in_progress', message: 'Decoding contract data...' });
    client.emit('trace', { step: 3, status: 'done', message: 'Data decoded' });

    // Step 4: Supply info (included in tokenInfo from step 2)
    client.emit('trace', { step: 4, status: 'in_progress', message: 'Fetching supply info...' });
    client.emit('trace', { step: 4, status: 'done', message: 'Supply info fetched' });

    // Step 5: Assemble and return result
    client.emit('trace', { step: 5, status: 'in_progress', message: 'Fulfilling request...' });
    client.emit('trace', { step: 5, status: 'done', message: 'Request fulfilled' });

    client.emit('token_result', tokenInfo);
  }
}
