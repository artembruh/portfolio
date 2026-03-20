export default function Hero() {
  return (
    <section className="py-12">
      <div className="mb-6">
        <div>
          <span className="text-amber-400">$</span>{' '}
          <span>whoami</span>
        </div>
        <div className="text-xl font-semibold mt-1">Artem Bratchenko</div>
      </div>

      <div className="mb-6">
        <div>
          <span className="text-amber-400">$</span>{' '}
          <span>cat role.txt</span>
        </div>
        <div className="text-xl font-semibold mt-1">Backend Engineer</div>
      </div>

      <div className="mb-6">
        <div>
          <span className="text-amber-400">$</span>{' '}
          <span>cat bio.txt</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Building robust distributed systems. Blockchain, WebSockets, NestJS.
        </div>
      </div>
    </section>
  );
}
