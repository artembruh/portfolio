export interface BlockRecord {
  blockNumber: number;
  timestamp: number;
}

export class BlockHistoryStore {
  private readonly history: BlockRecord[] = [];
  private readonly decimalPlaces: number;

  constructor(
    private readonly cap: number,
    private readonly defaultAvgBlockTime: number,
    decimalPlaces?: number,
  ) {
    this.decimalPlaces = decimalPlaces ?? (defaultAvgBlockTime === 0 ? 1 : 3);
  }

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
    const factor = Math.pow(10, this.decimalPlaces);
    return Math.round(avg * factor) / factor;
  }

  clear(): void {
    this.history.length = 0;
  }

  get length(): number {
    return this.history.length;
  }
}
