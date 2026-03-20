export interface StackCategory {
  label: string;
  items: string[];
}

export const stack: StackCategory[] = [
  { label: 'languages', items: ['TypeScript', 'Go', 'SQL'] },
  { label: 'backend', items: ['NestJS', 'Express', 'gRPC'] },
  { label: 'frontend', items: ['React', 'Vite', 'Tailwind CSS'] },
  { label: 'databases', items: ['PostgreSQL', 'Redis', 'MongoDB'] },
  { label: 'blockchain', items: ['ethers.js', '@solana/kit', 'WebSockets'] },
  { label: 'infrastructure', items: ['Docker', 'Nginx', 'GitHub Actions'] },
];
