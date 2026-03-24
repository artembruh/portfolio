interface TerminalBadgeProps {
  children: React.ReactNode;
}

export default function TerminalBadge({ children }: TerminalBadgeProps) {
  return (
    <span className="inline-block border border-[var(--pip-primary)]/25 rounded px-2 py-0.5 text-terminal-xs m-0.5">
      {children}
    </span>
  );
}
