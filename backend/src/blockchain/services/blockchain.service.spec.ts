import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';

describe('BlockchainService', () => {
  let service: BlockchainService;

  const mockEthAdapter: BlockchainAdapter = {
    getLatestBlock: jest.fn(),
    getAvgBlockTime: jest.fn(),
    getTokenInfo: jest.fn(),
    onBlock: jest.fn(),
    destroy: jest.fn(),
  };

  const mockBaseAdapter: BlockchainAdapter = {
    getLatestBlock: jest.fn(),
    getAvgBlockTime: jest.fn(),
    getTokenInfo: jest.fn(),
    onBlock: jest.fn(),
    destroy: jest.fn(),
  };

  const mockAdapters = new Map<string, BlockchainAdapter>([
    ['ethereum', mockEthAdapter],
    ['base', mockBaseAdapter],
  ]);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        {
          provide: 'BLOCKCHAIN_ADAPTERS',
          useValue: mockAdapters,
        },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
  });

  describe('getAdapter()', () => {
    it('returns the adapter registered for "ethereum"', () => {
      const adapter = service.getAdapter('ethereum');
      expect(adapter).toBe(mockEthAdapter);
    });

    it('returns the adapter for "ETHEREUM" (case-insensitive)', () => {
      const adapter = service.getAdapter('ETHEREUM');
      expect(adapter).toBe(mockEthAdapter);
    });

    it('throws Error with "Unsupported chain" for unknown chain', () => {
      expect(() => service.getAdapter('unknown')).toThrow(/Unsupported chain/);
    });
  });

  describe('getSupportedChains()', () => {
    it('returns array of registered chain names', () => {
      const chains = service.getSupportedChains();
      expect(chains).toEqual(['ethereum', 'base']);
    });
  });
});
