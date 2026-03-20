export interface BlockInfo {
  chain: string;
  blockNumber: number;
  avgBlockTime: number;
}

export interface TraceStep {
  step: number;
  status: 'in_progress' | 'done' | 'error';
  message: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string; // string to preserve BigInt precision
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export const SUPPORTED_CHAINS = [
  { id: 'ethereum', label: 'ETH' },
  { id: 'base', label: 'BASE' },
  { id: 'bsc', label: 'BSC' },
  { id: 'solana', label: 'SOL' },
] as const;

export type ChainId = (typeof SUPPORTED_CHAINS)[number]['id'];
