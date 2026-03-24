const mockGetAccountInfoSend = jest.fn();
const mockGetAccountInfo = jest.fn(() => ({ send: mockGetAccountInfoSend }));
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
  isAddress: jest.fn((addr: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)),
  address: jest.fn((addr: string) => addr),
}));

jest.mock('@metaplex-foundation/mpl-token-metadata-kit', () => ({
  fetchMetadataFromSeeds: mockFetchMetadataFromSeeds,
}));

import { SolanaTokenLookup } from './solana-token-lookup';

describe('SolanaTokenLookup', () => {
  let lookup: SolanaTokenLookup;

  beforeEach(() => {
    jest.clearAllMocks();
    lookup = new SolanaTokenLookup(
      'https://api.mainnet-beta.solana.com',
      'solana',
    );
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

      const result = await lookup.getTokenInfo(VALID_MINT);

      expect(result).toEqual({
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        totalSupply: '1000000',
      });
    });

    it('throws "Invalid Solana address" for an invalid address', async () => {
      await expect(lookup.getTokenInfo('not-a-valid-address')).rejects.toThrow(
        /Invalid Solana address/,
      );
    });

    it('throws "Not a valid SPL token" when account data is not jsonParsed', async () => {
      mockGetAccountInfoSend.mockResolvedValue({
        value: {
          data: 'base64encodedstuff',
        },
      });

      await expect(lookup.getTokenInfo(VALID_MINT)).rejects.toThrow(/Not a valid SPL token/);
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

      const result = await lookup.getTokenInfo(VALID_MINT);

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

      const result = await lookup.getTokenInfo(VALID_MINT);

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

      const result = await lookup.getTokenInfo(VALID_MINT);

      expect(result).toEqual({
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 9,
        totalSupply: '1000000',
      });
      expect(mockFetchMetadataFromSeeds).not.toHaveBeenCalled();
    });
  });
});
