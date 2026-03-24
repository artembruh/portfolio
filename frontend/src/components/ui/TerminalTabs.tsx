interface TerminalTabsProps<T extends string> {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onSelect: (id: T) => void;
}

export default function TerminalTabs<T extends string>({ tabs, active, onSelect }: TerminalTabsProps<T>) {
  return (
    <div className="flex gap-0 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`px-3.5 py-2 text-[11px] border-b-2 transition-colors ${
            tab.id === active
              ? 'border-[var(--pip-primary)] opacity-100 bg-[var(--pip-primary)]/[0.07]'
              : 'border-transparent opacity-40 hover:opacity-70'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
