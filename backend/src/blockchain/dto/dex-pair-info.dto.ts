export interface DexPairInfo {
  pairAddress: string;
  dexName: string;
  url: string;
  pairType: string | null;
  priceUsd: string;
  priceNative: string;
  marketCap: number;
  liquidityUsd: number;
  volume24h: number;
}
