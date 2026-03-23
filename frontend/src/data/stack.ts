export interface StackCategory {
  label: string;
  items: string[];
}

export const stack: StackCategory[] = [
  { label: 'core', items: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Express.js', 'NestJS', 'Socket.io'] },
  { label: 'blockchain', items: ['Solana', 'Ethereum', 'Ethers.js', 'Blockchain Indexers', 'DEX', 'DeFi'] },
  { label: 'infrastructure', items: ['AWS', 'GCP', 'Kubernetes', 'Docker', 'RabbitMQ', 'Microservices', 'Event-Driven Architecture'] },
  { label: 'practices', items: ['CI/CD', 'SOLID', 'OOP', 'REST API Design', 'System Design'] },
];
