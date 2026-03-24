export default function CrtOverlay() {
  return (
    <>
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)',
        }}
      />
      {/* Sweep line */}
      <div
        className="pointer-events-none absolute inset-0 z-[11] motion-safe:animate-[sweep_7s_linear_infinite]"
        style={{
          background: 'linear-gradient(0deg, transparent 40%, rgba(255,213,44,0.03) 50%, transparent 60%)',
          backgroundSize: '100% 200%',
        }}
      />
    </>
  );
}
