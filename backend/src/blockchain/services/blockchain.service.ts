import { Inject, Injectable } from '@nestjs/common';
import { TokenLookup } from '../interfaces/token-lookup.interface';
import { BlockSubscriber } from '../interfaces/block-subscriber.interface';

@Injectable()
export class BlockchainService {
  constructor(
    @Inject('TOKEN_LOOKUPS') private readonly lookups: Map<string, TokenLookup>,
    @Inject('BLOCK_SUBSCRIBERS') private readonly subscribers: Map<string, BlockSubscriber>,
  ) {}

  getTokenLookup(chain: string): TokenLookup {
    const lookup = this.lookups.get(chain.toLowerCase());
    if (!lookup) throw new Error(`Unsupported chain: ${chain}`);
    return lookup;
  }

  getBlockSubscriber(chain: string): BlockSubscriber {
    const sub = this.subscribers.get(chain.toLowerCase());
    if (!sub) throw new Error(`Unsupported chain: ${chain}`);
    return sub;
  }

  getSupportedChains(): string[] {
    return Array.from(this.lookups.keys());
  }
}
