import { education } from '@/data/education';

export default function Education() {
  return (
    <section className="py-12">
      <div className="mb-4 text-base font-semibold">
        <span className="text-amber-400">$</span> grep -r education resume.md
      </div>

      <div className="space-y-2">
        {education.map((edu) => (
          <div key={edu.degree} className="text-sm">
            <span className="text-muted-foreground">resume.md:</span>{' '}
            <span className="text-foreground font-semibold">{edu.degree}</span>
            {' — '}
            <span className="text-muted-foreground">{edu.institution}</span>
            {' — '}
            <span className="text-amber-400/80">{edu.year}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
