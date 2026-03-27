import { useState } from 'react';
import TerminalInput from '@/components/ui/TerminalInput';
import TerminalButton from '@/components/ui/TerminalButton';
import type { ChainId } from '@/types';

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const EXAMPLE_TOKENS: Record<ChainId, { name: string; address: string }[]> = {
  ethereum: [
    { name: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    { name: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    { name: 'PEPE', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
    { name: 'BOOE', address: '0x289Ff00235D2b98b0145ff5D4435d3e92f9540a6' },
    { name: 'NEIRO', address: '0x812Ba41e071C7b7fA4EBcFB62dF5F45f6fA853Ee' },
    { name: 'BITCOIN', address: '0x72e4f9F808C49A2a61dE9C5896298920Dc4EEEa9' },
  ],
  base: [
    { name: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    { name: 'BRETT', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4' },
    { name: 'FAI', address: '0xb33Ff54b9F7242EF1593d2C9Bcd8f9df46c77935' },
    { name: 'ZORA', address: '0x1111111111166b7FE7bd91427724B487980aFc69' },
    { name: 'VIRTUAL', address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b' },
  ],
  bsc: [
    { name: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955' },
    { name: 'CAKE', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82' },
    { name: 'SIREN', address: '0x997A58129890bBdA032231A52eD1ddC845fc18e1' },
  ],
  solana: [
    { name: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
    { name: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
    { name: 'GIGA', address: '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9' },
    { name: 'JELLYJELLY', address: 'FeR8VBqNRSUD5NtXAj2n3j1dAHkZHfyDktKuLXD4pump' },
    { name: 'FARTCOIN', address: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump' },
  ],
};

function validateAddress(chain: ChainId, address: string): string | null {
  if (!address.trim()) return null;
  if (chain === 'solana') {
    return SOLANA_ADDRESS_RE.test(address) ? null : 'Invalid Solana address';
  }
  return EVM_ADDRESS_RE.test(address) ? null : 'Invalid EVM address (0x + 40 hex chars)';
}

function getPlaceholder(chain: ChainId): string {
  return chain === 'solana' ? 'Solana token mint address' : '0x... contract address';
}

interface TokenLookupProps {
  chain: ChainId;
  onLookup: (address: string) => void;
  disabled: boolean;
}

export default function TokenLookup({ chain, onLookup, disabled }: TokenLookupProps) {
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateAddress(chain, address.trim());
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    onLookup(address.trim());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    if (validationError) setValidationError(null);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <TerminalInput
          value={address}
          onChange={handleChange}
          placeholder={getPlaceholder(chain)}
          disabled={disabled}
          className="flex-1"
        />
        <TerminalButton type="submit" disabled={disabled || !address.trim()}>
          SCAN
        </TerminalButton>
      </form>
      {validationError && (
        <div className="text-[var(--pip-tertiary)] text-terminal-sm mt-2">
          {validationError}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-terminal-sm opacity-50">Try:</span>
        {EXAMPLE_TOKENS[chain]?.map((token) => (
          <button
            key={token.address}
            type="button"
            disabled={disabled}
            onClick={() => {
              setAddress(token.address);
              setValidationError(null);
              onLookup(token.address);
            }}
            className="text-terminal-sm text-(--pip-primary) opacity-75 hover:opacity-100 cursor-pointer transition-opacity disabled:opacity-30"
          >
            {token.name}
          </button>
        ))}
      </div>
    </div>
  );
}
