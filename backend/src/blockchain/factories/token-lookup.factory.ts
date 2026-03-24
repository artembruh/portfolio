import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chain, CHAIN_CONFIG } from '../chain.enum';
import { TokenLookup } from '../interfaces/token-lookup.interface';
import { EvmTokenLookup } from '../adapters/evm-token-lookup';
import { SolanaTokenLookup } from '../adapters/solana-token-lookup';

@Injectable()
export class TokenLookupFactory {
  private readonly instances = new Map<Chain, TokenLookup>();

  constructor(private readonly config: ConfigService) {}

  get(chain: Chain): TokenLookup {
    let instance = this.instances.get(chain);
    if (!instance) {
      instance = this.create(chain);
      this.instances.set(chain, instance);
    }
    return instance;
  }

  private create(chain: Chain): TokenLookup {
    const { httpEnvKey } = CHAIN_CONFIG[chain];
    const httpRpcUrl = this.config.getOrThrow<string>(httpEnvKey);

    if (chain === Chain.Solana) {
      return new SolanaTokenLookup(httpRpcUrl, chain);
    }
    return new EvmTokenLookup(httpRpcUrl, chain);
  }
}
