import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainAdapter } from './interfaces/blockchain-adapter.interface';
import { EvmAdapter } from './adapters/evm.adapter';
import { SolanaAdapter } from './adapters/solana.adapter';
import { BlockchainService } from './services/blockchain.service';
import { BlockchainGateway } from './blockchain.gateway';
import { BlockchainController } from './blockchain.controller';

@Module({
  controllers: [BlockchainController],
  providers: [
    {
      provide: 'BLOCKCHAIN_ADAPTERS',
      useFactory: (config: ConfigService): Map<string, BlockchainAdapter> => {
        const adapters = new Map<string, BlockchainAdapter>();

        adapters.set(
          'ethereum',
          new EvmAdapter(
            config.getOrThrow<string>('ETH_RPC_URL'),
            config.getOrThrow<string>('ETH_WS_URL'),
            'ethereum',
          ),
        );

        adapters.set(
          'base',
          new EvmAdapter(
            config.getOrThrow<string>('BASE_RPC_URL'),
            config.getOrThrow<string>('BASE_WS_URL'),
            'base',
          ),
        );

        adapters.set(
          'bsc',
          new EvmAdapter(
            config.getOrThrow<string>('BSC_RPC_URL'),
            config.getOrThrow<string>('BSC_WS_URL'),
            'bsc',
          ),
        );

        adapters.set(
          'solana',
          new SolanaAdapter(
            config.getOrThrow<string>('SOLANA_RPC_URL'),
            config.getOrThrow<string>('SOLANA_WS_URL'),
            'solana',
          ),
        );

        return adapters;
      },
      inject: [ConfigService],
    },
    BlockchainService,
    BlockchainGateway,
  ],
  exports: [BlockchainService],
})
export class BlockchainModule implements OnModuleDestroy {
  constructor(
    @Inject('BLOCKCHAIN_ADAPTERS')
    private readonly adapters: Map<string, BlockchainAdapter>,
  ) {}

  onModuleDestroy(): void {
    for (const adapter of this.adapters.values()) {
      if ('destroy' in adapter && typeof (adapter as { destroy: () => void }).destroy === 'function') {
        (adapter as { destroy: () => void }).destroy();
      }
    }
  }
}
