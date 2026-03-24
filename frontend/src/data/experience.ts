export interface ExperienceSection {
  title: string;
  highlights: string[];
}

export interface Experience {
  role: string;
  company: string;
  period: string;
  description: string;
  tech: string[];
  highlights: string[];
  sections?: ExperienceSection[];
}

export const experience: Experience[] = [
  {
    role: 'Backend Software Engineer',
    company: 'Crypto Wallet & Trading Platform',
    period: 'Jun 2023 — Apr 2026',
    description: 'Crypto wallet & trading platform',
    tech: ['Node.js', 'TypeScript', 'NestJS', 'PostgreSQL', 'Redis', 'RabbitMQ', 'Socket.io', 'AWS'],
    highlights: [],
    sections: [
      {
        title: 'General',
        highlights: [
          'Sole backend engineer — architected, built, and maintained the entire infrastructure of a decentralized crypto wallet',
          'Built multi-chain trading for Solana, Ethereum, BSC, Base, Tron, Ton, and Sui with custom RPC integrations',
          'Built blockchain indexers for live price feeds powering market and limit orders across all chains',
          'Developed algorithmic trading: Grid trading and Dip Buy strategies executing within 1-3 blocks',
          'Maintained order failure rate at <1% via monitoring, integrity checks, and real-time alerts',
          'Built TradingView charting widget backend for live price charts in-app',
          'Adopted AI-driven development: 3x faster delivery, 5x reduction in debugging time',
        ],
      },
      {
        title: 'Solana',
        highlights: [
          'Built Solana indexers on Yellowstone/Laserstream gRPC with <200ms full-path latency',
          'Custom transaction builder swapping directly in pool — 0-slot inclusion, median 1-2 slots',
          'Implemented Solana token account close feature that added 13% to project\'s pure revenue',
          'Integrated arbitrage and anti-MEV protection on Solana, increasing pure revenue by 9%',
        ],
      },
      {
        title: 'Product',
        highlights: [
          'Coordinated full Design → Frontend → Backend workflow with partners (Helius, Kolibrio)',
          'Active role in product design, feature scoping, and prioritization',
          'Monitored product channels, resolved user issues before they scaled',
        ],
      },
    ],
  },
  {
    role: 'Backend Developer',
    company: 'Ticket Service',
    period: 'Dec 2022 — May 2023',
    description: 'Global ticket marketplace',
    tech: ['Node.js', 'TypeScript', 'Express', 'AWS Serverless', 'DynamoDB'],
    highlights: [
      'Developed microservices for a global event ticket aggregation platform, enabling users to discover and purchase performance tickets across worldwide venues',
      'Maintained and improved legacy codebase while building new serverless services on AWS, conducted code reviews and ensured code quality standards',
    ],
  },
  {
    role: 'Backend / Fullstack Developer',
    company: 'NFT & E-commerce Projects',
    period: 'Mar 2021 — Dec 2022',
    description: 'Blockchain (ICP/NFT) & Analytics',
    tech: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'AWS Serverless', 'Shopify'],
    highlights: [
      'Built a backend middleware for an NFT-based product authenticity platform — receiving hi-res images, storing them on ICP blockchain, and generating certificates of authenticity as NFTs',
      'Developed serverless analytics dashboard for e-commerce merchants, integrating with Shopify Platform to provide granular user engagement insights',
    ],
  },
  {
    role: 'Backend Developer',
    company: 'AI Chatbot Service',
    period: 'Mar 2021 — Feb 2022',
    description: 'AI-powered customer service',
    tech: ['Python', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS Serverless'],
    highlights: [
      'Developed serverless backend in Python for an AI-powered customer service platform that automated responses using pre-trained ML models, improving agent efficiency',
      'Migrated legacy chatbot implementations to modern architecture and integrated with leading e-commerce platforms',
    ],
  },
  {
    role: 'Backend Developer',
    company: 'Kubernetes Cost Optimisation Platform',
    period: 'Apr 2020 — Mar 2021',
    description: 'Cloud cost management SaaS',
    tech: ['Golang', 'Node.js', 'TypeScript', 'Kubernetes', 'GCP', 'AWS', 'Azure', 'PostgreSQL'],
    highlights: [
      'Contributed to a cloud-native cost management platform used by large enterprises to monitor and optimize infrastructure spending across GCP, AWS, and Azure',
      'Implemented core features, wrote and optimized complex SQL queries, and worked directly with multi-cloud provider APIs and Kubernetes clusters',
    ],
  },
  {
    role: 'Junior Backend Developer',
    company: 'Various Projects',
    period: 'Nov 2018 — Mar 2020',
    description: 'Early career backend development',
    tech: ['Node.js', 'JavaScript', 'SQL'],
    highlights: [
      'Started professional career developing backend services and APIs, building foundational expertise in Node.js, relational databases, and server-side architecture',
    ],
  },
];
