import { Inject, Injectable } from '@nestjs/common';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';

@Injectable()
export class BlockchainService {
  constructor(
    @Inject('BLOCKCHAIN_ADAPTERS')
    private readonly adapters: Map<string, BlockchainAdapter>,
  ) {}

  getAdapter(chain: string): BlockchainAdapter {
    const adapter = this.adapters.get(chain.toLowerCase());
    if (!adapter) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    return adapter;
  }

  getSupportedChains(): string[] {
    return Array.from(this.adapters.keys());
  }
}
