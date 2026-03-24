import { EvmTokenLookup } from './evm-token-lookup';

// Mock functions — must be defined before jest.mock (hoisting)
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

jest.mock('ethers', () => {
  return {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    Contract: jest.fn().mockImplementation(() => ({
      name: mockContractName,
      symbol: mockContractSymbol,
      decimals: mockContractDecimals,
      totalSupply: mockContractTotalSupply,
    })),
    isAddress: jest.fn((addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr)),
  };
});

describe('EvmTokenLookup', () => {
  let lookup: EvmTokenLookup;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContractName.mockResolvedValue('Tether USD');
    mockContractSymbol.mockResolvedValue('USDT');
    mockContractDecimals.mockResolvedValue(6);
    mockContractTotalSupply.mockResolvedValue(BigInt('36812421234000000'));
    lookup = new EvmTokenLookup('https://eth-rpc.example.com', 'ethereum');
  });

  describe('getTokenInfo()', () => {
    it('returns TokenInfo with correct shape for valid ERC20 token', async () => {
      const result = await lookup.getTokenInfo(
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
      const promise = lookup.getTokenInfo(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      );
      jest.advanceTimersByTime(15001);
      await expect(promise).rejects.toThrow(/Timeout/);
      jest.useRealTimers();
    });

    it('rejects invalid EVM address before making RPC call', async () => {
      await expect(lookup.getTokenInfo('not-an-address')).rejects.toThrow(
        'Invalid EVM address',
      );
    });
  });
});
