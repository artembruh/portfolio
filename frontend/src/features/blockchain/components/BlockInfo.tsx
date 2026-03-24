import { useEffect, useState } from 'react';
import type { BlockInfo, ConnectionStatus } from '@/types';
import TerminalStat from '@/components/ui/TerminalStat';

interface BlockInfoProps {
  blockInfo: BlockInfo | null;
  status: ConnectionStatus;
}

export default function BlockInfoPanel({ blockInfo, status }: BlockInfoProps) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!blockInfo?.blockNumber) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 300);
    return () => clearTimeout(t);
  }, [blockInfo?.blockNumber]);

  return (
    <div>
      <div className="text-sm opacity-40 uppercase tracking-wider mb-1.5">Live Block Data</div>
      <div className="flex gap-2 flex-wrap">
        <TerminalStat
          value={blockInfo?.blockNumber?.toLocaleString() ?? '--'}
          label="BLOCK HEIGHT"
        />
        <TerminalStat
          value={blockInfo?.avgBlockTime?.toFixed(1) ? `${blockInfo.avgBlockTime.toFixed(1)}s` : '--'}
          label="AVG BLOCK TIME"
        />
        <TerminalStat
          value={status === 'connected' ? '●' : '○'}
          label={status.toUpperCase()}
        />
      </div>
    </div>
  );
}
