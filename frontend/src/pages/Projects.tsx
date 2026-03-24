import TerminalPrompt from '@/components/ui/TerminalPrompt';
import TerminalCard from '@/components/ui/TerminalCard';
import TerminalBadge from '@/components/ui/TerminalBadge';
import TerminalDivider from '@/components/ui/TerminalDivider';
import { experience } from '@/data/experience';

export default function Projects() {
  return (
    <div>
      <TerminalPrompt command="ls -la projects/" />

      {experience.map((exp, index) => (
        <div key={exp.period} className="mb-8">
          {index > 0 && <TerminalDivider />}
          {/* Header: role + current badge */}
          <div className="flex items-center gap-3">
            <div className="text-terminal-2xl" style={{ textShadow: '0 0 10px #ffd52c66' }}>{exp.role}</div>
            {index === 0 && (
              <span className="text-terminal-xs border border-(--pip-primary) px-1.5 py-0.5 rounded shrink-0">
                CURRENT
              </span>
            )}
          </div>

          {/* Company & dates */}
          <div className="text-terminal-sm mt-2.5 opacity-75">
            {exp.company} · {exp.period}
          </div>

          {/* Description */}
          <div className="text-terminal-xl mt-7.5 mb-7.5 leading-6">{exp.description}</div>

          {/* Grouped sections in TerminalCard */}
          {exp.sections && exp.sections.length > 0 && (
            <TerminalCard>
              <div className="space-y-4">
                {exp.sections.map((section) => (
                  <div key={section.title}>
                    <div className="text-terminal-sm text-(--pip-primary) mb-4 mt-4 opacity-75">
                      {'>'} {section.title}
                    </div>
                    <ul className="text-terminal-lg pl-5 list-disc leading-7">
                      {section.highlights.map((h) => (
                        <li className="pb-3 pt-3" key={h}>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TerminalCard>
          )}

          {/* Flat highlights in TerminalCard */}
          {exp.highlights.length > 0 && (
            <TerminalCard>
              <ul className="text-terminal-lg pl-5 list-disc leading-7">
                {exp.highlights.map((h) => (
                  <li className="pb-3 pt-3" key={h}>{h}</li>
                ))}
              </ul>
            </TerminalCard>
          )}

          {/* Tech badges outside card */}
          <div className="mt-3">
            {exp.tech.map((t) => (
              <TerminalBadge key={t}>{t}</TerminalBadge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
