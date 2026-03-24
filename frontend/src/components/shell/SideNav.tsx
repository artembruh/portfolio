import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'ABOUT' },
  { to: '/projects', label: 'PROJECTS' },
  { to: '/workbench', label: 'WORKBENCH' },
];

const SOCIAL_LINKS = [
  { href: 'https://github.com/artembratchenko', label: 'GitHub' },
  { href: 'https://linkedin.com/in/artembratchenko', label: 'LinkedIn' },
  { href: 'mailto:artem.bsns@gmail.com', label: 'Email' },
];

export default function SideNav() {
  return (
    <>
      {/* Desktop: side tabs */}
      <nav className="hidden md:flex flex-col border-r-2 border-[var(--pip-primary)]/35 min-w-[200px]">
        <div className="flex flex-col gap-0.5 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-4 py-2.5 text-terminal-sm border-l-[3px] transition-colors ${
                  isActive
                    ? 'border-[var(--pip-primary)] bg-[var(--pip-primary)]/10 font-bold'
                    : 'border-transparent opacity-40 hover:opacity-70'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="flex flex-col gap-0.5 border-t border-[var(--pip-primary)]/15 py-2">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 text-terminal-sm border-l-[3px] border-transparent opacity-40 hover:opacity-70 transition-colors flex items-center justify-between"
            >
              {link.label}
              <span className="text-terminal-sm opacity-60">↗</span>
            </a>
          ))}
        </div>
      </nav>

      {/* Mobile: bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t-2 border-[var(--pip-primary)] bg-[var(--pip-bg)]">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 py-2.5 text-center text-terminal-sm transition-colors ${
                isActive
                  ? 'bg-[var(--pip-primary)]/10 border-t-2 border-[var(--pip-primary)] font-bold'
                  : 'opacity-40'
              }`
            }
          >
            {item.label === 'WORKBENCH' ? 'BENCH' : item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
