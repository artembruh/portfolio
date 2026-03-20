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
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBlockNumber: mockGetBlockNumber,
    })),
    WebSocketProvider: jest.fn().mockImplementation(() => ({
      on: mockWsOn,
      destroy: mockWsDestroy,
    })),
    Contract: jest.fn().mockImplementation(() => ({
      name: mockContractName,
      symbol: mockContractSymbol,
      decimals: mockContractDecimals,
      totalSupply: mockContractTotalSupply,
    })),
  };
});

describe('EvmAdapter', () => {
  let adapter: EvmAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBlockNumber.mockResolvedValue(21432891);
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
      (adapter as any).blockTimes = [now - 24000, now - 12000, now];
      const result = await adapter.getAvgBlockTime();
      // Expected average: (12 + 12) / 2 = 12 seconds
      expect(result).toBeCloseTo(12, 0);
    });
  });
});
