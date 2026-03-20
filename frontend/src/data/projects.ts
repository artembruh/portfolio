export interface Project {
  name: string;
  description: string;
  tech: string[];
  githubUrl?: string;
  liveUrl?: string;
}

export const projects: Project[] = [
  {
    name: 'portfolio',
    description: 'Real-time blockchain explorer with WebSocket trace',
    tech: ['NestJS', 'React', 'Socket.IO', 'ethers.js'],
    githubUrl: 'https://github.com/example/portfolio',
    liveUrl: 'https://artembratchenko.com',
  },
  {
    name: 'trading-engine',
    description: 'High-throughput order matching engine',
    tech: ['Go', 'gRPC', 'Redis', 'PostgreSQL'],
    githubUrl: 'https://github.com/example/trading-engine',
  },
  {
    name: 'chain-indexer',
    description: 'Multi-chain event indexer with real-time sync',
    tech: ['TypeScript', 'ethers.js', 'PostgreSQL', 'Docker'],
    githubUrl: 'https://github.com/example/chain-indexer',
  },
];
