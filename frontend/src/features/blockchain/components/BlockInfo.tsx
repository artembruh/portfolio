import type { BlockInfo, ConnectionStatus } from '@/types';
import TerminalStat from '@/components/ui/TerminalStat';
import OdometerValue from '@/components/ui/OdometerValue';

interface BlockInfoProps {
  blockInfo: BlockInfo | null;
  status: ConnectionStatus;
}

export default function BlockInfoPanel({ blockInfo, status }: BlockInfoProps) {
  return (
    <div>
      <div className="text-terminal-xs opacity-40 uppercase tracking-wider mb-1.5">Live Block Data</div>
      <div className="flex gap-2 flex-wrap">
        <div className="inline-block min-w-[80px] text-center p-2 border border-[var(--pip-primary)]/20 rounded m-1">
          <div className="text-terminal-2xl" style={{ textShadow: '0 0 8px #ffd52c66' }}>
            <OdometerValue value={blockInfo?.blockNumber?.toLocaleString() ?? '--'} />
          </div>
          <div className="text-terminal-xs opacity-40 mt-1 uppercase">BLOCK HEIGHT</div>
        </div>
        <div className="inline-block min-w-[80px] text-center p-2 border border-[var(--pip-primary)]/20 rounded m-1">
          <div className="text-terminal-2xl" style={{ textShadow: '0 0 8px #ffd52c66' }}>
            <OdometerValue value={blockInfo?.avgBlockTime?.toFixed(2) ? `${blockInfo.avgBlockTime.toFixed(2)}s` : '--'} />
          </div>
          <div className="text-terminal-xs opacity-40 mt-1 uppercase">AVG BLOCK TIME</div>
        </div>
        <TerminalStat
          value={status === 'connected' ? '●' : '○'}
          label={status.toUpperCase()}
        />
      </div>
    </div>
  );
}
