import TerminalPrompt from '@/components/ui/TerminalPrompt';
import TerminalCard from '@/components/ui/TerminalCard';
import TerminalBadge from '@/components/ui/TerminalBadge';
import { experience } from '@/data/experience';

export default function Projects() {
  return (
    <div>
      <TerminalPrompt command="ls -la projects/" />

      {experience.map((exp, index) => (
        <TerminalCard key={exp.period}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-terminal-lg">{exp.role}</div>
              <div className="text-terminal-sm opacity-50">{exp.company} · {exp.period}</div>
            </div>
            {index === 0 && (
              <span className="text-terminal-xs border border-[var(--pip-primary)] px-1.5 py-0.5 rounded shrink-0">
                CURRENT
              </span>
            )}
          </div>
          <div className="text-terminal-sm opacity-60 mt-2 leading-6">
            {exp.description}
          </div>
          {exp.highlights.length > 0 && (
            <ul className="text-terminal-sm opacity-50 mt-2 space-y-1 pl-3 list-disc">
              {exp.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
          <div className="mt-2">
            {exp.tech.map((t) => (
              <TerminalBadge key={t}>{t}</TerminalBadge>
            ))}
          </div>
        </TerminalCard>
      ))}
    </div>
  );
}
