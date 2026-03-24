import TerminalTabs from '@/components/ui/TerminalTabs';
import { SUPPORTED_CHAINS, type ChainId } from '@/types';

interface ChainTabsProps {
  activeChain: ChainId;
  onChainSelect: (chain: ChainId) => void;
}

export default function ChainTabs({ activeChain, onChainSelect }: ChainTabsProps) {
  return (
    <TerminalTabs
      tabs={SUPPORTED_CHAINS}
      active={activeChain}
      onSelect={(id) => onChainSelect(id as ChainId)}
    />
  );
}
