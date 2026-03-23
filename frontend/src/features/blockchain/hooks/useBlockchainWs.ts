import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BlockInfo, TokenInfo, ConnectionStatus } from '@/types';

const WS_URL =
  import.meta.env.MODE === 'production' ? undefined : 'http://localhost:3000';

const API_BASE =
  import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000';

export function useBlockchainWs() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [tokenResult, setTokenResult] = useState<TokenInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    const socket = io(WS_URL, { autoConnect: true });
    socketRef.current = socket;

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onBlockUpdate = (data: BlockInfo) => setBlockInfo(data);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('block_update', onBlockUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('block_update', onBlockUpdate);
      socket.disconnect();
    };
  }, []);

  const subscribeChain = useCallback((chain: string) => {
    setBlockInfo(null);
    socketRef.current?.emit('subscribe_chain', { chain });
  }, []);

  const lookupToken = useCallback(async (chain: string, address: string): Promise<void> => {
    setTokenResult(null);
    setIsLookingUp(true);
    try {
      const res = await fetch(`${API_BASE}/api/blockchain/${chain}/token/${address}`);
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => ({}));
        const message =
          typeof body === 'object' && body !== null && 'message' in body
            ? String((body as { message: unknown }).message)
            : `Error ${res.status}`;
        console.error(`Token lookup failed: ${message}`);
      } else {
        const data = (await res.json()) as TokenInfo;
        setTokenResult(data);
      }
    } catch (err) {
      console.error('Network error during token lookup', err);
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  return { status, blockInfo, tokenResult, isLookingUp, subscribeChain, lookupToken };
}
