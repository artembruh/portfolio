import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenLookup } from './interfaces/token-lookup.interface';
import { BlockSubscriber } from './interfaces/block-subscriber.interface';
import { EvmTokenLookup } from './adapters/evm-token-lookup';
import { EvmBlockSubscriber } from './adapters/evm-block-subscriber';
import { SolanaTokenLookup } from './adapters/solana-token-lookup';
import { SolanaBlockSubscriber } from './adapters/solana-block-subscriber';
import { BlockchainService } from './services/blockchain.service';
import { BlockchainGateway } from './blockchain.gateway';
import { BlockchainController } from './blockchain.controller';

@Module({
  controllers: [BlockchainController],
  providers: [
    {
      provide: 'TOKEN_LOOKUPS',
      useFactory: (config: ConfigService): Map<string, TokenLookup> => {
        const lookups = new Map<string, TokenLookup>();
        lookups.set('ethereum', new EvmTokenLookup(config.getOrThrow('ETH_RPC_URL'), 'ethereum'));
        lookups.set('base', new EvmTokenLookup(config.getOrThrow('BASE_RPC_URL'), 'base'));
        lookups.set('bsc', new EvmTokenLookup(config.getOrThrow('BSC_RPC_URL'), 'bsc'));
        lookups.set('solana', new SolanaTokenLookup(config.getOrThrow('SOLANA_RPC_URL'), 'solana'));
        return lookups;
      },
      inject: [ConfigService],
    },
    {
      provide: 'BLOCK_SUBSCRIBERS',
      useFactory: (config: ConfigService): Map<string, BlockSubscriber> => {
        const subs = new Map<string, BlockSubscriber>();
        subs.set('ethereum', new EvmBlockSubscriber(config.getOrThrow('ETH_WS_URL'), 'ethereum'));
        subs.set('base', new EvmBlockSubscriber(config.getOrThrow('BASE_WS_URL'), 'base'));
        subs.set('bsc', new EvmBlockSubscriber(config.getOrThrow('BSC_WS_URL'), 'bsc'));
        subs.set('solana', new SolanaBlockSubscriber(config.getOrThrow('SOLANA_WS_URL'), 'solana'));
        return subs;
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
    @Inject('BLOCK_SUBSCRIBERS')
    private readonly subscribers: Map<string, BlockSubscriber>,
  ) {}

  onModuleDestroy(): void {
    for (const sub of this.subscribers.values()) {
      sub.destroy();
    }
  }
}
