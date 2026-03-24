import TerminalPrompt from '@/components/ui/TerminalPrompt';
import TerminalBadge from '@/components/ui/TerminalBadge';
import TerminalDivider from '@/components/ui/TerminalDivider';
import { education } from '@/data/education';
import { stack } from '@/data/stack';

export default function About() {
  return (
    <div>
      {/* Bio */}
      <TerminalPrompt command="whoami" />
      <h1 className="text-terminal-2xl mb-4" style={{ textShadow: '0 0 10px #ffd52c66' }}>
        Artem Bratchenko
      </h1>
      <p className="text-terminal-xl leading-8 mb-0">
        Senior Backend Engineer
      </p>
      <p className="text-terminal-lg leading-9 max-w-4xl mt-7.5">
        7+ years building high-performance systems in Node.js and TypeScript.
        Deep expertise in blockchain infrastructure — built and maintained a production
        crypto wallet backend serving real-time trading across Solana, Ethereum, BSC,
        Base, Tron, Ton, and Sui. Microservices, PostgreSQL, Redis, message queues.
      </p>

      <TerminalDivider />

      {/* Tech Stack */}
      <TerminalPrompt command="ls tech-stack/" />
      {stack.map((category) => (
        <div key={category.label} className="mb-6 last:mb-0">
          <div className="text-terminal-sm uppercase tracking-wider mb-3">{category.label}</div>
          <div>
            {category.items.map((item) => (
              <TerminalBadge key={item}>{item}</TerminalBadge>
            ))}
          </div>
        </div>
      ))}

      <TerminalDivider />

      {/* Education */}
      <TerminalPrompt command="cat education.md" />
      {education.map((edu) => (
        <div key={edu.year} className="mb-4">
          <div className="text-terminal-xl">{edu.degree}</div>
          <div className="text-terminal-sm mt-4">{edu.institution} · {edu.year}</div>
        </div>
      ))}

      {/* Mobile social links */}
      <div className="md:hidden mt-8 pt-4 border-t border-(--pip-primary)/15 text-terminal-sm opacity-75 space-y-3">
        <a href="https://github.com/artembruh" target="_blank" rel="noopener noreferrer" className="block hover:opacity-100">{'>'} GitHub ↗</a>
        <a href="https://www.linkedin.com/in/artem-bratchenko/" target="_blank" rel="noopener noreferrer" className="block hover:opacity-100">{'>'} LinkedIn ↗</a>
        <a href="mailto:artem.bsns@gmail.com" className="block hover:opacity-100">{'>'} Email ↗</a>
      </div>
    </div>
  );
}
