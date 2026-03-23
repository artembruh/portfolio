export interface BlockRecord {
  blockNumber: number;
  timestamp: number;
}

export class BlockHistoryStore {
  private readonly history: BlockRecord[] = [];

  constructor(
    private readonly cap: number,
    private readonly defaultAvgBlockTime: number,
  ) {}

  push(blockNumber: number, timestamp: number): void {
    this.history.push({ blockNumber, timestamp });
    if (this.history.length > this.cap) {
      this.history.shift();
    }
  }

  getLatest(): BlockRecord | null {
    return this.history.length > 0
      ? this.history[this.history.length - 1]!
      : null;
  }

  getAvgBlockTime(): number {
    if (this.history.length < 2) {
      return this.defaultAvgBlockTime;
    }
    const deltas: number[] = [];
    for (let i = 1; i < this.history.length; i++) {
      deltas.push((this.history[i]!.timestamp - this.history[i - 1]!.timestamp) / 1000);
    }
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    // EVM rounds to 1 decimal (defaultAvgBlockTime === 0), Solana to 3 decimals
    if (this.defaultAvgBlockTime === 0) {
      return Math.round(avg * 10) / 10;
    }
    return Math.round(avg * 1000) / 1000;
  }

  clear(): void {
    this.history.length = 0;
  }

  get length(): number {
    return this.history.length;
  }
}
