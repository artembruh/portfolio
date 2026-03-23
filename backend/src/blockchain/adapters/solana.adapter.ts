import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  isAddress,
  address,
} from '@solana/kit';
import { fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata-kit';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';
import { BlockInfo } from '../dto/block-info.dto';
import { TokenInfo } from '../dto/token-info.dto';
import { withTimeout } from '../utils/with-timeout';
import { getErrorMessage } from '../utils/get-error-message';

const RPC_TIMEOUT_MS = 15_000;

export class SolanaAdapter implements BlockchainAdapter {
  private readonly rpc: ReturnType<typeof createSolanaRpc>;
  private readonly rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>;
  private readonly slotTimes: number[] = [];
  private readonly blockListeners: Array<() => void> = [];
  private abortController: AbortController | null = null;

  constructor(
    private readonly httpRpcUrl: string,
    private readonly wsRpcUrl: string,
    private readonly chainName: string,
  ) {
    this.rpc = createSolanaRpc(httpRpcUrl);
    this.rpcSubscriptions = createSolanaRpcSubscriptions(wsRpcUrl);
    this.startSlotSubscription();
  }

  onBlock(callback: () => void): void {
    this.blockListeners.push(callback);
  }

  async getLatestBlock(): Promise<BlockInfo> {
    const slot = await withTimeout(this.rpc.getSlot().send(), RPC_TIMEOUT_MS, 'getSlot');
    const avgBlockTime = await this.getAvgBlockTime();
    return { blockNumber: Number(slot), avgBlockTime };
  }

  getAvgBlockTime(): Promise<number> {
    if (this.slotTimes.length < 2) {
      return Promise.resolve(0.4);
    }
    const deltas: number[] = [];
    for (let i = 1; i < this.slotTimes.length; i++) {
      deltas.push((this.slotTimes[i]! - this.slotTimes[i - 1]!) / 1000);
    }
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return Promise.resolve(Math.round(avg * 1000) / 1000);
  }

  async getTokenInfo(mintAddress: string): Promise<TokenInfo> {
    if (!isAddress(mintAddress)) {
      throw new Error(`Invalid Solana address: ${mintAddress}`);
    }

    const mint = address(mintAddress);

    const accountInfo = await withTimeout(
      this.rpc.getAccountInfo(mint, { encoding: 'jsonParsed' }).send(),
      RPC_TIMEOUT_MS,
      'getAccountInfo',
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedInfo = (accountInfo.value?.data as any)?.parsed?.info;
    if (!parsedInfo) {
      throw new Error('Not a valid SPL token mint account');
    }

    const decimals: number = parsedInfo.decimals;
    const supply: string = parsedInfo.supply;

    let name = 'Unknown Token';
    let symbol = 'UNKNOWN';
    try {
      const metadata = await withTimeout(
        fetchMetadataFromSeeds(this.rpc, { mint }),
        RPC_TIMEOUT_MS,
        'fetchMetadataFromSeeds',
      );
      name = metadata.data.name.replace(/\0/g, '').trim();
      symbol = metadata.data.symbol.replace(/\0/g, '').trim();
    } catch {
      // Token may not have Metaplex metadata — use fallback
    }

    return { name, symbol, decimals, totalSupply: supply };
  }

  private startSlotSubscription(): void {
    this.abortController = new AbortController();
    void (async () => {
      try {
        const slotNotifications = await this.rpcSubscriptions
          .slotNotifications()
          .subscribe({ abortSignal: this.abortController!.signal });

        for await (const _notification of slotNotifications) {
          this.slotTimes.push(Date.now());
          if (this.slotTimes.length > 20) {
            this.slotTimes.shift();
          }
          for (const cb of this.blockListeners) {
            cb();
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          // eslint-disable-next-line no-console
          console.warn(`[${this.chainName}] Slot subscription error:`, getErrorMessage(err));
        }
      }
    })();
  }

  destroy(): void {
    this.abortController?.abort();
  }
}
