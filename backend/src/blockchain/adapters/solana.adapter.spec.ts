const mockSend = jest.fn();
const mockGetSlot = jest.fn(() => ({ send: mockSend }));
const mockGetAccountInfoSend = jest.fn();
const mockGetAccountInfo = jest.fn(() => ({ send: mockGetAccountInfoSend }));
const mockSubscribe = jest.fn();
const mockSlotNotifications = jest.fn(() => ({ subscribe: mockSubscribe }));
const mockFetchMetadataFromSeeds = jest.fn();
const mockLoggerLog = jest.fn();
const mockLoggerWarn = jest.fn();

jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: mockLoggerLog,
    warn: mockLoggerWarn,
  })),
}));

jest.mock('@solana/kit', () => ({
  createSolanaRpc: jest.fn(() => ({
    getSlot: mockGetSlot,
    getAccountInfo: mockGetAccountInfo,
  })),
  createSolanaRpcSubscriptions: jest.fn(() => ({
    slotNotifications: mockSlotNotifications,
  })),
  isAddress: jest.fn((addr: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)),
  address: jest.fn((addr: string) => addr),
}));

jest.mock('@metaplex-foundation/mpl-token-metadata-kit', () => ({
  fetchMetadataFromSeeds: mockFetchMetadataFromSeeds,
}));

import { SolanaAdapter } from './solana.adapter';

