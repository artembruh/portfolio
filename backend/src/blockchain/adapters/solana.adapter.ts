import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  isAddress,
  address,
} from '@solana/kit';
import { Logger } from '@nestjs/common';
import { fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata-kit';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';
import { BlockInfo } from '../dto/block-info.dto';
import { TokenInfo } from '../dto/token-info.dto';
import { withTimeout } from '../utils/with-timeout';

const RPC_TIMEOUT_MS = 15_000;

interface SplMintInfo {
  decimals: number;
  supply: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isInitialized: boolean;
}

interface SplParsedMintData {
  parsed: {
    info: SplMintInfo;
    type: string;
  };
  program: string;
  space: bigint;
}

function isSplParsedData(d: unknown): d is SplParsedMintData {
  return (
    typeof d === 'object' &&
    d !== null &&
    'parsed' in d &&
    typeof (d as SplParsedMintData).parsed?.info?.decimals === 'number'
  );
}

export class SolanaAdapter implements BlockchainAdapter {
  private readonly logger = new Logger(SolanaAdapter.name);
  private readonly rpc: ReturnType<typeof createSolanaRpc>;
  private readonly rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>;
  private readonly slotTimes: number[] = [];
  private readonly blockListeners: Array<() => void> = [];
  private abortController: AbortController = new AbortController();
  private _reconnectDelay = 1_000;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;

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

    const data = accountInfo.value?.data;
    if (!isSplParsedData(data)) {
      throw new Error('Not a valid SPL token mint account');
    }
    const { decimals, supply } = data.parsed.info;

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
    this.slotTimes.length = 0;
    this.runSubscriptionLoop().catch(() => {
      // errors handled internally in runSubscriptionLoop
    });
  }

  private async runSubscriptionLoop(): Promise<void> {
    try {
      const slotNotifications = await this.rpcSubscriptions
        .slotNotifications()
        .subscribe({ abortSignal: this.abortController.signal });
      this.logger.log(`[${this.chainName}] Slot subscription active`);
      for await (const _slot of slotNotifications) {
        _slot satisfies object;
        this._reconnectDelay = 1_000;
        this.slotTimes.push(Date.now());
        if (this.slotTimes.length > 20) this.slotTimes.shift();
        for (const cb of this.blockListeners) cb();
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        this.logger.warn(
          `[${this.chainName}] Slot subscription error: ${err.message}`,
        );
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this._destroyed || this._reconnectTimer) return;
    const delay = this._reconnectDelay;
    this.logger.warn(
      `[${this.chainName}] Slot subscription lost — reconnecting in ${delay}ms`,
    );
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (!this._destroyed) this.startSlotSubscription();
    }, delay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 60_000);
  }

  destroy(): void {
    this._destroyed = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this.abortController.abort();
  }
}
