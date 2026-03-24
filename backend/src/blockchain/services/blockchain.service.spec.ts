import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { TokenLookup } from '../interfaces/token-lookup.interface';
import { BlockSubscriber } from '../interfaces/block-subscriber.interface';

describe('BlockchainService', () => {
  let service: BlockchainService;

  const mockEthLookup: TokenLookup = {
    getTokenInfo: jest.fn(),
  };

  const mockBaseLookup: TokenLookup = {
    getTokenInfo: jest.fn(),
  };

  const mockEthSubscriber: BlockSubscriber = {
    getLatestBlock: jest.fn(),
    getAvgBlockTime: jest.fn(),
    onBlock: jest.fn(),
    destroy: jest.fn(),
  };

  const mockBaseSubscriber: BlockSubscriber = {
    getLatestBlock: jest.fn(),
    getAvgBlockTime: jest.fn(),
    onBlock: jest.fn(),
    destroy: jest.fn(),
  };

  const mockLookups = new Map<string, TokenLookup>([
    ['ethereum', mockEthLookup],
    ['base', mockBaseLookup],
  ]);

  const mockSubscribers = new Map<string, BlockSubscriber>([
    ['ethereum', mockEthSubscriber],
    ['base', mockBaseSubscriber],
  ]);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        {
          provide: 'TOKEN_LOOKUPS',
          useValue: mockLookups,
        },
        {
          provide: 'BLOCK_SUBSCRIBERS',
          useValue: mockSubscribers,
        },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
  });

  describe('getTokenLookup()', () => {
    it('returns the lookup registered for "ethereum"', () => {
      const lookup = service.getTokenLookup('ethereum');
      expect(lookup).toBe(mockEthLookup);
    });

    it('returns the lookup for "ETHEREUM" (case-insensitive)', () => {
      const lookup = service.getTokenLookup('ETHEREUM');
      expect(lookup).toBe(mockEthLookup);
    });

    it('throws Error with "Unsupported chain" for unknown chain', () => {
      expect(() => service.getTokenLookup('unknown')).toThrow(/Unsupported chain/);
    });
  });

  describe('getBlockSubscriber()', () => {
    it('returns the subscriber registered for "ethereum"', () => {
      const sub = service.getBlockSubscriber('ethereum');
      expect(sub).toBe(mockEthSubscriber);
    });

    it('returns the subscriber for "BASE" (case-insensitive)', () => {
      const sub = service.getBlockSubscriber('BASE');
      expect(sub).toBe(mockBaseSubscriber);
    });

    it('throws Error with "Unsupported chain" for unknown chain', () => {
      expect(() => service.getBlockSubscriber('unknown')).toThrow(/Unsupported chain/);
    });
  });

  describe('getSupportedChains()', () => {
    it('returns array of registered chain names', () => {
      const chains = service.getSupportedChains();
      expect(chains).toEqual(['ethereum', 'base']);
    });
  });
});
