import { projects } from '@/data/projects';
import { Badge } from '@/components/ui/badge';

export default function Projects() {
  return (
    <section className="py-12">
      <div className="mb-6 text-base font-semibold">
        <span className="text-amber-400">$</span> ls -la projects/
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.name} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">drwxr-xr-x</span>
              <span className="text-foreground font-semibold">{project.name}</span>
            </div>
            <div className="text-muted-foreground text-sm">{project.description}</div>
            <div className="flex flex-wrap gap-2 items-center">
              {project.tech.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-amber-400 text-sm"
                >
                  [github]
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-amber-400 text-sm"
                >
                  [live]
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
