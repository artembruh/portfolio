import { useEffect, useRef } from 'react';
import type { TraceStep } from '@/types';

function StatusIcon({ status }: { status: TraceStep['status'] }) {
  if (status === 'in_progress') {
    return <span className="text-amber-400 animate-spin inline-block">⟳</span>;
  }
  if (status === 'done') {
    return <span className="text-amber-400">✓</span>;
  }
  return <span className="text-destructive">✗</span>;
}

interface TraceTerminalProps {
  lines: TraceStep[];
}

export default function TraceTerminal({ lines }: TraceTerminalProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="bg-background border-2 border-border rounded min-h-40 p-4 overflow-y-auto font-mono text-sm">
      {lines.length === 0 ? (
        <span className="text-muted-foreground">&gt; awaiting token lookup...</span>
      ) : (
        lines.map((line, i) => (
          <div key={i} className="flex items-start justify-between leading-7">
            <span>
              <span className="text-amber-400">{'> '}</span>
              {line.message}
              {line.status === 'in_progress' && (
                <span className="text-amber-400 animate-pulse ml-1">|</span>
              )}
            </span>
            <StatusIcon status={line.status} />
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
