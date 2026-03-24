interface TerminalCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function TerminalCard({ children, className = '' }: TerminalCardProps) {
  return (
    <div
      className={`border border-(--pip-primary)/20 rounded p-3 mb-2 bg-(--pip-primary)/3 hover:bg-(--pip-primary)/8 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}
