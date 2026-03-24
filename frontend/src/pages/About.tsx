import TerminalPrompt from '@/components/ui/TerminalPrompt';
import TerminalCard from '@/components/ui/TerminalCard';
import TerminalBadge from '@/components/ui/TerminalBadge';
import TerminalDivider from '@/components/ui/TerminalDivider';
import { education } from '@/data/education';
import { stack } from '@/data/stack';

export default function About() {
  return (
    <div>
      {/* Bio */}
      <TerminalPrompt command="whoami" />
      <h1 className="text-xl mb-1.5" style={{ textShadow: '0 0 10px #ffd52c66' }}>
        Artem Bratchenko
      </h1>
      <p className="text-[13px] opacity-70 leading-7 mb-0">
        Senior Backend Engineer
      </p>
      <p className="text-[12px] opacity-50 leading-7 max-w-2xl mt-2">
        7+ years building high-performance systems in Node.js and TypeScript.
        Deep expertise in blockchain infrastructure — built and maintained a production
        crypto wallet backend serving real-time trading across Solana, Ethereum, BSC,
        Base, Tron, Ton, and Sui. Microservices, PostgreSQL, Redis, message queues.
      </p>

      <TerminalDivider />

      {/* Education */}
      <TerminalPrompt command="cat education.md" />
      {education.map((edu) => (
        <TerminalCard key={edu.year}>
          <div className="text-[13px]">{edu.degree}</div>
          <div className="text-[11px] opacity-50">{edu.institution} · {edu.year}</div>
        </TerminalCard>
      ))}

      <TerminalDivider />

      {/* Tech Stack */}
      <TerminalPrompt command="ls tech-stack/" />
      {stack.map((category) => (
        <div key={category.label} className="mb-2.5">
          <div className="text-[10px] opacity-40 uppercase tracking-wider mb-1.5">{category.label}</div>
          <div>
            {category.items.map((item) => (
              <TerminalBadge key={item}>{item}</TerminalBadge>
            ))}
          </div>
        </div>
      ))}

      {/* Mobile social links */}
      <div className="md:hidden mt-8 pt-4 border-t border-[var(--pip-primary)]/15 text-[10px] opacity-30 space-y-1">
        <a href="https://github.com/artembratchenko" target="_blank" rel="noopener noreferrer" className="block hover:opacity-100">{'>'} GitHub</a>
        <a href="https://linkedin.com/in/artembratchenko" target="_blank" rel="noopener noreferrer" className="block hover:opacity-100">{'>'} LinkedIn</a>
        <a href="mailto:artem.bsns@gmail.com" className="block hover:opacity-100">{'>'} Email</a>
      </div>
    </div>
  );
}
