import { JsonRpcProvider, WebSocketProvider, Contract } from 'ethers';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';
import { BlockInfo } from '../dto/block-info.dto';
import { TokenInfo } from '../dto/token-info.dto';
import { withTimeout } from '../utils/with-timeout';

const RPC_TIMEOUT_MS = 15_000;

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];

export class EvmAdapter implements BlockchainAdapter {
  private readonly httpProvider: JsonRpcProvider;
  private readonly wsProvider: WebSocketProvider;
  private readonly blockTimes: number[] = [];
  private readonly blockListeners: Array<() => void> = [];

  constructor(
    private readonly httpRpcUrl: string,
    private readonly wsRpcUrl: string,
    private readonly chainName: string,
  ) {
    this.httpProvider = new JsonRpcProvider(httpRpcUrl);
    this.wsProvider = new WebSocketProvider(wsRpcUrl);
    this.startBlockSubscription();
  }

  onBlock(callback: () => void): void {
    this.blockListeners.push(callback);
  }

  private startBlockSubscription(): void {
    try {
      void this.wsProvider.on('block', () => {
        this.blockTimes.push(Date.now());
        if (this.blockTimes.length > 20) {
          this.blockTimes.shift();
        }
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

  async getLatestBlock(): Promise<BlockInfo> {
    const blockNumber = await withTimeout(
      this.httpProvider.getBlockNumber(),
      RPC_TIMEOUT_MS,
      'getBlockNumber',
    );
    const avgBlockTime = await this.getAvgBlockTime();
    return { blockNumber, avgBlockTime };
  }

  getAvgBlockTime(): Promise<number> {
    if (this.blockTimes.length < 2) {
      return Promise.resolve(0);
    }
    const deltas: number[] = [];
    for (let i = 1; i < this.blockTimes.length; i++) {
      deltas.push((this.blockTimes[i]! - this.blockTimes[i - 1]!) / 1000);
    }
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return Promise.resolve(Math.round(avg * 10) / 10);
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
    void this.wsProvider.destroy();
  }
}
