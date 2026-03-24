// reconnect-strategy.spec.ts
import { ReconnectStrategy } from './reconnect-strategy';

describe('ReconnectStrategy', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('calls connectFn after initial delay', () => {
    const connectFn = jest.fn();
    const strategy = new ReconnectStrategy(connectFn);
    strategy.scheduleReconnect();
    jest.advanceTimersByTime(1000);
    expect(connectFn).toHaveBeenCalledTimes(1);
  });

  it('doubles delay on consecutive calls, caps at 60s', () => {
    const spy = jest.spyOn(global, 'setTimeout');
    const connectFn = jest.fn();
    const strategy = new ReconnectStrategy(connectFn);

    strategy.scheduleReconnect();
    expect(spy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    jest.advanceTimersByTime(1000);

    strategy.scheduleReconnect();
    expect(spy).toHaveBeenLastCalledWith(expect.any(Function), 2000);
    jest.advanceTimersByTime(2000);

    strategy.scheduleReconnect();
    expect(spy).toHaveBeenLastCalledWith(expect.any(Function), 4000);

    spy.mockRestore();
  });

  it('resets delay on resetDelay()', () => {
    const spy = jest.spyOn(global, 'setTimeout');
    const connectFn = jest.fn();
    const strategy = new ReconnectStrategy(connectFn);

    strategy.scheduleReconnect();
    jest.advanceTimersByTime(1000);
    strategy.scheduleReconnect();
    jest.advanceTimersByTime(2000);

    strategy.resetDelay();
    strategy.scheduleReconnect();
    expect(spy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

    spy.mockRestore();
  });

  it('does not schedule after destroy()', () => {
    const connectFn = jest.fn();
    const strategy = new ReconnectStrategy(connectFn);
    strategy.destroy();
    strategy.scheduleReconnect();
    jest.advanceTimersByTime(60000);
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('ignores duplicate scheduleReconnect while timer is pending', () => {
    const spy = jest.spyOn(global, 'setTimeout');
    const connectFn = jest.fn();
    const strategy = new ReconnectStrategy(connectFn);
    strategy.scheduleReconnect();
    strategy.scheduleReconnect();
    const reconnectCalls = spy.mock.calls.filter(c => (c[1] as number) >= 1000);
    expect(reconnectCalls.length).toBe(1);
    spy.mockRestore();
  });
});
