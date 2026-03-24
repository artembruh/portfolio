import { useState } from 'react';
import TerminalInput from '@/components/ui/TerminalInput';
import TerminalButton from '@/components/ui/TerminalButton';
import type { ChainId } from '@/types';

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
    </div>
  );
}
