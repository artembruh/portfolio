import type { DexPairInfo } from '@/types';
import { formatUsd } from '@/lib/utils';

interface PairCardProps {
  pair: DexPairInfo;
}

export default function PairCard({ pair }: PairCardProps) {
  return (
    <a
      href={pair.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-(--pip-primary)/20 rounded p-4 bg-(--pip-primary)/3 hover:border-(--pip-primary)/70 hover:shadow-[0_0_12px_var(--pip-primary)] transition-all duration-200 cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-terminal-lg uppercase">{pair.dexName}</span>
            {pair.pairType && (
              <span className="text-terminal-xs uppercase border border-(--pip-primary) px-2 rounded">{pair.pairType}</span>
            )}
          </div>
          <div className="text-terminal-sm opacity-60 mt-1">/ {pair.quoteToken.symbol}</div>
        </div>
        <span className="opacity-50">↗</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <div className="text-terminal-sm opacity-60 uppercase tracking-wider mb-1">Price</div>
          <div className="text-terminal-base">${pair.priceUsd}</div>
        </div>
        <div>
          <div className="text-terminal-sm opacity-60 uppercase tracking-wider mb-1">MCap</div>
          <div className="text-terminal-base">{formatUsd(pair.marketCap)}</div>
        </div>
        <div>
          <div className="text-terminal-sm opacity-60 uppercase tracking-wider mb-1">Liquidity</div>
          <div className="text-terminal-base">{formatUsd(pair.liquidityUsd)}</div>
        </div>
        <div>
          <div className="text-terminal-sm opacity-60 uppercase tracking-wider mb-1">Vol 24h</div>
          <div className="text-terminal-base">{formatUsd(pair.volume24h)}</div>
        </div>
      </div>
    </a>
  );
}
