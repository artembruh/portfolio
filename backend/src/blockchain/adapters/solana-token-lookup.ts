import { createSolanaRpc, isAddress, address } from '@solana/kit';
import { Logger } from '@nestjs/common';
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

interface SplParsedMintData {
  parsed: {
    info: SplMintInfo;
    type: string;
  };
  program: string;
  space: bigint;
}

function isSplParsedData(d: unknown): d is SplParsedMintData {
  return (
    typeof d === 'object' &&
    d !== null &&
    'parsed' in d &&
    typeof (d as SplParsedMintData).parsed?.info?.decimals === 'number'
  );
}

export class SolanaTokenLookup implements TokenLookup {
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
    const data = accountInfo.value?.data;
    if (!isSplParsedData(data)) {
      throw new Error('Not a valid SPL token mint account');
    }
    const { decimals, supply } = data.parsed.info;

    let name = 'Unknown Token';
    let symbol = 'UNKNOWN';

    if (data.program === 'spl-token-2022') {
      const metaExt = data.parsed.info.extensions?.find(isTokenMetadataExtension);
      if (metaExt) {
        name = metaExt.state.name.trim();
        symbol = metaExt.state.symbol.trim();
      }
    } else {
      try {
        const metadata = await withTimeout(
          fetchMetadataFromSeeds(this.rpc, { mint }),
          RPC_TIMEOUT_MS,
          'fetchMetadataFromSeeds',
        );
        name = metadata.data.name.replace(/\0/g, '').trim();
        symbol = metadata.data.symbol.replace(/\0/g, '').trim();
      } catch {
        // Token may not have Metaplex metadata — use fallback
      }
    }

    return { name, symbol, decimals, totalSupply: supply };
  }
}
