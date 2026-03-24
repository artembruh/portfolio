import type { BlockInfo, ConnectionStatus } from '@/types';
import OdometerValue from '@/components/ui/OdometerValue';

interface BlockInfoProps {
  blockInfo: BlockInfo | null;
  status: ConnectionStatus;
}

export default function BlockInfoPanel({ blockInfo, status }: BlockInfoProps) {
  const isConnected = status === 'connected';

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-terminal-xs opacity-75 uppercase tracking-wider">Live Block Data</span>
        <span
          className={`inline-block w-2 h-2 rounded-full shrink-0 relative -top-px ${isConnected ? 'bg-[var(--pip-primary)]' : 'bg-gray-600'}`}
          style={isConnected ? {
            boxShadow: '0 0 6px var(--pip-primary), 0 0 12px var(--pip-primary)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          } : undefined}
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="inline-block min-w-[250px] text-center p-2 border border-[var(--pip-primary)]/20 rounded m-1">
          <div className="text-terminal-2xl whitespace-nowrap" style={{ textShadow: '0 0 8px #ffd52c66' }}>
            <OdometerValue value={blockInfo ? String(blockInfo.blockNumber) : undefined} />
          </div>
          <div className="text-terminal-xs opacity-75 mt-1 uppercase">BLOCK HEIGHT</div>
        </div>
        <div className="inline-block min-w-[120px] text-center p-2 border border-[var(--pip-primary)]/20 rounded m-1">
          <div className="text-terminal-2xl whitespace-nowrap" style={{ textShadow: '0 0 8px #ffd52c66', minHeight: '1.5em' }}>
            <OdometerValue value={blockInfo?.avgBlockTime != null ? `${blockInfo.avgBlockTime.toFixed(2).padStart(5, '0')}s` : undefined} />
          </div>
          <div className="text-terminal-xs opacity-75 mt-1 uppercase">AVG BLOCK TIME</div>
        </div>
      </div>
    </div>
  );
}
