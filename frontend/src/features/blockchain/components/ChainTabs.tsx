import { SUPPORTED_CHAINS, type ChainId } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChainTabsProps {
  activeChain: ChainId;
  onChainSelect: (chain: ChainId) => void;
}

export default function ChainTabs({ activeChain, onChainSelect }: ChainTabsProps) {
  return (
    <Tabs
      value={activeChain}
      onValueChange={(v) => onChainSelect(v as ChainId)}
    >
      <TabsList
        variant="line"
        className="overflow-x-auto w-full min-w-max"
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <TabsTrigger
            key={chain.id}
            value={chain.id}
            className="min-h-[44px] text-muted-foreground hover:text-amber-400 data-active:text-amber-400 data-active:border-b-2 data-active:border-amber-400"
          >
            {chain.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
