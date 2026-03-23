import { BlockchainGateway } from './blockchain.gateway';
import { BlockchainService } from './services/blockchain.service';
import { BlockchainAdapter } from './interfaces/blockchain-adapter.interface';

describe('BlockchainGateway', () => {
  let gateway: BlockchainGateway;
  let mockBlockchainService: jest.Mocked<BlockchainService>;

  const mockEthAdapter: jest.Mocked<BlockchainAdapter> = {
    getLatestBlock: jest.fn().mockResolvedValue({ blockNumber: 12345, avgBlockTime: 12.1 }),
    getAvgBlockTime: jest.fn(),
    getTokenInfo: jest.fn(),
    onBlock: jest.fn(),
  };

  const mockBaseAdapter: jest.Mocked<BlockchainAdapter> = {
    getLatestBlock: jest.fn().mockResolvedValue({ blockNumber: 99999, avgBlockTime: 2.0 }),
    getAvgBlockTime: jest.fn(),
    getTokenInfo: jest.fn(),
    onBlock: jest.fn(),
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
      getAdapter: jest.fn().mockImplementation((chain: string) => {
        if (chain === 'ethereum') return mockEthAdapter;
        if (chain === 'base') return mockBaseAdapter;
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

    // Reset per-adapter mocks
    mockEthAdapter.getLatestBlock.mockResolvedValue({ blockNumber: 12345, avgBlockTime: 12.1 });
    mockEthAdapter.getTokenInfo.mockReset();
    mockEthAdapter.onBlock.mockReset();
    mockBaseAdapter.getLatestBlock.mockResolvedValue({ blockNumber: 99999, avgBlockTime: 2.0 });
    mockBaseAdapter.onBlock.mockReset();

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
      await gateway.handleDisconnect(mockClient as unknown as import('socket.io').Socket);

      expect(mockClient.leave).not.toHaveBeenCalled();
    });

    it('cleans up rateLimiter entry on disconnect', async () => {
      // Set up adapter so lookup works
      mockEthAdapter.getTokenInfo.mockResolvedValue({
        name: 'Tether',
        symbol: 'USDT',
        decimals: 6,
        totalSupply: '1000000',
      });

      // Perform a lookup to populate the rateLimiter
      await gateway.handleTokenLookup(
        { chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        mockClient as unknown as import('socket.io').Socket,
      );

      // Disconnect — rateLimiter entry should be removed
      await gateway.handleDisconnect(mockClient as unknown as import('socket.io').Socket);

      expect((gateway as unknown as { rateLimiter: Map<string, number> }).rateLimiter.has(mockClient.id)).toBe(false);
    });
  });

  describe('handleTokenLookup', () => {
    beforeEach(() => {
      mockEthAdapter.getTokenInfo.mockResolvedValue({
        name: 'Tether',
        symbol: 'USDT',
        decimals: 6,
        totalSupply: '1000000',
      });
    });

    it('emits 5 trace steps (in_progress + done) then token_result on valid lookup (BLKC-04)', async () => {
      await gateway.handleTokenLookup(
        { chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        mockClient as unknown as import('socket.io').Socket,
      );

      // Step 1
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 1,
        status: 'in_progress',
        message: expect.stringContaining('Looking up'),
      });
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 1,
        status: 'done',
        message: expect.any(String),
      });

      // Step 2
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 2,
        status: 'in_progress',
        message: expect.stringContaining('Gathering'),
      });
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 2,
        status: 'done',
        message: expect.any(String),
      });

      // Step 3
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 3,
        status: 'in_progress',
        message: expect.stringContaining('Decoding'),
      });
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 3,
        status: 'done',
        message: expect.any(String),
      });

      // Step 4
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 4,
        status: 'in_progress',
        message: expect.stringContaining('Fetching supply'),
      });
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 4,
        status: 'done',
        message: expect.any(String),
      });

      // Step 5
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 5,
        status: 'in_progress',
        message: expect.stringContaining('Fulfilling'),
      });
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 5,
        status: 'done',
        message: expect.any(String),
      });

      // Final result — 11 total emits: 10 trace (5x2) + 1 token_result
      expect(mockClient.emit).toHaveBeenCalledWith('token_result', {
        name: 'Tether',
        symbol: 'USDT',
        decimals: 6,
        totalSupply: '1000000',
      });
      expect(mockClient.emit).toHaveBeenCalledTimes(11);
    });

    it('emits error trace for missing chain (BLKC-05)', async () => {
      await gateway.handleTokenLookup(
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        mockClient as unknown as import('socket.io').Socket,
      );

      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 1,
        status: 'error',
        message: expect.stringContaining('Missing'),
      });
      expect(mockEthAdapter.getTokenInfo).not.toHaveBeenCalled();
    });

    it('emits error trace for missing address (BLKC-05)', async () => {
      await gateway.handleTokenLookup(
        { chain: 'ethereum' },
        mockClient as unknown as import('socket.io').Socket,
      );

      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 1,
        status: 'error',
        message: expect.stringContaining('Missing'),
      });
      expect(mockEthAdapter.getTokenInfo).not.toHaveBeenCalled();
    });

    it('emits error trace for unsupported chain (BLKC-05)', async () => {
      await gateway.handleTokenLookup(
        { chain: 'dogecoin', address: '0x1234567890123456789012345678901234567890' },
        mockClient as unknown as import('socket.io').Socket,
      );

      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 1,
        status: 'error',
        message: expect.stringContaining('Unsupported'),
      });
    });

    it('stops trace on adapter error and emits error at step 2 (BLKC-06)', async () => {
      mockEthAdapter.getTokenInfo.mockRejectedValueOnce(new Error('RPC timeout'));

      await gateway.handleTokenLookup(
        { chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        mockClient as unknown as import('socket.io').Socket,
      );

      // Step 2 error should be emitted
      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 2,
        status: 'error',
        message: 'RPC timeout',
      });

      // token_result should NOT be emitted
      expect(mockClient.emit).not.toHaveBeenCalledWith('token_result', expect.anything());

      // No step 3, 4, 5 events after the error
      const calls = mockClient.emit.mock.calls;
      const step3OrLaterAfterError = calls.filter(
        ([event, data]: [string, { step?: number }]) =>
          event === 'trace' && typeof data?.step === 'number' && data.step >= 3,
      );
      expect(step3OrLaterAfterError).toHaveLength(0);
    });

    it('rejects second lookup within 5 seconds with rate limit error (BLKC-07)', async () => {
      // First call — should succeed
      await gateway.handleTokenLookup(
        { chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        mockClient as unknown as import('socket.io').Socket,
      );

      mockClient.emit.mockClear();

      // Second call immediately — should be rate limited
      await gateway.handleTokenLookup(
        { chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        mockClient as unknown as import('socket.io').Socket,
      );

      expect(mockClient.emit).toHaveBeenCalledWith('trace', {
        step: 1,
        status: 'error',
        message: expect.stringContaining('Rate limited'),
      });

      // getTokenInfo only called once (for the first lookup)
      expect(mockEthAdapter.getTokenInfo).toHaveBeenCalledTimes(1);
    });

    it('allows lookup after 5 seconds have elapsed (BLKC-07)', async () => {
      // Directly manipulate the rateLimiter to simulate a lookup 6 seconds ago
      const rateLimiter = (gateway as unknown as { rateLimiter: Map<string, number> }).rateLimiter;
      rateLimiter.set(mockClient.id, Date.now() - 6000);

      await gateway.handleTokenLookup(
        { chain: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        mockClient as unknown as import('socket.io').Socket,
      );

      // Should succeed — no rate limit error
      expect(mockClient.emit).not.toHaveBeenCalledWith('trace', {
        step: 1,
        status: 'error',
        message: expect.stringContaining('Rate limited'),
      });
      expect(mockClient.emit).toHaveBeenCalledWith('token_result', expect.anything());
    });
  });

  describe('onModuleInit', () => {
    it('registers onBlock callback for each supported chain (BLKC-02)', () => {
      gateway.onModuleInit();

      expect(mockBlockchainService.getSupportedChains).toHaveBeenCalled();
      expect(mockEthAdapter.onBlock).toHaveBeenCalledTimes(1);
      expect(mockBaseAdapter.onBlock).toHaveBeenCalledTimes(1);
    });

    it('onBlock callback emits block_update to chain room via server.to(chain) (BLKC-02, BLKC-03)', async () => {
      gateway.onModuleInit();

      // Capture the callback registered for ethereum
      const ethOnBlockCall = mockEthAdapter.onBlock.mock.calls[0];
      expect(ethOnBlockCall).toBeDefined();
      const ethCallback = ethOnBlockCall![0];

      // Invoke the callback and wait for async operations
      ethCallback();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockServer.to).toHaveBeenCalledWith('ethereum');
      const roomEmitMock = mockServer.to.mock.results[0]?.value?.emit as jest.Mock;
      expect(roomEmitMock).toHaveBeenCalledWith('block_update', {
        chain: 'ethereum',
        blockNumber: 12345,
        avgBlockTime: 12.1,
      });
    });

    it('onBlock callback swallows getLatestBlock errors without throwing', async () => {
      gateway.onModuleInit();

      // Make getLatestBlock reject for this test
      mockEthAdapter.getLatestBlock.mockRejectedValueOnce(new Error('RPC timeout'));

      const ethOnBlockCall = mockEthAdapter.onBlock.mock.calls[0];
      expect(ethOnBlockCall).toBeDefined();
      const ethCallback = ethOnBlockCall![0];

      // Should not throw
      expect(() => ethCallback()).not.toThrow();

      // Wait for async internal error handling
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });
});
