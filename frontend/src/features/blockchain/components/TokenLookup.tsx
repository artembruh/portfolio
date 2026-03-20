import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="0x... token contract address"
        className="flex-1 font-mono"
        disabled={disabled}
      />
      <Button
        type="submit"
        disabled={disabled || !address.trim()}
        className="bg-amber-400 text-gray-950 font-semibold hover:bg-amber-500 min-h-[44px] min-w-[60px]"
      >
        Go
      </Button>
    </form>
  );
}
