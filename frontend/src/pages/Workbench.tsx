import { useState, useEffect, useCallback } from 'react';
import { useBlockchainWs } from '@/features/blockchain/hooks/useBlockchainWs';
import ChainTabs from '@/features/blockchain/components/ChainTabs';
import BlockInfoPanel from '@/features/blockchain/components/BlockInfo';
import TokenLookup from '@/features/blockchain/components/TokenLookup';
import TerminalPrompt from '@/components/ui/TerminalPrompt';
import TerminalCard from '@/components/ui/TerminalCard';
import TerminalDivider from '@/components/ui/TerminalDivider';
import { formatSupply } from '@/lib/utils';
import type { ChainId } from '@/types';

export default function Workbench() {
  const [activeChain, setActiveChain] = useState<ChainId>('ethereum');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const { status, blockInfo, tokenResult, isLookingUp, subscribeChain, lookupToken } =
    useBlockchainWs();

  useEffect(() => {
    subscribeChain(activeChain);
  }, [activeChain, subscribeChain]);

  const handleLookup = useCallback(
    async (address: string) => {
      setLookupError(null);
      await lookupToken(activeChain, address);
    },
    [activeChain, lookupToken],
  );

  return (
    <div>
      <TerminalPrompt command="./workbench --interactive" />

      {status === 'disconnected' && (
        <div className="text-[var(--pip-tertiary)] text-terminal-sm mb-4">
          ⚠ connection lost — refresh to reconnect
        </div>
      )}

      <ChainTabs activeChain={activeChain} onChainSelect={setActiveChain} />

      <BlockInfoPanel blockInfo={blockInfo} status={status} />

      <TerminalDivider />

      <div className="text-terminal-xs opacity-40 uppercase tracking-wider mb-1.5">Token Lookup</div>
      <TokenLookup onLookup={(addr) => void handleLookup(addr)} disabled={isLookingUp} />

      {isLookingUp && (
        <div className="text-terminal-sm opacity-50 mt-3">Scanning...</div>
      )}

      {tokenResult && !isLookingUp && (
        <TerminalCard className="mt-3">
          <div className="text-terminal-xs opacity-40 uppercase tracking-wider mb-1.5">Token Found</div>
          <div className="flex justify-between">
            <span>{tokenResult.name}</span>
            <span className="opacity-60">{tokenResult.symbol}</span>
          </div>
          <div className="text-terminal-sm opacity-50 mt-1.5">
            Decimals: {tokenResult.decimals} · Supply: {formatSupply(tokenResult.totalSupply)}
          </div>
        </TerminalCard>
      )}

      {!tokenResult && !isLookingUp && (
        <div className="text-terminal-sm opacity-30 mt-3 text-center">
          Enter a contract address above to look up token info
        </div>
      )}
    </div>
  );
}
