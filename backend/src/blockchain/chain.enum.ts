export enum Chain {
  Ethereum = 'ethereum',
  Base = 'base',
  Bsc = 'bsc',
  Solana = 'solana',
}

/** Maps each chain to its .env variable keys. */
export const CHAIN_CONFIG: Record<Chain, { httpEnvKey: string; wsEnvKey: string }> = {
  [Chain.Ethereum]: { httpEnvKey: 'ETH_RPC_URL', wsEnvKey: 'ETH_WS_URL' },
  [Chain.Base]:     { httpEnvKey: 'BASE_RPC_URL', wsEnvKey: 'BASE_WS_URL' },
  [Chain.Bsc]:      { httpEnvKey: 'BSC_RPC_URL', wsEnvKey: 'BSC_WS_URL' },
  [Chain.Solana]:   { httpEnvKey: 'SOLANA_RPC_URL', wsEnvKey: 'SOLANA_WS_URL' },
};
