import { JsonRpcProvider, WebSocketProvider, Contract } from 'ethers';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';
import { BlockInfo } from '../dto/block-info.dto';
import { TokenInfo } from '../dto/token-info.dto';
import { withTimeout } from '../utils/with-timeout';
import { BlockHistoryStore } from '../utils/block-history-store';

const RPC_TIMEOUT_MS = 15_000;

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];

export class EvmAdapter implements BlockchainAdapter {
  private readonly httpProvider: JsonRpcProvider;
  private wsProvider: WebSocketProvider | null = null;
  private readonly blockHistory = new BlockHistoryStore(10, 0);
  private readonly blockListeners: Array<() => void> = [];

  constructor(
    private readonly httpRpcUrl: string,
    private readonly wsRpcUrl: string,
    private readonly chainName: string,
  ) {
    this.httpProvider = new JsonRpcProvider(httpRpcUrl);
    this.initWsProvider();
  }

  private initWsProvider(): void {
    try {
      const ws = new WebSocketProvider(this.wsRpcUrl);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws.websocket as any).on?.('error', () => {
        // eslint-disable-next-line no-console
        console.warn(`[${this.chainName}] WS connection error`);
      });
      this.wsProvider = ws;
      this.startBlockSubscription();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[${this.chainName}] WS provider init failed:`, (err as Error).message);
    }
  }

  onBlock(callback: () => void): void {
    this.blockListeners.push(callback);
  }

  private startBlockSubscription(): void {
    if (!this.wsProvider) return;
    try {
      void this.wsProvider
        .on('block', (blockNumber: number) => {
          this.blockHistory.push(blockNumber, Date.now());
          for (const cb of this.blockListeners) {
            cb();
          }
        });
      void this.wsProvider.on('error', (err: Error) => {
        // eslint-disable-next-line no-console
        console.warn(`[${this.chainName}] WS error:`, err.message);
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[${this.chainName}] Failed to start block subscription:`,
        (err as Error).message,
      );
    }
  }

  getLatestBlock(): BlockInfo {
    const latest = this.blockHistory.getLatest();
    if (!latest) {
      return { blockNumber: 0, avgBlockTime: 0 };
    }
    return { blockNumber: latest.blockNumber, avgBlockTime: this.getAvgBlockTime() };
  }

  getAvgBlockTime(): number {
    return this.blockHistory.getAvgBlockTime();
  }

  async getTokenInfo(address: string): Promise<TokenInfo> {
    try {
      const contract = new Contract(address, ERC20_ABI, this.httpProvider) as Contract & {
        name(): Promise<string>;
        symbol(): Promise<string>;
        decimals(): Promise<bigint>;
        totalSupply(): Promise<bigint>;
      };
      const [name, symbol, decimals, totalSupply] = await withTimeout(
        Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.totalSupply(),
        ]),
        RPC_TIMEOUT_MS,
        'getTokenInfo',
      );
      return {
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
      };
    } catch (err) {
      throw new Error(`[${this.chainName}] ${(err as Error).message}`, { cause: err });
    }
  }

  destroy(): void {
    if (this.wsProvider) {
      void this.wsProvider.destroy();
    }
  }
}
