import { education } from '@/data/education';

export default function Education() {
  return (
    <section className="py-12">
      <div className="mb-4 text-base font-semibold">
        <span className="text-amber-400">$</span> grep -r education resume.md
      </div>

      <div className="text-sm">
        <span className="text-muted-foreground">resume.md:</span>{' '}
        {education.degree} — {education.institution} — {education.year}
      </div>
    </section>
  );
}
