import { experience } from '@/data/experience';
import { Badge } from '@/components/ui/badge';

export default function Experience() {
  return (
    <section className="py-12">
      <div className="mb-6 text-base font-semibold">
        <span className="text-amber-400">$</span> ls -la experience/
      </div>

      <div className="space-y-6">
        {experience.map((exp) => (
          <div key={`${exp.company}-${exp.period}`} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">drwxr-xr-x</span>
              <span className="text-foreground font-semibold">{exp.role}</span>
              <span className="text-muted-foreground text-sm">—</span>
              <span className="text-amber-400 text-sm">{exp.company}</span>
            </div>
            <div className="text-muted-foreground text-sm">
              {exp.description} · {exp.period}
            </div>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              {exp.tech.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
            <ul className="mt-2 space-y-1">
              {exp.highlights.map((h, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-4">
                  <span className="text-amber-400/60">›</span> {h}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
