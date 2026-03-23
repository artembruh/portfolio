import { Logger } from '@nestjs/common';
import { JsonRpcProvider, WebSocketProvider, Contract, isAddress } from 'ethers';
import type { WebSocketLike } from 'ethers';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';
import { BlockInfo } from '../dto/block-info.dto';
import { TokenInfo } from '../dto/token-info.dto';
import { withTimeout } from '../utils/with-timeout';
import { getErrorMessage } from '../utils/get-error-message';
import { BlockHistoryStore } from '../utils/block-history-store';

const RPC_TIMEOUT_MS = 15_000;

/**
 * Extends WebSocketLike with onclose handler.
 * ethers v6 WebSocketLike does not declare onclose in its TypeScript interface
 * (GitHub #4587), but the property exists at runtime on the underlying WebSocket.
 * We use a typed local extension rather than casting to `any`.
 */
interface WebSocketWithClose extends WebSocketLike {
  onclose: null | ((...args: unknown[]) => unknown);
}

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];

export class EvmAdapter implements BlockchainAdapter {
  private readonly logger = new Logger(EvmAdapter.name);
  private readonly httpProvider: JsonRpcProvider;
  private wsProvider: WebSocketProvider | null = null;
  private readonly blockHistory = new BlockHistoryStore(10, 0);
  private readonly blockListeners: Array<() => void> = [];
  private _reconnectDelay = 1_000;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;

  constructor(
    private readonly httpRpcUrl: string,
    private readonly wsRpcUrl: string,
    private readonly chainName: string,
  ) {
    this.httpProvider = new JsonRpcProvider(httpRpcUrl);
    this.connect();
  }

  private connect(): void {
    try {
      const ws = new WebSocketProvider(this.wsRpcUrl);
      const socket = ws.websocket as WebSocketWithClose;
      socket.onclose = () => {
        this.scheduleReconnect();
      };
      socket.onerror = () => {
        this.scheduleReconnect();
      };
      this.wsProvider = ws;
      this.blockHistory.clear();
      this.startBlockSubscription();
    } catch (err) {
      this.logger.warn(
        `[${this.chainName}] WS provider init failed: ${getErrorMessage(err)}`,
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this._destroyed || this._reconnectTimer) return;
    const delay = this._reconnectDelay;
    this.logger.warn(
      `[${this.chainName}] WS disconnected — reconnecting in ${delay}ms`,
    );
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (!this._destroyed) this.connect();
    }, delay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 60_000);
  }

  onBlock(callback: () => void): void {
    this.blockListeners.push(callback);
  }

  private startBlockSubscription(): void {
    if (!this.wsProvider) return;
    this.wsProvider
      .on('block', (blockNumber: number) => {
        this.blockHistory.push(blockNumber, Date.now());
        for (const cb of this.blockListeners) {
          cb();
        }
      })
      .then(() => {
        this.logger.log(`[${this.chainName}] Block subscription active`);
        this._reconnectDelay = 1_000;
      })
      .catch((err: unknown) => {
        if (!this._destroyed) {
          this.logger.warn(
            `[${this.chainName}] Block subscription failed: ${getErrorMessage(err)}`,
          );
          this.scheduleReconnect();
        }
      });
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
    if (!isAddress(address)) {
      throw new Error(`Invalid EVM address: ${String(address)}`);
    }
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
      throw new Error(`[${this.chainName}] ${getErrorMessage(err)}`, { cause: err });
    }
  }

  destroy(): void {
    this._destroyed = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.wsProvider) {
      this.wsProvider.destroy().catch((err: unknown) => {
        this.logger.warn(
          `[${this.chainName}] Error during WS destroy: ${getErrorMessage(err)}`,
        );
      });
      this.wsProvider = null;
    }
  }
}
