import { Test } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './services/blockchain.service';

describe('BlockchainController', () => {
  let controller: BlockchainController;

  const mockAdapter = {
    getTokenInfo: jest.fn(),
    getLatestBlock: jest.fn(),
    getAvgBlockTime: jest.fn(),
    onBlock: jest.fn(),
    destroy: jest.fn(),
  };

  const mockService = {
    getSupportedChains: jest.fn().mockReturnValue(['ethereum', 'base', 'bsc', 'solana']),
    getAdapter: jest.fn(),
  };

  beforeEach(async () => {
    mockAdapter.getTokenInfo.mockReset();
    mockService.getAdapter.mockReset();
    mockService.getSupportedChains.mockReturnValue(['ethereum', 'base', 'bsc', 'solana']);

    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
      controllers: [BlockchainController],
      providers: [
        {
          provide: BlockchainService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<BlockchainController>(BlockchainController);
  });

  it('returns TokenInfo for a valid chain and address (BLKC-REST-01)', async () => {
    const tokenInfo = { name: 'Tether', symbol: 'USDT', decimals: 6, totalSupply: '1000000' };
    mockAdapter.getTokenInfo.mockResolvedValue(tokenInfo);
    mockService.getAdapter.mockReturnValue(mockAdapter);

    const result = await controller.getToken('ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7');

    expect(result).toEqual(tokenInfo);
    expect(mockService.getSupportedChains).toHaveBeenCalled();
    expect(mockService.getAdapter).toHaveBeenCalledWith('ethereum');
    expect(mockAdapter.getTokenInfo).toHaveBeenCalledWith('0xdAC17F958D2ee523a2206206994597C13D831ec7');
  });

  it('throws BadRequestException for unsupported chain (BLKC-REST-02)', async () => {
    await expect(
      controller.getToken('dogecoin', '0x1234567890123456789012345678901234567890'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws InternalServerErrorException when adapter.getTokenInfo rejects (BLKC-REST-03)', async () => {
    mockAdapter.getTokenInfo.mockRejectedValue(new Error('RPC timeout'));
    mockService.getAdapter.mockReturnValue(mockAdapter);

    await expect(
      controller.getToken('ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7'),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
