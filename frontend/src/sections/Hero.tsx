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
        <div className="text-xl font-semibold mt-1">Senior Backend Engineer</div>
      </div>

      <div className="mb-6">
        <div>
          <span className="text-amber-400">$</span>{' '}
          <span>cat bio.txt</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">
          7+ years building high-performance systems in Node.js and TypeScript.
          Deep expertise in blockchain infrastructure — built and maintained a production
          crypto wallet backend serving real-time trading across Solana, Ethereum, BSC,
          Base, Tron, Ton, and Sui. Microservices, PostgreSQL, Redis, message queues.
        </div>
      </div>
    </section>
  );
}
