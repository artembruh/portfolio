import { createSolanaRpcSubscriptions } from '@solana/kit';
import { Logger } from '@nestjs/common';
import { Chain } from '../chain.enum';
import { BlockSubscriber } from '../interfaces/block-subscriber.interface';
import { BlockInfo } from '../dto/block-info.dto';
import { BlockHistoryStore } from '../utils/block-history-store';
import { ReconnectStrategy } from '../utils/reconnect-strategy';

export class SolanaBlockSubscriber implements BlockSubscriber {
  private readonly logger = new Logger(SolanaBlockSubscriber.name);
  private readonly rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>;
  private readonly blockHistory = new BlockHistoryStore(10, 0.4, 3);
  private readonly blockListeners: Array<() => void> = [];
  private readonly reconnect: ReconnectStrategy;
  private abortController: AbortController = new AbortController();

  constructor(
    private readonly wsRpcUrl: string,
    private readonly chainName: Chain,
  ) {
    this.rpcSubscriptions = createSolanaRpcSubscriptions(wsRpcUrl);
    this.reconnect = new ReconnectStrategy(() => this.startSlotSubscription());
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
        this.reconnect.resetDelay();
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
    this.logger.warn(
      `[${this.chainName}] Slot subscription lost — reconnecting`,
    );
    this.reconnect.scheduleReconnect();
  }

  destroy(): void {
    this.reconnect.destroy();
    this.abortController.abort();
  }
}
