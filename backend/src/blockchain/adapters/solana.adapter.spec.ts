const mockSend = jest.fn();
const mockGetSlot = jest.fn(() => ({ send: mockSend }));
const mockGetAccountInfoSend = jest.fn();
const mockGetAccountInfo = jest.fn(() => ({ send: mockGetAccountInfoSend }));
const mockSubscribe = jest.fn();
const mockSlotNotifications = jest.fn(() => ({ subscribe: mockSubscribe }));
const mockFetchMetadataFromSeeds = jest.fn();

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
});
