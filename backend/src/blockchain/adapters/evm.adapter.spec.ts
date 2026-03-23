import { EvmAdapter } from './evm.adapter';

// Mock functions — must be defined before jest.mock (hoisting)
const mockGetBlockNumber = jest.fn();
const mockWsOn = jest.fn();
const mockWsDestroy = jest.fn();
const mockContractName = jest.fn();
const mockContractSymbol = jest.fn();
const mockContractDecimals = jest.fn();
const mockContractTotalSupply = jest.fn();

jest.mock('ethers', () => {
  return {
    isAddress: jest.fn().mockReturnValue(true),
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBlockNumber: mockGetBlockNumber,
    })),
    WebSocketProvider: jest.fn().mockImplementation(() => ({
      on: mockWsOn.mockResolvedValue(undefined),
      destroy: mockWsDestroy.mockResolvedValue(undefined),
      websocket: {
        onclose: null,
        onerror: null,
      },
    })),
    Contract: jest.fn().mockImplementation(() => ({
      name: mockContractName,
      symbol: mockContractSymbol,
      decimals: mockContractDecimals,
      totalSupply: mockContractTotalSupply,
    })),
  };
});

const mockLoggerLog = jest.fn();
const mockLoggerWarn = jest.fn();
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: mockLoggerLog,
    warn: mockLoggerWarn,
  })),
}));

