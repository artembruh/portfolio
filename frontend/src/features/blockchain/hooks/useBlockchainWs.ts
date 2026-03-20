import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BlockInfo, TraceStep, TokenInfo, ConnectionStatus } from '@/types';

const WS_URL =
  import.meta.env.MODE === 'production' ? undefined : 'http://localhost:3000';

export function useBlockchainWs() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [traceLines, setTraceLines] = useState<TraceStep[]>([]);
  const [tokenResult, setTokenResult] = useState<TokenInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    const socket = io(WS_URL, { autoConnect: true });
    socketRef.current = socket;

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onBlockUpdate = (data: BlockInfo) => setBlockInfo(data);
    const onTrace = (data: TraceStep) => {
      setTraceLines((prev) => [...prev, data]);
      if (data.status === 'error') {
        setIsLookingUp(false);
      }
      if (data.status === 'done' && data.step === 5) {
        setIsLookingUp(false);
      }
    };
    const onTokenResult = (data: TokenInfo) => {
      setTokenResult(data);
      setIsLookingUp(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('block_update', onBlockUpdate);
    socket.on('trace', onTrace);
    socket.on('token_result', onTokenResult);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('block_update', onBlockUpdate);
      socket.off('trace', onTrace);
      socket.off('token_result', onTokenResult);
      socket.disconnect();
    };
  }, []);

  const subscribeChain = useCallback((chain: string) => {
    setBlockInfo(null);
    socketRef.current?.emit('subscribe_chain', { chain });
  }, []);

  const lookupToken = useCallback((chain: string, address: string) => {
    setTraceLines([]);
    setTokenResult(null);
    setIsLookingUp(true);
    socketRef.current?.emit('token_lookup', { chain, address });
  }, []);

  return {
    status,
    blockInfo,
    traceLines,
    tokenResult,
    isLookingUp,
    subscribeChain,
    lookupToken,
  };
}
