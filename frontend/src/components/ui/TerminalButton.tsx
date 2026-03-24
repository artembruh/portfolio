interface TerminalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function TerminalButton({ children, className = '', ...props }: TerminalButtonProps) {
  return (
    <button
      {...props}
      className={`bg-[var(--pip-primary)]/15 border border-[var(--pip-primary)] text-[var(--pip-primary)] font-[inherit] px-4 py-2 text-[12px] rounded cursor-pointer hover:bg-[var(--pip-primary)]/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
