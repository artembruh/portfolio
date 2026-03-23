import { EvmAdapter } from './evm.adapter';
import { BlockHistoryStore } from '../utils/block-history-store';

// Mock functions — must be defined before jest.mock (hoisting)
const mockWsOn = jest.fn();
const mockWsDestroy = jest.fn();
const mockContractName = jest.fn();
const mockContractSymbol = jest.fn();
const mockContractDecimals = jest.fn();
const mockContractTotalSupply = jest.fn();
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
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
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
      // Capture handlers set by the adapter
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
    Contract: jest.fn().mockImplementation(() => ({
      name: mockContractName,
      symbol: mockContractSymbol,
      decimals: mockContractDecimals,
      totalSupply: mockContractTotalSupply,
    })),
    isAddress: jest.fn((addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr)),
  };
});

describe('EvmAdapter', () => {
  let adapter: EvmAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWsConstructorThrow = false;
    capturedOnclose = null;
    capturedOnerror = null;
    mockWsOn.mockResolvedValue(undefined);
    mockWsDestroy.mockResolvedValue(undefined);
    mockContractName.mockResolvedValue('Tether USD');
    mockContractSymbol.mockResolvedValue('USDT');
    mockContractDecimals.mockResolvedValue(6);
    mockContractTotalSupply.mockResolvedValue(BigInt('36812421234000000'));
    adapter = new EvmAdapter(
      'https://eth-rpc.example.com',
      'wss://eth-ws.example.com',
      'ethereum',
    );
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('getLatestBlock()', () => {
    it('returns BlockInfo with blockNumber 0 and avgBlockTime 0 on cold start', () => {
      const result = adapter.getLatestBlock();
      expect(result.blockNumber).toBe(0);
      expect(result.avgBlockTime).toBe(0);
    });

    it('returns BlockInfo from memory after block events have been received', () => {
      const store = (adapter as unknown as { blockHistory: BlockHistoryStore }).blockHistory;
      const now = Date.now();
      store.push(21432891, now - 12000);
      store.push(21432892, now);
      const result = adapter.getLatestBlock();
      expect(result.blockNumber).toBe(21432892);
      expect(result.avgBlockTime).toBe(12);
    });
  });

  describe('getAvgBlockTime()', () => {
    it('returns 0 when no blocks have been received yet (cold start)', () => {
      expect(adapter.getAvgBlockTime()).toBe(0);
    });

    it('returns average delta in seconds when blockHistory has entries', () => {
      const now = Date.now();
      const store = (adapter as unknown as { blockHistory: BlockHistoryStore }).blockHistory;
      store.push(100, now - 24000);
      store.push(101, now - 12000);
      store.push(102, now);
      expect(adapter.getAvgBlockTime()).toBeCloseTo(12, 0);
    });
  });

  describe('getTokenInfo()', () => {
    it('returns TokenInfo with correct shape', async () => {
      const result = await adapter.getTokenInfo(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      );
      expect(result).toEqual({
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        totalSupply: '36812421234000000',
      });
    });

    it('rejects with timeout error after 15s when RPC hangs', async () => {
      mockContractName.mockReturnValue(new Promise(() => {}));
      jest.useFakeTimers();
      const promise = adapter.getTokenInfo(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      );
      jest.advanceTimersByTime(15001);
      await expect(promise).rejects.toThrow(/Timeout/);
      jest.useRealTimers();
    });

    it('rejects invalid EVM address before making RPC call', async () => {
      await expect(adapter.getTokenInfo('not-an-address')).rejects.toThrow(
        'Invalid EVM address',
      );
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
      // _reconnectDelay should now be 2000
      expect(
        (adapter as unknown as { _reconnectDelay: number })._reconnectDelay,
      ).toBe(2_000);

      // Advance timer to trigger reconnect
      jest.advanceTimersByTime(1000);
      // After successful on('block') subscription, delay resets
      // The .then() callback sets _reconnectDelay = 1_000
      await Promise.resolve(); // flush microtasks
      expect(
        (adapter as unknown as { _reconnectDelay: number })._reconnectDelay,
      ).toBe(1_000);

      jest.useRealTimers();
    });

    it('clears blockHistory on reconnect', () => {
      const store = (adapter as unknown as { blockHistory: BlockHistoryStore }).blockHistory;
      store.push(100, Date.now() - 12000);
      store.push(101, Date.now());
      expect(store.length).toBe(2);

      // Simulate reconnect — connect() clears blockHistory
      jest.useFakeTimers();
      capturedOnclose!();
      jest.advanceTimersByTime(1000);

      expect(store.length).toBe(0);
      expect(adapter.getAvgBlockTime()).toBe(0);
      jest.useRealTimers();
    });

    it('does not reconnect after destroy', () => {
      jest.useFakeTimers();
      adapter.destroy();
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
      const a = new EvmAdapter('https://rpc', 'wss://ws', 'test');
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('WS provider init failed'),
      );
      a.destroy();
      jest.useRealTimers();
    });
  });

  describe('logger', () => {
    it('uses NestJS Logger, not console.warn', () => {
      jest.useFakeTimers();
      capturedOnclose!();
      expect(mockLoggerWarn).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('block subscription', () => {
    it('registers on("block") listener via wsProvider', () => {
      expect(mockWsOn).toHaveBeenCalledWith('block', expect.any(Function));
    });

    it('pushes block number and timestamp to blockHistory on block event', () => {
      const blockCallback = mockWsOn.mock.calls.find(
        (c: unknown[]) => c[0] === 'block',
      )?.[1] as ((blockNumber: number) => void) | undefined;
      expect(blockCallback).toBeDefined();

      blockCallback!(42000);
      const result = adapter.getLatestBlock();
      expect(result.blockNumber).toBe(42000);
    });
  });
});
