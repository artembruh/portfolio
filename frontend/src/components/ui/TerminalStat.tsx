interface TerminalStatProps {
  value: string;
  label: string;
}

export default function TerminalStat({ value, label }: TerminalStatProps) {
  return (
    <div className="inline-block min-w-[80px] text-center p-2 border border-[var(--pip-primary)]/20 rounded m-1">
      <div className="text-2xl" style={{ textShadow: '0 0 8px #ffd52c66' }}>{value}</div>
      <div className="text-sm opacity-40 mt-1 uppercase">{label}</div>
    </div>
  );
}
