import { useState, useEffect } from 'react';
import { useBlockchainWs } from '@/features/blockchain/hooks/useBlockchainWs';
import ChainTabs from '@/features/blockchain/components/ChainTabs';
import BlockInfoPanel from '@/features/blockchain/components/BlockInfo';
import TokenLookup from '@/features/blockchain/components/TokenLookup';
import { Card, CardContent } from '@/components/ui/card';
import type { ChainId } from '@/types';

function formatSupply(raw: string): string {
  try {
    return BigInt(raw).toLocaleString();
  } catch {
    return raw;
  }
}

export default function BlockchainExplorer() {
  const [activeChain, setActiveChain] = useState<ChainId>('ethereum');
  const { status, blockInfo, tokenResult, isLookingUp, subscribeChain, lookupToken } =
    useBlockchainWs();

  useEffect(() => {
    subscribeChain(activeChain);
  }, [activeChain, subscribeChain]);

  const handleChainSelect = (chain: ChainId) => {
    setActiveChain(chain);
  };

  const handleLookup = (address: string) => {
    void lookupToken(activeChain, address);
  };

  return (
    <div>
      {status === 'disconnected' && (
        <div className="text-destructive text-sm mb-4">
          connection lost — refresh to reconnect
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-4">
          <ChainTabs activeChain={activeChain} onChainSelect={handleChainSelect} />
          <BlockInfoPanel blockInfo={blockInfo} />
          <TokenLookup onLookup={handleLookup} disabled={isLookingUp} />
        </div>
        {/* Right column */}
        <div className="space-y-4">
          {tokenResult && (
            <Card>
              <CardContent className="p-6 space-y-2 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  <span className="font-semibold">{tokenResult.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Symbol: </span>
                  <span className="font-semibold">{tokenResult.symbol}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Decimals: </span>
                  <span className="font-semibold">{tokenResult.decimals}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Supply: </span>
                  <span className="font-semibold">{formatSupply(tokenResult.totalSupply)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
