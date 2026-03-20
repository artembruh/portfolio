import { stack } from '@/data/stack';

export default function Stack() {
  return (
    <section className="py-12">
      <div className="mb-6 text-base font-semibold">
        <span className="text-amber-400">$</span> cat stack.yml
      </div>

      <div>
        {stack.map((category) => (
          <div key={category.label} className="mb-4">
            <span className="text-amber-400">{category.label}:</span>
            {category.items.map((item) => (
              <div key={item} className="text-foreground text-sm ml-4">  - {item}</div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
