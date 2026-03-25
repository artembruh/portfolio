import { Injectable, Logger } from '@nestjs/common';
import { Chain } from '../chain.enum';
import { DexPairInfo } from '../dto/dex-pair-info.dto';
import { withTimeout } from '../utils/with-timeout';

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/token-pairs/v1';
const DEXSCREENER_TIMEOUT_MS = 10_000;
const MIN_LIQUIDITY_USD = 3_000;

interface DexScreenerPair {
  pairAddress: string;
  dexId: string;
  url: string;
  labels?: string[];
  priceUsd?: string;
  priceNative?: string;
  marketCap?: number;
  liquidity?: { usd?: number; base?: number; quote?: number };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
}

@Injectable()
export class DexScreenerService {
  private readonly logger = new Logger(DexScreenerService.name);

  async getPairs(chain: Chain, tokenAddress: string): Promise<DexPairInfo[]> {
    let raw: DexScreenerPair[];
    try {
      const response = await withTimeout(
        fetch(`${DEXSCREENER_BASE_URL}/${chain}/${tokenAddress}`),
        DEXSCREENER_TIMEOUT_MS,
        'DexScreener',
      );
      if (!response.ok) {
        this.logger.warn(`DexScreener returned ${response.status} for ${chain}/${tokenAddress}`);
        return [];
      }
      raw = (await response.json()) as DexScreenerPair[];
    } catch (err) {
      this.logger.warn(
        `DexScreener fetch failed for ${chain}/${tokenAddress}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }

    if (!Array.isArray(raw)) return [];

    return raw
      .filter((p) => {
        const liq = p.liquidity?.usd;
        return liq === undefined || liq === null || liq >= MIN_LIQUIDITY_USD;
      })
      .sort((a, b) => {
        const aVolume = a.volume?.h24 ?? 0;
        const bVolume = b.volume?.h24 ?? 0;
        if (aVolume !== bVolume) return bVolume - aVolume;
        return (b.liquidity?.usd ?? -Infinity) - (a.liquidity?.usd ?? -Infinity);
      })
      .map((p) => ({
        pairAddress: p.pairAddress,
        dexName: p.dexId,
        url: p.url,
        pairType: p.labels?.[0] ?? null,
        priceUsd: p.priceUsd ?? '0',
        priceNative: p.priceNative ?? '0',
        marketCap: p.marketCap ?? 0,
        liquidityUsd: p.liquidity?.usd ?? 0,
        volume24h: p.volume?.h24 ?? 0,
      }));
  }
}
