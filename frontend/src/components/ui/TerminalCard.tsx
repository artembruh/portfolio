interface TerminalCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function TerminalCard({ children, className = '' }: TerminalCardProps) {
  return (
    <div
      className={`border border-[var(--pip-primary)]/20 rounded p-3 mb-2 bg-[var(--pip-primary)]/[0.03] hover:bg-[var(--pip-primary)]/[0.08] transition-colors ${className}`}
    >
      {children}
    </div>
  );
}