describe('EvmAdapter', () => {
  let adapter: EvmAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBlockNumber.mockResolvedValue(21432891);
    mockContractName.mockResolvedValue('Tether USD');
    mockContractSymbol.mockResolvedValue('USDT');
    mockContractDecimals.mockResolvedValue(6);
    mockContractTotalSupply.mockResolvedValue(BigInt('36812421234000000'));
    const { isAddress } = jest.requireMock('ethers') as { isAddress: jest.Mock };
    isAddress.mockReturnValue(true);
    adapter = new EvmAdapter(
      'https://eth-rpc.example.com',
      'wss://eth-ws.example.com',
      'ethereum',
    );
  });

  describe('getLatestBlock()', () => {
    it('returns BlockInfo with numeric blockNumber and avgBlockTime on cold start', async () => {
      const result = await adapter.getLatestBlock();
      expect(result.blockNumber).toBe(21432891);
      expect(result.avgBlockTime).toBe(0);
    });
  });

  describe('getTokenInfo()', () => {
    it('returns TokenInfo with correct shape including totalSupply as string', async () => {
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
      // Mock name() to never resolve
      mockContractName.mockReturnValue(new Promise(() => {}));

      jest.useFakeTimers();

      const promise = adapter.getTokenInfo(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      );

      jest.advanceTimersByTime(15001);

      await expect(promise).rejects.toThrow(/Timeout/);

      jest.useRealTimers();
    });
  });

  describe('getAvgBlockTime()', () => {
    it('returns 0 when no blocks have been received yet (cold start)', async () => {
      const result = await adapter.getAvgBlockTime();
      expect(result).toBe(0);
    });

    it('returns average delta in seconds when blockTimes has entries', async () => {
      const now = Date.now();
      // Inject 3 block timestamps: 12s apart each
      (adapter as unknown as { blockTimes: number[] }).blockTimes = [now - 24000, now - 12000, now];
      const result = await adapter.getAvgBlockTime();
      // Expected average: (12 + 12) / 2 = 12 seconds
      expect(result).toBeCloseTo(12, 0);
    });
  });

  describe('reconnection', () => {
    let setTimeoutSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      setTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });

    function getWsProviderMock() {
      const { WebSocketProvider } = jest.requireMock('ethers') as {
        WebSocketProvider: jest.Mock;
      };
      return WebSocketProvider.mock.results[WebSocketProvider.mock.results.length - 1]
        ?.value as { websocket: { onclose: (() => void) | null; onerror: (() => void) | null } };
    }

    it('schedules reconnect when websocket closes', () => {
      const wsMock = getWsProviderMock();
      expect(wsMock.websocket.onclose).toBeDefined();
      wsMock.websocket.onclose!();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('doubles backoff delay on consecutive disconnects', () => {
      const { WebSocketProvider } = jest.requireMock('ethers') as {
        WebSocketProvider: jest.Mock;
      };

      let wsMock = getWsProviderMock();
      // First disconnect — expect 1000ms
      wsMock.websocket.onclose!();
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

      // Advance timer to trigger reconnect (new WebSocketProvider created)
      jest.advanceTimersByTime(1000);

      wsMock = getWsProviderMock();
      // Second disconnect — expect 2000ms
      wsMock.websocket.onclose!();
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 2000);

      // Advance timer to trigger reconnect (new WebSocketProvider created)
      jest.advanceTimersByTime(2000);

      wsMock = getWsProviderMock();
      // Third disconnect — expect 4000ms
      wsMock.websocket.onclose!();
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 4000);

      expect(WebSocketProvider).toHaveBeenCalledTimes(3);
    });

    it('caps backoff at 60000ms', () => {
      // Invoke onclose and advance timers repeatedly: 1s, 2s, 4s, 8s, 16s, 32s, 60s cap
      const delays = [1000, 2000, 4000, 8000, 16000, 32000, 60000];

      for (let i = 0; i < delays.length; i++) {
        const wsMock = getWsProviderMock();
        wsMock.websocket.onclose!();
        expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), delays[i]);
        jest.advanceTimersByTime(delays[i]!);
      }

      // After 7 reconnects, the 8th disconnect should still use 60000ms (cap)
      const wsMock = getWsProviderMock();
      wsMock.websocket.onclose!();
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 60000);
    });

    it('resets backoff after successful reconnect', async () => {
      // Resolve mockWsOn so .then() fires synchronously via Promise microtask
      mockWsOn.mockResolvedValue(undefined);

      const wsMock = getWsProviderMock();
      // First disconnect
      wsMock.websocket.onclose!();
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

      // Advance timer — triggers reconnect, new provider, startBlockSubscription called
      jest.advanceTimersByTime(1000);

      // Wait for the .then() from startBlockSubscription to flush (resets backoff)
      await Promise.resolve();
      await Promise.resolve();

      // Second disconnect after successful reconnect — should reset to 1000ms
      const newWsMock = getWsProviderMock();
      newWsMock.websocket.onclose!();
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    });

    it('does not reconnect after destroy()', () => {
      const callsBefore = setTimeoutSpy.mock.calls.length;

      adapter.destroy();
      const wsMock = getWsProviderMock();
      if (wsMock && wsMock.websocket.onclose) {
        wsMock.websocket.onclose();
      }

      // No new setTimeout should be scheduled after destroy()
      expect(setTimeoutSpy.mock.calls.length).toBe(callsBefore);
    });

    it('clears blockTimes on reconnect', async () => {
      // Inject some block times
      const now = Date.now();
      (adapter as unknown as { blockTimes: number[] }).blockTimes = [
        now - 24000,
        now - 12000,
        now,
      ];

      // Verify avg block time is non-zero before reconnect
      const beforeResult = await adapter.getAvgBlockTime();
      expect(beforeResult).toBeGreaterThan(0);

      // Trigger disconnect and reconnect
      const wsMock = getWsProviderMock();
      wsMock.websocket.onclose!();
      jest.advanceTimersByTime(1000);

      // After reconnect, blockTimes should be cleared
      const afterResult = await adapter.getAvgBlockTime();
      expect(afterResult).toBe(0);
    });

    it('re-registers block subscription after reconnect', () => {
      const blockCallback = jest.fn();
      adapter.onBlock(blockCallback);

      // Trigger disconnect and reconnect
      const wsMock = getWsProviderMock();
      wsMock.websocket.onclose!();
      jest.advanceTimersByTime(1000);

      // Get the new provider mock — it should have had .on('block', ...) registered
      const { WebSocketProvider } = jest.requireMock('ethers') as {
        WebSocketProvider: jest.Mock;
      };
      // The second WebSocketProvider instance was created on reconnect
      const newWsInstance = WebSocketProvider.mock.results[WebSocketProvider.mock.results.length - 1]
        ?.value as { on: jest.Mock };
      expect(newWsInstance.on).toHaveBeenCalledWith('block', expect.any(Function));
    });
  });

  describe('address validation', () => {
    it('rejects invalid address before RPC call', async () => {
      const { isAddress, Contract } = jest.requireMock('ethers') as {
        isAddress: jest.Mock;
        Contract: jest.Mock;
      };
      isAddress.mockReturnValue(false);

      await expect(adapter.getTokenInfo('0xinvalid')).rejects.toThrow(
        'Invalid EVM address: 0xinvalid',
      );
      expect(Contract).not.toHaveBeenCalled();
    });

    it('accepts lowercase address', async () => {
      const { isAddress } = jest.requireMock('ethers') as { isAddress: jest.Mock };
      isAddress.mockReturnValue(true);

      const result = await adapter.getTokenInfo(
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
      );
      expect(result).toEqual({
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        totalSupply: '36812421234000000',
      });
    });
  });

  describe('logger', () => {
    it('uses NestJS Logger instead of console.warn', () => {
      const { Logger } = jest.requireMock('@nestjs/common') as { Logger: jest.Mock };
      expect(Logger).toHaveBeenCalledWith('EvmAdapter');

      // Trigger a WS error scenario to verify Logger.warn is used
      jest.useFakeTimers();
      const { WebSocketProvider } = jest.requireMock('ethers') as {
        WebSocketProvider: jest.Mock;
      };
      const wsMock = WebSocketProvider.mock.results[WebSocketProvider.mock.results.length - 1]
        ?.value as { websocket: { onclose: (() => void) | null; onerror: (() => void) | null } };

      if (wsMock.websocket.onerror) {
        wsMock.websocket.onerror();
      } else if (wsMock.websocket.onclose) {
        wsMock.websocket.onclose();
      }

      // Logger.warn should have been called (not console.warn)
      expect(mockLoggerWarn).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