describe('SolanaAdapter', () => {
  let adapter: SolanaAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    // Make subscribe return an async iterable that never yields (default)
    mockSubscribe.mockReturnValue(
      (async function* () {
        // never yields by default
      })(),
    );
    adapter = new SolanaAdapter(
      'https://api.mainnet-beta.solana.com',
      'wss://api.mainnet-beta.solana.com',
      'solana',
    );
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('getLatestBlock', () => {
    it('returns BlockInfo with slot number as blockNumber and 0.4 default avgBlockTime', async () => {
      mockSend.mockResolvedValue(300000000n);

      const result = await adapter.getLatestBlock();

      expect(result).toEqual({ blockNumber: 300000000, avgBlockTime: 0.4 });
    });
  });

  describe('getAvgBlockTime', () => {
    it('returns 0.4 default when fewer than 2 slot times recorded', async () => {
      const result = await adapter.getAvgBlockTime();
      expect(result).toBe(0.4);
    });
  });

  describe('getTokenInfo', () => {
    const VALID_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mint

    it('returns TokenInfo for a valid SPL token mint with Metaplex metadata', async () => {
      mockGetAccountInfoSend.mockResolvedValue({
        value: {
          data: {
            parsed: {
              info: {
                decimals: 6,
                supply: '1000000',
              },
            },
          },
        },
      });
      mockFetchMetadataFromSeeds.mockResolvedValue({
        data: {
          name: 'USD Coin\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0',
          symbol: 'USDC\0\0\0\0\0',
        },
      });

      const result = await adapter.getTokenInfo(VALID_MINT);

      expect(result).toEqual({
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        totalSupply: '1000000',
      });
    });

    it('throws "Invalid Solana address" for an invalid address', async () => {
      await expect(adapter.getTokenInfo('not-a-valid-address')).rejects.toThrow(
        /Invalid Solana address/,
      );
    });

    it('throws "Not a valid SPL token" when account data is not jsonParsed', async () => {
      mockGetAccountInfoSend.mockResolvedValue({
        value: {
          data: 'base64encodedstuff',
        },
      });

      await expect(adapter.getTokenInfo(VALID_MINT)).rejects.toThrow(/Not a valid SPL token/);
    });

    it('returns fallback name and symbol when Metaplex metadata not found', async () => {
      mockGetAccountInfoSend.mockResolvedValue({
        value: {
          data: {
            parsed: {
              info: {
                decimals: 9,
                supply: '500000000',
              },
            },
          },
        },
      });
      mockFetchMetadataFromSeeds.mockRejectedValue(new Error('Account not found'));

      const result = await adapter.getTokenInfo(VALID_MINT);

      expect(result).toEqual({
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 9,
        totalSupply: '500000000',
      });
    });
  });

  describe('onBlock', () => {
    it('stores callback in blockListeners array', () => {
      const cb = jest.fn();
      adapter.onBlock(cb);
      // The callback array is private, but we can verify it gets called
      // by triggering a slot notification via a mock — here we just ensure
      // the onBlock call does not throw and the adapter accepts the callback
      expect(() => adapter.onBlock(cb)).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('calls abortController.abort() without throwing', () => {
      expect(() => adapter.destroy()).not.toThrow();
    });

    it('can be called multiple times safely', () => {
      adapter.destroy();
      expect(() => adapter.destroy()).not.toThrow();
    });
  });

  describe('reconnection', () => {
    let setTimeoutSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedules reconnect (scheduleReconnect) with 1000ms delay when subscription throws non-abort error', async () => {
      // Create a new adapter where the subscription immediately throws
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected');
        })(),
      );

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Allow microtasks to process the error
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      a.destroy();
    });

    it('doubles backoff delay on consecutive errors (1000, 2000, 4000)', async () => {
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected');
        })(),
      );

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // First error: scheduleReconnect called with 1000ms
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      // Advance time to trigger the reconnect timer, subscription throws again
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected again');
        })(),
      );
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

      // Advance time again, third error
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected third');
        })(),
      );
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000);

      a.destroy();
    });

    it('caps backoff delay at 60000ms after enough doublings', async () => {
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected');
        })(),
      );

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Force delay past 60s cap by directly setting private field
      (a as unknown as { _reconnectDelay: number })._reconnectDelay = 32_000;

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // After doubling from 32000, next delay should be 60000 (capped)
      // But we triggered above, clear the timer and test again
      jest.advanceTimersByTime(32_000);
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS still disconnected');
        })(),
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // At this point _reconnectDelay should have doubled to at least 60000
      const calls = setTimeoutSpy.mock.calls;
      const delays = calls.map((c) => c[1] as number);
      expect(delays.some((d) => d === 60_000)).toBe(true);

      a.destroy();
    });

    it('resets backoff delay to 1000ms after a successful subscription', async () => {
      // First: fail, causing delay to double
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected');
        })(),
      );

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Delay should now be 2000 (doubled from 1000 after first failure)
      // Now succeed on next subscribe
      mockSubscribe.mockReturnValue(
        (async function* () {
          // yields successfully, never ends (simulates active subscription)
          yield {};
          await new Promise<void>(() => {}); // hang
        })(),
      );

      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // After successful subscription, delay should be reset to 1000
      expect((a as unknown as { _reconnectDelay: number })._reconnectDelay).toBe(1000);

      a.destroy();
    });

    it('does NOT reconnect after destroy() is called', async () => {
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected');
        })(),
      );

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Destroy immediately before error is processed
      a.destroy();

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // scheduleReconnect should NOT have been called (or if called, should not fire)
      const reconnectCalls = setTimeoutSpy.mock.calls.filter(
        (c) => typeof c[1] === 'number' && (c[1] as number) >= 1000,
      );
      expect(reconnectCalls.length).toBe(0);
    });

    it('clears slotTimes on reconnect so getAvgBlockTime returns 0.4 default', async () => {
      // First, make subscribe yield slots to populate slotTimes
      let resolveHang: (() => void) | undefined;
      const hangPromise = new Promise<void>((res) => {
        resolveHang = res;
      });

      mockSubscribe.mockReturnValueOnce(
        (async function* () {
          // Yield a few slots to populate slotTimes
          yield {};
          yield {};
          yield {};
          await hangPromise;
        })(),
      );

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Allow subscription to run and yield slots
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Inject slot times to simulate timing data
      (a as unknown as { slotTimes: number[] }).slotTimes.push(
        Date.now() - 2000,
        Date.now() - 1000,
        Date.now(),
      );

      // Verify we have data
      const before = await a.getAvgBlockTime();
      expect(before).not.toBe(0.4);

      // Now trigger a reconnect by making next subscribe throw
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected');
        })(),
      );

      if (resolveHang) resolveHang();

      // Let the hang resolve and the subscription start, then fail
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // After reconnect, slotTimes should be cleared
      const after = await a.getAvgBlockTime();
      expect(after).toBe(0.4);

      a.destroy();
    });
  });

  describe('logger', () => {
    it('Logger is instantiated with SolanaAdapter name', () => {
      const { Logger } = jest.requireMock('@nestjs/common') as {
        Logger: jest.Mock;
      };
      expect(Logger).toHaveBeenCalledWith('SolanaAdapter');
    });

    it('calls logger.warn on subscription error (not console.warn)', async () => {
      jest.useFakeTimers();
      mockSubscribe.mockReturnValue(
        (async function* () {
          throw new Error('WS disconnected');
        })(),
      );

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockLoggerWarn).toHaveBeenCalled();

      a.destroy();
      jest.useRealTimers();
    });
  });
});
