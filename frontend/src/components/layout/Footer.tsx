export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-6">
      <div className="max-w-4xl mx-auto px-4">
        <p className="text-muted-foreground text-sm font-mono mb-2">
          <span className="text-amber-400">$</span> echo &apos;Built with React + NestJS&apos;
        </p>
        <div className="flex gap-4">
          <a
            href="https://github.com/artembratchenko"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-amber-400 text-sm font-mono transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/artembratchenko"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-amber-400 text-sm font-mono transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="mailto:artem.bsns@gmail.com"
            className="text-muted-foreground hover:text-amber-400 text-sm font-mono transition-colors"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
