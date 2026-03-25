import { useState, useEffect } from 'react';
import { useBlockchainWs } from '@/features/blockchain/hooks/useBlockchainWs';
import ChainTabs from '@/features/blockchain/components/ChainTabs';
import BlockInfoPanel from '@/features/blockchain/components/BlockInfo';
import TokenLookup from '@/features/blockchain/components/TokenLookup';
import PairCard from '@/features/blockchain/components/PairCard';
import TerminalPrompt from '@/components/ui/TerminalPrompt';
import TerminalCard from '@/components/ui/TerminalCard';
import TerminalDivider from '@/components/ui/TerminalDivider';
import { formatSupply } from '@/lib/utils';
import type { ChainId } from '@/types';

export default function Workbench() {
  const [activeChain, setActiveChain] = useState<ChainId>('ethereum');
  const { status, blockInfo, tokenResult, pairs, isLookingUp, isFetchingPairs, lookupError, subscribeChain, lookupToken } =
    useBlockchainWs();

  useEffect(() => {
    subscribeChain(activeChain);
  }, [activeChain, subscribeChain]);

  return (
    <div>
      <TerminalPrompt command="./workbench --interactive" />

      {status === 'disconnected' && (
        <div className="text-(--pip-tertiary) text-terminal-sm mb-4">
          ⚠ connection lost — refresh to reconnect
        </div>
      )}

      <ChainTabs activeChain={activeChain} onChainSelect={setActiveChain} />

      <BlockInfoPanel blockInfo={blockInfo} status={status} />

      <TerminalDivider />

      <div className="text-terminal-sm opacity-75 uppercase tracking-wider mb-2">Token Lookup</div>
      <TokenLookup
        chain={activeChain}
        onLookup={(addr) => void lookupToken(activeChain, addr)}
        disabled={isLookingUp}
      />

      {isLookingUp && (
        <div className="text-terminal-sm opacity-75 mt-3">Scanning...</div>
      )}

      {lookupError && !isLookingUp && (
        <div className="text-(--pip-tertiary) text-terminal-sm mt-3">
          Error: {lookupError}
        </div>
      )}

      {tokenResult && !isLookingUp && (
        <TerminalCard className="mt-3">
          <div className="text-terminal-sm opacity-75 uppercase tracking-wider mb-3">Token Found</div>
          <div className="text-terminal-lg mb-1"><span className="opacity-75">Name: </span>{tokenResult.name}</div>
          <div className="text-terminal-lg mb-1"><span className="opacity-75">Symbol: </span>{tokenResult.symbol}</div>
          <div className="text-terminal-lg mb-1"><span className="opacity-75">Decimals: </span>{tokenResult.decimals}</div>
          <div className="text-terminal-lg"><span className="opacity-75">Supply: </span>{formatSupply(tokenResult.totalSupply)}</div>
        </TerminalCard>
      )}

      {tokenResult && !isLookingUp && (
        <>
          {isFetchingPairs && (
            <div className="text-terminal-sm opacity-75 mt-3">Fetching DEX pairs...</div>
          )}

          {pairs.length > 0 && (
            <div className="mt-4">
              <div className="text-terminal-sm opacity-75 uppercase tracking-wider mb-3">
                DEX Pairs ({pairs.length})
              </div>
              <div className="flex flex-col gap-2">
                {pairs.map((pair) => (
                  <PairCard key={pair.pairAddress} pair={pair} />
                ))}
              </div>
            </div>
          )}

          {!isFetchingPairs && pairs.length === 0 && (
            <div className="text-terminal-sm opacity-50 mt-3">No DEX pairs found</div>
          )}
        </>
      )}

      {!tokenResult && !isLookingUp && !lookupError && (
        <div className="text-terminal-sm opacity-50 mt-3 text-center">
          Enter a contract address above to look up token info
        </div>
      )}
    </div>
  );
}
