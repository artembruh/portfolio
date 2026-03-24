import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chain, CHAIN_CONFIG } from '../chain.enum';
import { BlockSubscriber } from '../interfaces/block-subscriber.interface';
import { EvmBlockSubscriber } from '../adapters/evm-block-subscriber';
import { SolanaBlockSubscriber } from '../adapters/solana-block-subscriber';

@Injectable()
export class BlockSubscriberFactory implements OnModuleDestroy {
  private readonly instances = new Map<Chain, BlockSubscriber>();

  constructor(config: ConfigService) {
    for (const chain of Object.values(Chain)) {
      const { wsEnvKey } = CHAIN_CONFIG[chain];
      const wsRpcUrl = config.getOrThrow<string>(wsEnvKey);
      const subscriber =
        chain === Chain.Solana
          ? new SolanaBlockSubscriber(wsRpcUrl, chain)
          : new EvmBlockSubscriber(wsRpcUrl, chain);
      this.instances.set(chain, subscriber);
    }
  }

  get(chain: Chain): BlockSubscriber {
    const sub = this.instances.get(chain);
    if (!sub) throw new Error(`No subscriber for chain: ${chain}`);
    return sub;
  }

  onModuleDestroy(): void {
    for (const sub of this.instances.values()) {
      sub.destroy();
    }
  }
}
