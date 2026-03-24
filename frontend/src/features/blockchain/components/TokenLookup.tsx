import { useState } from 'react';
import TerminalInput from '@/components/ui/TerminalInput';
import TerminalButton from '@/components/ui/TerminalButton';

interface TokenLookupProps {
  onLookup: (address: string) => void;
  disabled: boolean;
}

export default function TokenLookup({ onLookup, disabled }: TokenLookupProps) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    onLookup(address.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <TerminalInput
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="0x... contract address"
        disabled={disabled}
        className="flex-1"
      />
      <TerminalButton type="submit" disabled={disabled || !address.trim()}>
        SCAN
      </TerminalButton>
    </form>
  );
}
