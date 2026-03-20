import { useEffect, useState } from 'react';
import type { BlockInfo } from '@/types';
import { cn } from '@/lib/utils';

interface BlockInfoProps {
  blockInfo: BlockInfo | null;
}

export default function BlockInfoPanel({ blockInfo }: BlockInfoProps) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!blockInfo?.blockNumber) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 300);
    return () => clearTimeout(t);
  }, [blockInfo?.blockNumber]);

  return (
    <div className="bg-card rounded p-6 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Latest Block:</span>
        <span
          className={cn(
            'text-sm font-semibold transition-colors duration-300',
            flash ? 'text-amber-400' : 'text-foreground',
          )}
        >
          #{blockInfo?.blockNumber?.toLocaleString() ?? '--'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Avg Block Time:</span>
        <span className="text-sm font-semibold">
          {blockInfo?.avgBlockTime?.toFixed(1) ?? '--'}s
        </span>
      </div>
    </div>
  );
}
