export interface Experience {
  role: string;
  company: string;
  period: string;
  description: string;
  tech: string[];
  highlights: string[];
}

export const experience: Experience[] = [
  {
    role: 'Backend Software Engineer',
    company: 'Crypto Wallet & Trading Platform',
    period: 'Jun 2023 — Apr 2026',
    description: 'Crypto wallet & trading platform',
    tech: ['Node.js', 'TypeScript', 'NestJS', 'PostgreSQL', 'Redis', 'RabbitMQ', 'Socket.io', 'AWS'],
    highlights: [
      'Sole backend engineer — architected, built, and maintained the entire backend infrastructure',
      'Built multi-chain trading for Solana, Ethereum, BSC, Base, Tron, Ton, and Sui',
      'Designed blockchain indexers for live price feeds enabling market and limit orders',
      'Built Solana indexers on Yellowstone/Laserstream gRPC with <200ms full-path latency',
      'Achieved 0-slot inclusion speed with custom transaction builder',
      'Kept order failure rate at <1% through proactive monitoring and real-time alerts',
    ],
  },
  {
    role: 'Backend Developer',
    company: 'Ticket Service',
    period: 'Dec 2022 — May 2023',
    description: 'Global ticket marketplace',
    tech: ['Node.js', 'TypeScript', 'Express', 'AWS Serverless', 'DynamoDB'],
    highlights: [
      'Developed microservices for a global event ticket aggregation platform',
      'Maintained legacy codebase while building new serverless services on AWS',
    ],
  },
  {
    role: 'Backend / Fullstack Developer',
    company: 'NFT & E-commerce Projects',
    period: 'Mar 2021 — Dec 2022',
    description: 'Blockchain (ICP/NFT) & Analytics',
    tech: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'AWS Serverless', 'Shopify'],
    highlights: [
      'Built backend middleware for an NFT-based product authenticity platform on ICP blockchain',
      'Developed serverless analytics dashboard integrating with Shopify Platform',
    ],
  },
  {
    role: 'Backend Developer',
    company: 'AI Chatbot Service',
    period: 'Mar 2021 — Feb 2022',
    description: 'AI-powered customer service',
    tech: ['Python', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS Serverless'],
    highlights: [
      'Developed serverless backend for AI-powered customer service platform with pre-trained ML models',
      'Migrated legacy chatbot implementations to modern architecture',
    ],
  },
  {
    role: 'Backend Developer',
    company: 'Kubernetes Cost Optimisation Platform',
    period: 'Apr 2020 — Mar 2021',
    description: 'Cloud cost management SaaS',
    tech: ['Golang', 'Node.js', 'TypeScript', 'Kubernetes', 'GCP', 'AWS', 'Azure', 'PostgreSQL'],
    highlights: [
      'Contributed to cloud-native cost management platform for large enterprises',
      'Implemented core features and optimized complex SQL queries across multi-cloud APIs',
    ],
  },
  {
    role: 'Junior Backend Developer',
    company: 'Various Projects',
    period: 'Nov 2018 — Mar 2020',
    description: 'Early career backend development',
    tech: ['Node.js', 'JavaScript', 'SQL'],
    highlights: [
      'Built backend services and APIs, building foundational expertise in Node.js and relational databases',
    ],
  },
];
