import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-12 bg-card border-b border-border">
      <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
        <span className="text-foreground font-mono text-sm">
          artem@portfolio:~<span className="text-amber-400">$</span>
        </span>
        <nav className="flex items-center gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'font-mono text-sm transition-colors',
                isActive
                  ? 'text-amber-400'
                  : 'text-muted-foreground hover:text-amber-400',
              )
            }
          >
            cd /
          </NavLink>
          <NavLink
            to="/blockchain"
            className={({ isActive }) =>
              cn(
                'font-mono text-sm transition-colors',
                isActive
                  ? 'text-amber-400'
                  : 'text-muted-foreground hover:text-amber-400',
              )
            }
          >
            cd /blockchain
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
