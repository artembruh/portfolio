import { EvmAdapter } from './evm.adapter';
import { BlockHistoryStore } from '../utils/block-history-store';

// Mock functions — must be defined before jest.mock (hoisting)
const mockWsOn = jest.fn();
const mockWsDestroy = jest.fn();
const mockContractName = jest.fn();
const mockContractSymbol = jest.fn();
const mockContractDecimals = jest.fn();
const mockContractTotalSupply = jest.fn();

jest.mock('ethers', () => {
  return {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
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
    mockWsOn.mockResolvedValue(undefined);
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
    it('returns 0 when no blocks have been received yet (cold start)', () => {
      const result = adapter.getAvgBlockTime();
      expect(result).toBe(0);
    });

    it('returns average delta in seconds when blockHistory has entries', () => {
      const now = Date.now();
      const store = (adapter as unknown as { blockHistory: BlockHistoryStore }).blockHistory;
      // 3 block timestamps: 12s apart each
      store.push(100, now - 24000);
      store.push(101, now - 12000);
      store.push(102, now);
      const result = adapter.getAvgBlockTime();
      // Expected average: (12 + 12) / 2 = 12 seconds
      expect(result).toBeCloseTo(12, 0);
    });
  });

  describe('reconnection', () => {
    it('clears blockHistory on reconnect', () => {
      const store = (adapter as unknown as { blockHistory: BlockHistoryStore }).blockHistory;
      store.push(100, Date.now() - 12000);
      store.push(101, Date.now());
      expect(store.length).toBe(2);

      store.clear();
      expect(store.getLatest()).toBeNull();
      expect(store.length).toBe(0);
      expect(adapter.getAvgBlockTime()).toBe(0);
    });
  });
});
