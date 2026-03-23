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
import { BlockHistoryStore } from '../utils/block-history-store';

const RPC_TIMEOUT_MS = 15_000;

interface SplMintInfo {
  decimals: number;
  supply: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isInitialized: boolean;
  extensions?: Array<{ extension: string; state: Record<string, unknown> }>;
}

interface TokenMetadataExtension {
  extension: 'tokenMetadata';
  state: {
    name: string;
    symbol: string;
    mint: string;
    updateAuthority: string | null;
    uri: string;
    additionalMetadata: Array<unknown>;
  };
}

function isTokenMetadataExtension(
  ext: { extension: string; state: Record<string, unknown> },
): ext is TokenMetadataExtension {
  return (
    ext.extension === 'tokenMetadata' &&
    typeof ext.state['name'] === 'string' &&
    typeof ext.state['symbol'] === 'string'
  );
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
  private readonly blockHistory = new BlockHistoryStore(10, 0.4);
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

  getLatestBlock(): BlockInfo {
    const latest = this.blockHistory.getLatest();
    if (!latest) {
      return { blockNumber: 0, avgBlockTime: 0.4 };
    }
    return { blockNumber: latest.blockNumber, avgBlockTime: this.getAvgBlockTime() };
  }

  getAvgBlockTime(): number {
    return this.blockHistory.getAvgBlockTime();
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

    if (data.program === 'spl-token-2022') {
      const metaExt = data.parsed.info.extensions?.find(isTokenMetadataExtension);
      if (metaExt) {
        name = metaExt.state.name.trim();
        symbol = metaExt.state.symbol.trim();
      }
    } else {
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
    }

    return { name, symbol, decimals, totalSupply: supply };
  }

  private startSlotSubscription(): void {
    this.abortController = new AbortController();
    this.blockHistory.clear();
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
      for await (const { slot } of slotNotifications) {
        this._reconnectDelay = 1_000;
        this.blockHistory.push(Number(slot), Date.now());
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
