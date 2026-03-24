interface TerminalStatProps {
  value: string;
  label: string;
  glow?: boolean;
}

export default function TerminalStat({ value, label, glow }: TerminalStatProps) {
  return (
    <div className={`inline-block min-w-[80px] text-center p-2 border rounded m-1 transition-all duration-500 ${
      glow
        ? 'border-[var(--pip-primary)]/60'
        : 'border-[var(--pip-primary)]/20'
    }`}>
      <div
        className="text-terminal-2xl transition-all duration-500"
        style={{
          textShadow: glow
            ? '0 0 20px #ffd52c, 0 0 40px #ffd52caa, 0 0 60px #ffd52c66'
            : '0 0 8px #ffd52c66',
        }}
      >
        {value}
      </div>
      <div className="text-terminal-xs opacity-40 mt-1 uppercase">{label}</div>
    </div>
  );
}
