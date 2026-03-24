// reconnect-strategy.ts
export class ReconnectStrategy {
  private _delay = 1_000;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;

  constructor(private readonly connectFn: () => void) {}

  scheduleReconnect(): void {
    if (this._destroyed || this._timer) return;
    const delay = this._delay;
    this._timer = setTimeout(() => {
      this._timer = null;
      if (!this._destroyed) this.connectFn();
    }, delay);
    this._delay = Math.min(this._delay * 2, 60_000);
  }

  resetDelay(): void {
    this._delay = 1_000;
  }

  destroy(): void {
    this._destroyed = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  get destroyed(): boolean {
    return this._destroyed;
  }
}
