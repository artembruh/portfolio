import { Logger } from '@nestjs/common';
import { JsonRpcProvider, Contract, isAddress } from 'ethers';
import { Chain } from '../chain.enum';
import { TokenLookup } from '../interfaces/token-lookup.interface';
import { TokenInfo } from '../dto/token-info.dto';
import { withTimeout } from '../utils/with-timeout';
import { getErrorMessage } from '../utils/get-error-message';

const RPC_TIMEOUT_MS = 15_000;

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];

export class EvmTokenLookup implements TokenLookup {
  private readonly logger = new Logger(EvmTokenLookup.name);
  private readonly httpProvider: JsonRpcProvider;

  constructor(
    httpRpcUrl: string,
    private readonly chainName: Chain,
  ) {
    this.httpProvider = new JsonRpcProvider(httpRpcUrl);
  }

  async getTokenInfo(address: string): Promise<TokenInfo> {
    if (!isAddress(address)) {
      throw new Error(`Invalid EVM address: ${String(address)}`);
    }
    try {
      const contract = new Contract(address, ERC20_ABI, this.httpProvider) as Contract & {
        name(): Promise<string>;
        symbol(): Promise<string>;
        decimals(): Promise<bigint>;
        totalSupply(): Promise<bigint>;
      };
      const [name, symbol, decimals, totalSupply] = await withTimeout(
        Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.totalSupply(),
        ]),
        RPC_TIMEOUT_MS,
        'getTokenInfo',
      );
      return {
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
      };
    } catch (err) {
      throw new Error(`[${this.chainName}] ${getErrorMessage(err)}`, { cause: err });
    }
  }
}
