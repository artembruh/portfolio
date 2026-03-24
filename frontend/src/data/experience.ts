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
          'Sole backend engineer responsible for the entire backend infrastructure of a decentralized crypto wallet — architecting, building, and maintaining all services end-to-end',
          'Built multi-chain trading functionality from the ground up for Solana, Ethereum, BSC, Base, Tron, Ton, and Sui with custom RPC integrations and native blockchain communication protocols',
          'Designed and implemented blockchain indexers for live price feeds enabling market and limit orders (price-based and mcap-based) across all supported chains',
          'Developed algorithmic trading features including Grid trading with granular configuration and Dip Buy strategies that execute within 1-3 blocks of price movement',
          'Kept order failure rate due to unknown errors at <1% through proactive monitoring, logging checks, database integrity validation, and real-time alerts',
          'Built backend for a TradingView charting widget, giving users the ability to view live price charts directly within the app',
          'Adopted AI-driven development workflow, achieving 3x faster feature delivery and 5x reduction in debugging time',
        ],
      },
      {
        title: 'Solana',
        highlights: [
          'Built Solana indexers on top of Yellowstone/Laserstream gRPC streams achieving <200ms full-path latency (receive → parse → calculate → write to DB)',
          'Implemented trading functionality using a custom transaction builder for efficiency and optimization, swapping directly in the pool — achieving 0-slot inclusion speed with a median of 1-2 slots',
          'Implemented Solana token account close feature that added 13% to project\'s pure revenue',
          'Integrated arbitrage and anti-MEV protection on Solana, increasing pure revenue by 9%',
        ],
      },
      {
        title: 'Product',
        highlights: [
          'Collaborated directly with partners and service providers (Helius, Kolibrio) and coordinated the full Design → Frontend → Backend development workflow',
          'Proactive position in product design and decisions — actively participating in feature scoping and prioritization',
          'Worked closely with support team to resolve user issues quickly, monitoring product channels to fix problems before they scaled',
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
