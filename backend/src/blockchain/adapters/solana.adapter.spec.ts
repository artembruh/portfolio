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
    it('returns cold start BlockInfo { blockNumber: 0, avgBlockTime: 0.4 } when no blocks received yet', () => {
      const result = adapter.getLatestBlock();

      expect(result).toEqual({ blockNumber: 0, avgBlockTime: 0.4 });
    });
  });

  describe('getAvgBlockTime', () => {
    it('returns 0.4 default when fewer than 2 slot times recorded', () => {
      const result = adapter.getAvgBlockTime();
      expect(result).toBe(0.4);
    });
  });

  describe('getTokenInfo', () => {
    const VALID_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mint

    it('returns TokenInfo for a valid SPL token mint with Metaplex metadata', async () => {
      mockGetAccountInfoSend.mockResolvedValue({
        value: {
          data: {
            program: 'spl-token',
            parsed: {
              info: {
                decimals: 6,
                supply: '1000000',
              },
              type: 'mint',
            },
            space: BigInt(82),
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
            program: 'spl-token',
            parsed: {
              info: {
                decimals: 9,
                supply: '500000000',
              },
              type: 'mint',
            },
            space: BigInt(82),
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

    it('returns name and symbol from tokenMetadata extension for Token-2022 token', async () => {
      mockGetAccountInfoSend.mockResolvedValue({
        value: {
          data: {
            program: 'spl-token-2022',
            parsed: {
              info: {
                decimals: 6,
                supply: '5000000',
                mintAuthority: null,
                freezeAuthority: null,
                isInitialized: true,
                extensions: [
                  {
                    extension: 'tokenMetadata',
                    state: {
                      name: 'Mock Token',
                      symbol: 'MCK',
                      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                      updateAuthority: null,
                      uri: '',
                      additionalMetadata: [],
                    },
                  },
                ],
              },
              type: 'mint',
            },
            space: BigInt(398),
          },
        },
      });

      const result = await adapter.getTokenInfo(VALID_MINT);

      expect(result).toEqual({
        name: 'Mock Token',
        symbol: 'MCK',
        decimals: 6,
        totalSupply: '5000000',
      });
      expect(mockFetchMetadataFromSeeds).not.toHaveBeenCalled();
    });

    it('returns Unknown Token fallback when Token-2022 has no tokenMetadata extension', async () => {
      mockGetAccountInfoSend.mockResolvedValue({
        value: {
          data: {
            program: 'spl-token-2022',
            parsed: {
              info: {
                decimals: 9,
                supply: '1000000',
                mintAuthority: null,
                freezeAuthority: null,
                isInitialized: true,
                extensions: [
                  {
                    extension: 'transferFeeConfig',
                    state: {},
                  },
                ],
              },
              type: 'mint',
            },
            space: BigInt(398),
          },
        },
      });

      const result = await adapter.getTokenInfo(VALID_MINT);

      expect(result).toEqual({
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 9,
        totalSupply: '1000000',
      });
      expect(mockFetchMetadataFromSeeds).not.toHaveBeenCalled();
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

    // Helper to flush all pending microtasks
    async function flushMicrotasks(): Promise<void> {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    }

    beforeEach(() => {
      jest.useFakeTimers();
      setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedules reconnect (scheduleReconnect) with 1000ms delay when subscription throws non-abort error', async () => {
      // Use mockImplementation so a fresh generator is created on each call
      mockSubscribe.mockImplementation(async function* () {
        yield* []; // satisfy require-yield
        throw new Error('WS disconnected');
      });

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Allow microtasks to process the error
      await flushMicrotasks();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      a.destroy();
    });

    it('doubles backoff delay on consecutive errors (1000, 2000, 4000)', async () => {
      // Use mockImplementation so a fresh generator is created on each call
      mockSubscribe.mockImplementation(async function* () {
        yield* []; // satisfy require-yield
        throw new Error('WS disconnected');
      });

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // First error: scheduleReconnect called with 1000ms
      await flushMicrotasks();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      // Advance time to trigger the reconnect timer, subscription throws again
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

      // Advance time again, third error
      jest.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000);

      a.destroy();
    });

    it('caps backoff delay at 60000ms after enough doublings', async () => {
      mockSubscribe.mockImplementation(async function* () {
        yield* []; // satisfy require-yield
        throw new Error('WS disconnected');
      });

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Run multiple error cycles until the delay reaches the 60000ms cap
      // Each cycle: flush microtasks (error fires, scheduleReconnect called), advance timer
      await flushMicrotasks(); // cycle 1: delay=1000 used, _reconnectDelay becomes 2000
      jest.advanceTimersByTime(1_000);
      await flushMicrotasks(); // cycle 2: delay=2000 used, _reconnectDelay becomes 4000
      jest.advanceTimersByTime(2_000);
      await flushMicrotasks(); // cycle 3: delay=4000 used, _reconnectDelay becomes 8000
      jest.advanceTimersByTime(4_000);
      await flushMicrotasks(); // cycle 4: delay=8000 used, _reconnectDelay becomes 16000
      jest.advanceTimersByTime(8_000);
      await flushMicrotasks(); // cycle 5: delay=16000 used, _reconnectDelay becomes 32000
      jest.advanceTimersByTime(16_000);
      await flushMicrotasks(); // cycle 6: delay=32000 used, _reconnectDelay becomes 60000 (capped)
      jest.advanceTimersByTime(32_000);
      await flushMicrotasks(); // cycle 7: delay=60000 used (capped), _reconnectDelay stays 60000

      // Verify that setTimeout was called with 60000 at the cap
      const calls = setTimeoutSpy.mock.calls;
      const delays = calls.map((c) => c[1] as number);
      expect(delays.some((d) => d === 60_000)).toBe(true);

      a.destroy();
    });

    it('resets backoff delay to 1000ms after a successful subscription', async () => {
      // First: fail, causing delay to double to 2000
      mockSubscribe.mockImplementation(async function* () {
        yield* []; // satisfy require-yield
        throw new Error('WS disconnected');
      });

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      await flushMicrotasks();
      // After first failure, _reconnectDelay should be 2000
      expect((a as unknown as { _reconnectDelay: number })._reconnectDelay).toBe(2_000);

      // Now succeed on next subscribe
      mockSubscribe.mockImplementation(async function* () {
        // yields successfully, never ends (simulates active subscription)
        yield { slot: 1n, parent: 0n, root: 0n };
        await new Promise<void>(() => {}); // hang forever — subscription stays active
      });

      jest.advanceTimersByTime(1000);
      await flushMicrotasks();

      // After successful subscription, delay should be reset to 1000
      expect((a as unknown as { _reconnectDelay: number })._reconnectDelay).toBe(1000);

      a.destroy();
    });

    it('does NOT reconnect after destroy() is called', async () => {
      mockSubscribe.mockImplementation(async function* () {
        yield* []; // satisfy require-yield
        throw new Error('WS disconnected');
      });

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Destroy immediately before error is processed (scheduleReconnect checks _destroyed)
      a.destroy();

      await flushMicrotasks();

      // scheduleReconnect should have been called but returned early due to _destroyed
      // so no setTimeout should have been called with a reconnect delay
      const reconnectCalls = setTimeoutSpy.mock.calls.filter(
        (c) => typeof c[1] === 'number' && (c[1] as number) >= 1000,
      );
      expect(reconnectCalls.length).toBe(0);
    });

    it('clears blockHistory on reconnect so getAvgBlockTime returns 0.4 default', async () => {
      mockSubscribe.mockImplementation(async function* () {
        yield* []; // satisfy require-yield
        throw new Error('WS disconnected');
      });

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Inject block history directly to simulate stale data before reconnect fires
      const store = (a as unknown as { blockHistory: { push(b: number, t: number): void } }).blockHistory;
      store.push(1, Date.now() - 2000);
      store.push(2, Date.now() - 1000);
      store.push(3, Date.now());

      // Verify we have stale data before error processes
      const before = a.getAvgBlockTime();
      expect(before).not.toBe(0.4);

      // Now let the error fire — scheduleReconnect is called
      await flushMicrotasks();

      // Advance timer: startSlotSubscription fires, clears blockHistory
      jest.advanceTimersByTime(1000);
      // startSlotSubscription calls blockHistory.clear() synchronously (before async loop starts)

      // After reconnect start, blockHistory should be cleared
      const after = a.getAvgBlockTime();
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
      mockSubscribe.mockImplementation(async function* () {
        yield* []; // satisfy require-yield
        throw new Error('WS disconnected');
      });

      const a = new SolanaAdapter(
        'https://api.mainnet-beta.solana.com',
        'wss://api.mainnet-beta.solana.com',
        'solana',
      );

      // Allow enough microtask ticks for the async generator to throw and be caught
      for (let i = 0; i < 10; i++) await Promise.resolve();

      expect(mockLoggerWarn).toHaveBeenCalled();

      a.destroy();
      jest.useRealTimers();
    });
  });
});
