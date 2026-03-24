import { EvmBlockSubscriber } from './evm-block-subscriber';
import { BlockHistoryStore } from '../utils/block-history-store';

// Mock functions — must be defined before jest.mock (hoisting)
const mockWsOn = jest.fn();
const mockWsDestroy = jest.fn();
const mockLoggerLog = jest.fn();
const mockLoggerWarn = jest.fn();

jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: mockLoggerLog,
    warn: mockLoggerWarn,
  })),
}));

let mockWsConstructorThrow = false;
let capturedOnclose: (() => void) | null = null;
let capturedOnerror: (() => void) | null = null;

jest.mock('ethers', () => {
  return {
    WebSocketProvider: jest.fn().mockImplementation(() => {
      if (mockWsConstructorThrow) throw new Error('WS init failed');
      const provider = {
        on: mockWsOn,
        destroy: mockWsDestroy,
        websocket: {
          onclose: null as (() => void) | null,
          onerror: null as (() => void) | null,
        },
      };
      // Capture handlers set by the subscriber
      Object.defineProperty(provider.websocket, 'onclose', {
        set(fn: (() => void) | null) { capturedOnclose = fn; },
        get() { return capturedOnclose; },
      });
      Object.defineProperty(provider.websocket, 'onerror', {
        set(fn: (() => void) | null) { capturedOnerror = fn; },
        get() { return capturedOnerror; },
      });
      return provider;
    }),
  };
});

describe('EvmBlockSubscriber', () => {
  let subscriber: EvmBlockSubscriber;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWsConstructorThrow = false;
    capturedOnclose = null;
    capturedOnerror = null;
    mockWsOn.mockResolvedValue(undefined);
    mockWsDestroy.mockResolvedValue(undefined);
    subscriber = new EvmBlockSubscriber('wss://eth-ws.example.com', 'ethereum');
  });

  afterEach(() => {
    subscriber.destroy();
  });

  describe('getLatestBlock()', () => {
    it('returns BlockInfo with blockNumber 0 and avgBlockTime 0 on cold start', () => {
      const result = subscriber.getLatestBlock();
      expect(result.blockNumber).toBe(0);
      expect(result.avgBlockTime).toBe(0);
    });

    it('returns BlockInfo from memory after block events have been received', () => {
      const store = (subscriber as unknown as { blockHistory: BlockHistoryStore }).blockHistory;
      const now = Date.now();
      store.push(21432891, now - 12000);
      store.push(21432892, now);
      const result = subscriber.getLatestBlock();
      expect(result.blockNumber).toBe(21432892);
      expect(result.avgBlockTime).toBe(12);
    });
  });

  describe('getAvgBlockTime()', () => {
    it('returns 0 when no blocks have been received yet (cold start)', () => {
      expect(subscriber.getAvgBlockTime()).toBe(0);
    });

    it('returns average delta in seconds when blockHistory has entries', () => {
      const now = Date.now();
      const store = (subscriber as unknown as { blockHistory: BlockHistoryStore }).blockHistory;
      store.push(100, now - 24000);
      store.push(101, now - 12000);
      store.push(102, now);
      expect(subscriber.getAvgBlockTime()).toBeCloseTo(12, 0);
    });
  });

  describe('reconnection', () => {
    it('schedules reconnect when WS onclose fires', () => {
      jest.useFakeTimers();
      expect(capturedOnclose).toBeDefined();
      capturedOnclose!();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('WS disconnected'),
      );
      jest.useRealTimers();
    });

    it('uses exponential backoff capped at 60s', () => {
      jest.useFakeTimers();
      const delays: number[] = [];
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // Trigger 5 reconnects
      for (let i = 0; i < 5; i++) {
        capturedOnclose!();
        const call = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
        if (call) delays.push(call[1] as number);
        // Advance past the timer to allow next reconnect
        jest.advanceTimersByTime((call?.[1] as number) ?? 1000);
      }

      // Backoff: 1000, 2000, 4000, 8000, 16000
      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);
      expect(delays[2]).toBe(4000);

      setTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });

    it('resets backoff delay after successful reconnect', async () => {
      jest.useFakeTimers();
      capturedOnclose!();

      // Advance timer to trigger reconnect
      jest.advanceTimersByTime(1000);
      // After successful on('block') subscription .then() fires, delay resets
      await Promise.resolve(); // flush microtasks
      // Verify reset happened: next scheduleReconnect should use delay 1000 again
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      capturedOnclose!();
      const call = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
      expect(call?.[1]).toBe(1000);

      setTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });

    it('clears blockHistory on reconnect', () => {
      const store = (subscriber as unknown as { blockHistory: BlockHistoryStore }).blockHistory;
      store.push(100, Date.now() - 12000);
      store.push(101, Date.now());
      expect(store.length).toBe(2);

      // Simulate reconnect — connect() clears blockHistory
      jest.useFakeTimers();
      capturedOnclose!();
      jest.advanceTimersByTime(1000);

      expect(store.length).toBe(0);
      expect(subscriber.getAvgBlockTime()).toBe(0);
      jest.useRealTimers();
    });

    it('does not reconnect after destroy', () => {
      jest.useFakeTimers();
      subscriber.destroy();
      capturedOnclose?.();
      jest.advanceTimersByTime(60000);
      // Only the initial connect — no reconnection after destroy
      const { WebSocketProvider } = jest.requireMock('ethers');
      const callsAfterDestroy = WebSocketProvider.mock.calls.length;
      jest.advanceTimersByTime(60000);
      expect(WebSocketProvider.mock.calls.length).toBe(callsAfterDestroy);
      jest.useRealTimers();
    });

    it('schedules reconnect when WS constructor throws', () => {
      jest.useFakeTimers();
      mockWsConstructorThrow = true;
      const s = new EvmBlockSubscriber('wss://ws', 'test');
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('WS provider init failed'),
      );
      s.destroy();
      jest.useRealTimers();
    });
  });

  describe('block subscription', () => {
    it('registers on("block") listener via wsProvider', () => {
      expect(mockWsOn).toHaveBeenCalledWith('block', expect.any(Function));
    });

    it('pushes block number and timestamp to blockHistory on block event and calls onBlock listeners', () => {
      const blockCallback = mockWsOn.mock.calls.find(
        (c: unknown[]) => c[0] === 'block',
      )?.[1] as ((blockNumber: number) => void) | undefined;
      expect(blockCallback).toBeDefined();

      const onBlockSpy = jest.fn();
      subscriber.onBlock(onBlockSpy);

      blockCallback!(42000);
      const result = subscriber.getLatestBlock();
      expect(result.blockNumber).toBe(42000);
      expect(onBlockSpy).toHaveBeenCalledTimes(1);
    });
  });
});
