import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainAdapter } from './interfaces/blockchain-adapter.interface';
import { EvmAdapter } from './adapters/evm.adapter';
import { BlockchainService } from './services/blockchain.service';

@Module({
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

        return adapters;
      },
      inject: [ConfigService],
    },
    BlockchainService,
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
      if ('destroy' in adapter && typeof adapter.destroy === 'function') {
        adapter.destroy();
      }
    }
  }
}
