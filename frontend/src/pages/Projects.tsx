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
              {/* 1. Position name bigger by 1 step */}
              <div className="text-terminal-2xl">{exp.role}</div>
              {/* 2. Company & dates: pad-top 15px */}
              <div className="text-terminal-sm mt-2.5 opacity-75">
                {exp.company} · {exp.period}
              </div>
            </div>
            {index === 0 && (
              <span className="text-terminal-xs border border-(--pip-primary) px-1.5 py-0.5 rounded shrink-0">
                CURRENT
              </span>
            )}
          </div>
          {/* 3. Project description: less transparent, bigger, pad-top 30px */}
          <div className="text-terminal-xl mt-7.5 mb-7.5 leading-6">{exp.description}</div>

          {/* Grouped sections (e.g. Crypto Wallet & Trading Platform with General/Solana/Product) */}
          {exp.sections && exp.sections.length > 0 && (
            <div className="mt-8 space-y-4">
              {exp.sections.map((section) => (
                <div key={section.title}>
                  <div className="text-terminal-sm text-(--pip-primary) mb-4 mt-4 opacity-75">
                    {'>'} {section.title}
                  </div>
                  {/* 4. Bullet points: less transparent, more line spacing */}
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
          )}

          {/* Flat highlights (other entries) */}
          {exp.highlights.length > 0 && (
            <ul className="text-terminal-lg mt-3 pl-5 list-disc leading-7">
              {exp.highlights.map((h) => (
                <li className="pb-3 pt-3" key={h}>{h}</li>
              ))}
            </ul>
          )}

          <div className="mt-3">
            {exp.tech.map((t) => (
              <TerminalBadge key={t}>{t}</TerminalBadge>
            ))}
          </div>
        </TerminalCard>
      ))}
    </div>
  );
}
