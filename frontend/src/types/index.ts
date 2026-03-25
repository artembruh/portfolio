export interface BlockInfo {
  chain: string;
  blockNumber: number;
  avgBlockTime: number;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string; // string to preserve BigInt precision
}

export interface DexPairInfo {
  pairAddress: string;
  dexName: string;
  url: string;
  pairType: string | null;
  quoteToken: { name: string; symbol: string };
  priceUsd: string;
  priceNative: string;
  marketCap: number;
  liquidityUsd: number;
  volume24h: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export const SUPPORTED_CHAINS = [
  { id: 'ethereum', label: 'ETH' },
  { id: 'base', label: 'BASE' },
  { id: 'bsc', label: 'BSC' },
  { id: 'solana', label: 'SOL' },
] as const;

export type ChainId = (typeof SUPPORTED_CHAINS)[number]['id'];
