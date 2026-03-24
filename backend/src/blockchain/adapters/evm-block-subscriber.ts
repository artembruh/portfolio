import { Logger } from '@nestjs/common';
import { WebSocketProvider } from 'ethers';
import type { WebSocketLike } from 'ethers';
import type { Chain } from '../chain.enum';
import { BlockSubscriber } from '../interfaces/block-subscriber.interface';
import { BlockInfo } from '../dto/block-info.dto';
import { getErrorMessage } from '../utils/get-error-message';
import { BlockHistoryStore } from '../utils/block-history-store';
import { ReconnectStrategy } from '../utils/reconnect-strategy';

interface WebSocketWithClose extends WebSocketLike {
  onclose: null | ((...args: unknown[]) => unknown);
}

export class EvmBlockSubscriber implements BlockSubscriber {
  private readonly logger = new Logger(EvmBlockSubscriber.name);
  private wsProvider: WebSocketProvider | null = null;
  private readonly blockHistory = new BlockHistoryStore(10, 0, 2);
  private readonly blockListeners: Array<() => void> = [];
  private readonly reconnect: ReconnectStrategy;

  constructor(
    private readonly wsRpcUrl: string,
    private readonly chainName: Chain,
  ) {
    this.reconnect = new ReconnectStrategy(() => this.connect());
    this.connect();
  }

  private scheduleReconnect(): void {
    this.logger.warn(`[${this.chainName}] WS disconnected — reconnecting`);
    this.reconnect.scheduleReconnect();
  }

  private connect(): void {
    try {
      const ws = new WebSocketProvider(this.wsRpcUrl);
      const socket = ws.websocket as WebSocketWithClose;
      socket.onclose = () => this.scheduleReconnect();
      socket.onerror = () => this.scheduleReconnect();
      this.wsProvider = ws;
      this.blockHistory.clear();
      this.startBlockSubscription();
    } catch (err) {
      this.logger.warn(`[${this.chainName}] WS provider init failed: ${getErrorMessage(err)}`);
      this.reconnect.scheduleReconnect();
    }
  }

  onBlock(callback: () => void): void {
    this.blockListeners.push(callback);
  }

  private startBlockSubscription(): void {
    if (!this.wsProvider) return;
    this.wsProvider
      .on('block', (blockNumber: number) => {
        this.blockHistory.push(blockNumber, Date.now());
        for (const cb of this.blockListeners) cb();
      })
      .then(() => {
        this.logger.log(`[${this.chainName}] Block subscription active`);
        this.reconnect.resetDelay();
      })
      .catch((err: unknown) => {
        if (!this.reconnect.destroyed) {
          this.logger.warn(`[${this.chainName}] Block subscription failed: ${getErrorMessage(err)}`);
          this.scheduleReconnect();
        }
      });
  }

  getLatestBlock(): BlockInfo {
    const latest = this.blockHistory.getLatest();
    if (!latest) return { blockNumber: 0, avgBlockTime: 0 };
    return { blockNumber: latest.blockNumber, avgBlockTime: this.getAvgBlockTime() };
  }

  getAvgBlockTime(): number {
    return this.blockHistory.getAvgBlockTime();
  }

  destroy(): void {
    this.reconnect.destroy();
    if (this.wsProvider) {
      this.wsProvider.destroy().catch((err: unknown) => {
        this.logger.warn(`[${this.chainName}] Error during WS destroy: ${getErrorMessage(err)}`);
      });
      this.wsProvider = null;
    }
  }
}
