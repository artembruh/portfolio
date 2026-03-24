import { BlockchainGateway } from './blockchain.gateway';
import { BlockchainService } from './services/blockchain.service';
import { BlockSubscriber } from './interfaces/block-subscriber.interface';

describe('BlockchainGateway', () => {
  let gateway: BlockchainGateway;
  let mockBlockchainService: jest.Mocked<BlockchainService>;

  const mockEthSubscriber: jest.Mocked<BlockSubscriber> = {
    getLatestBlock: jest.fn().mockReturnValue({ blockNumber: 12345, avgBlockTime: 12.1 }),
    getAvgBlockTime: jest.fn(),
    onBlock: jest.fn(),
    destroy: jest.fn(),
  };

  const mockBaseSubscriber: jest.Mocked<BlockSubscriber> = {
    getLatestBlock: jest.fn().mockReturnValue({ blockNumber: 99999, avgBlockTime: 2.0 }),
    getAvgBlockTime: jest.fn(),
    onBlock: jest.fn(),
    destroy: jest.fn(),
  };

  let mockServer: { to: jest.Mock };
  let mockClient: {
    id: string;
    join: jest.Mock;
    leave: jest.Mock;
    emit: jest.Mock;
  };

  beforeEach(() => {
    mockBlockchainService = {
      getSupportedChains: jest.fn().mockReturnValue(['ethereum', 'base']),
      getBlockSubscriber: jest.fn().mockImplementation((chain: string) => {
        if (chain === 'ethereum') return mockEthSubscriber;
        if (chain === 'base') return mockBaseSubscriber;
        throw new Error(`Unsupported chain: ${chain}`);
      }),
    } as unknown as jest.Mocked<BlockchainService>;

    const mockRoomEmit = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: mockRoomEmit }),
    };

    mockClient = {
      id: 'test-socket-id',
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    };

    // Reset per-subscriber mocks
    mockEthSubscriber.getLatestBlock.mockReturnValue({ blockNumber: 12345, avgBlockTime: 12.1 });
    mockEthSubscriber.onBlock.mockReset();
    mockBaseSubscriber.getLatestBlock.mockReturnValue({ blockNumber: 99999, avgBlockTime: 2.0 });
    mockBaseSubscriber.onBlock.mockReset();

    gateway = new BlockchainGateway(mockBlockchainService);
    gateway.server = mockServer as unknown as import('socket.io').Server;
  });

  // subscribe_chain is the WebSocket message name handled by handleSubscribeChain
  describe('handleSubscribeChain', () => {
    it('joins the client to the chain room', async () => {
      await gateway.handleSubscribeChain({ chain: 'ethereum' }, mockClient as unknown as import('socket.io').Socket);

      expect(mockClient.join).toHaveBeenCalledWith('ethereum');
    });

    it('emits immediate block_update snapshot with chain, blockNumber, avgBlockTime', async () => {
      await gateway.handleSubscribeChain({ chain: 'ethereum' }, mockClient as unknown as import('socket.io').Socket);

      expect(mockClient.emit).toHaveBeenCalledWith('block_update', {
        chain: 'ethereum',
        blockNumber: 12345,
        avgBlockTime: 12.1,
      });
    });

    it('emits error for unsupported chain name', async () => {
      await gateway.handleSubscribeChain({ chain: 'solana' }, mockClient as unknown as import('socket.io').Socket);

      expect(mockClient.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.stringContaining('Unsupported') }),
      );
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('leaves previous chain room when subscribing to a new chain (BLKC-09)', async () => {
      // Subscribe to ethereum first
      await gateway.handleSubscribeChain({ chain: 'ethereum' }, mockClient as unknown as import('socket.io').Socket);
      mockClient.leave.mockClear();

      // Now subscribe to base — should leave ethereum
      await gateway.handleSubscribeChain({ chain: 'base' }, mockClient as unknown as import('socket.io').Socket);

      expect(mockClient.leave).toHaveBeenCalledWith('ethereum');
      expect(mockClient.join).toHaveBeenCalledWith('base');
    });

    it('does not call leave if subscribing to the same chain again', async () => {
      await gateway.handleSubscribeChain({ chain: 'ethereum' }, mockClient as unknown as import('socket.io').Socket);
      mockClient.leave.mockClear();

      await gateway.handleSubscribeChain({ chain: 'ethereum' }, mockClient as unknown as import('socket.io').Socket);

      expect(mockClient.leave).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('removes socket from subscriptions map', async () => {
      // Subscribe first to populate the map
      await gateway.handleSubscribeChain({ chain: 'ethereum' }, mockClient as unknown as import('socket.io').Socket);

      await gateway.handleDisconnect(mockClient as unknown as import('socket.io').Socket);

      // Disconnecting again should not call leave (map is empty)
      mockClient.leave.mockClear();
      await gateway.handleDisconnect(mockClient as unknown as import('socket.io').Socket);
      expect(mockClient.leave).not.toHaveBeenCalled();
    });

    it('calls client.leave for the subscribed chain', async () => {
      await gateway.handleSubscribeChain({ chain: 'ethereum' }, mockClient as unknown as import('socket.io').Socket);
      mockClient.leave.mockClear();

      await gateway.handleDisconnect(mockClient as unknown as import('socket.io').Socket);

      expect(mockClient.leave).toHaveBeenCalledWith('ethereum');
    });

    it('handles disconnect for a client with no subscription (BACK-09)', async () => {
      // Client never subscribed
      await expect(
        gateway.handleDisconnect(mockClient as unknown as import('socket.io').Socket),
      ).resolves.not.toThrow();

      expect(mockClient.leave).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('registers onBlock callback for each supported chain (BLKC-02)', () => {
      gateway.onModuleInit();

      expect(mockBlockchainService.getSupportedChains).toHaveBeenCalled();
      expect(mockEthSubscriber.onBlock).toHaveBeenCalledTimes(1);
      expect(mockBaseSubscriber.onBlock).toHaveBeenCalledTimes(1);
    });

    it('onBlock callback emits block_update to chain room via server.to(chain) (BLKC-02, BLKC-03)', () => {
      gateway.onModuleInit();

      // Capture the callback registered for ethereum
      const ethOnBlockCall = mockEthSubscriber.onBlock.mock.calls[0];
      expect(ethOnBlockCall).toBeDefined();
      const ethCallback = ethOnBlockCall![0];

      // Invoke the callback — emitBlockUpdate is sync, assertions can follow immediately
      ethCallback();

      expect(mockServer.to).toHaveBeenCalledWith('ethereum');
      const roomEmitMock = mockServer.to.mock.results[0]?.value?.emit as jest.Mock;
      expect(roomEmitMock).toHaveBeenCalledWith('block_update', {
        chain: 'ethereum',
        blockNumber: 12345,
        avgBlockTime: 12.1,
      });
    });
  });
});
