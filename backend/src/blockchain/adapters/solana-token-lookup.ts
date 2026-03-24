import { createSolanaRpc, isAddress, address } from '@solana/kit';
import { Logger } from '@nestjs/common';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';
import { fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata-kit';
import type { Chain } from '../chain.enum';
import { TokenLookup } from '../interfaces/token-lookup.interface';
import { TokenInfo } from '../dto/token-info.dto';
import { withTimeout } from '../utils/with-timeout';

const RPC_TIMEOUT_MS = 15_000;

interface SplMintInfo {
  decimals: number;
  supply: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isInitialized: boolean;
  extensions?: Array<{ extension: string; state: Record<string, unknown> }>;
}

interface TokenMetadataExtension {
  extension: 'tokenMetadata';
  state: {
    name: string;
    symbol: string;
    mint: string;
    updateAuthority: string | null;
    uri: string;
    additionalMetadata: Array<unknown>;
  };
}

function isTokenMetadataExtension(
  ext: { extension: string; state: Record<string, unknown> },
): ext is TokenMetadataExtension {
  return (
    ext.extension === 'tokenMetadata' &&
    typeof ext.state['name'] === 'string' &&
    typeof ext.state['symbol'] === 'string'
  );
}

function formatSupply(supply: string, decimals: number): string {
  return (BigInt(supply) / 10n ** BigInt(decimals)).toString();
}

export class SolanaTokenLookup implements TokenLookup {
  private static readonly DEFAULT_NAME = 'SPL Token';
  private static readonly DEFAULT_SYMBOL = 'SPL';

  private readonly logger = new Logger(SolanaTokenLookup.name);
  private readonly rpc: ReturnType<typeof createSolanaRpc>;

  constructor(
    httpRpcUrl: string,
    private readonly chainName: Chain,
  ) {
    this.rpc = createSolanaRpc(httpRpcUrl);
  }

  async getTokenInfo(mintAddress: string): Promise<TokenInfo> {
    if (!isAddress(mintAddress)) {
      throw new Error(`Invalid Solana address: ${mintAddress}`);
    }

    const mint = address(mintAddress);

    const accountInfo = await withTimeout(
      this.rpc.getAccountInfo(mint, { encoding: 'jsonParsed' }).send(),
      RPC_TIMEOUT_MS,
      'getAccountInfo',
    );

    const account = accountInfo.value;
    if (!account) {
      throw new Error('Account not found');
    }

    const owner = account.owner;
    const data = account.data as {
      parsed?: { info?: SplMintInfo; type?: string };
    };
    const info = data.parsed?.info;
    if (!info) {
      throw new Error('Not a valid SPL token mint account');
    }

    if (owner === TOKEN_PROGRAM_ADDRESS) {
      return this.handleToken(mint, info.decimals, info.supply);
    }
    if (owner === TOKEN_2022_PROGRAM_ADDRESS) {
      return this.handleToken2022(info, info.decimals, info.supply);
    }

    throw new Error('Not an SPL token mint account');
  }

  private async handleToken(
    mint: ReturnType<typeof address>,
    decimals: number,
    supply: string,
  ): Promise<TokenInfo> {
    const totalSupply = formatSupply(supply, decimals);

    try {
      const metadata = await withTimeout(
        fetchMetadataFromSeeds(this.rpc, { mint }),
        RPC_TIMEOUT_MS,
        'fetchMetadataFromSeeds',
      );
      return {
        name: metadata.data.name.replace(/\0/g, '').trim(),
        symbol: metadata.data.symbol.replace(/\0/g, '').trim(),
        decimals,
        totalSupply,
      };
    } catch (err) {
      this.logger.warn(`[${this.chainName}] Metaplex metadata not found for ${mint}: ${err instanceof Error ? err.message : String(err)}`);
      return {
        name: SolanaTokenLookup.DEFAULT_NAME,
        symbol: SolanaTokenLookup.DEFAULT_SYMBOL,
        decimals,
        totalSupply,
      };
    }
  }

  private handleToken2022(
    info: SplMintInfo,
    decimals: number,
    supply: string,
  ): TokenInfo {
    const totalSupply = formatSupply(supply, decimals);

    const metaExt = info.extensions?.find(isTokenMetadataExtension);
    if (!metaExt) {
      return {
        name: SolanaTokenLookup.DEFAULT_NAME,
        symbol: SolanaTokenLookup.DEFAULT_SYMBOL,
        decimals,
        totalSupply,
      };
    }

    return {
      name: metaExt.state.name.replace(/\0/g, '').trim(),
      symbol: metaExt.state.symbol.replace(/\0/g, '').trim(),
      decimals,
      totalSupply,
    };
  }
}
