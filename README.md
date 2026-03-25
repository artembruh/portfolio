# Portfolio & Token Explorer

Personal portfolio and token explorer — a full-stack web app with real-time blockchain data across multiple chains.

**Live:** [artembratchenko.com](https://artembratchenko.com)

## Features

- **Token Lookup** — look up ERC-20 (Ethereum, Base, BSC) and SPL/Token-2022 (Solana) tokens by contract address. Returns name, symbol, decimals, and human-readable total supply.
- **DEX Pair Discovery** — fetches trading pairs from DexScreener API, filtered by liquidity and sorted by volume.
- **Real-Time Block Streaming** — WebSocket-based live block/slot updates per chain with average block time calculation.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | NestJS, TypeScript, Socket.IO |
| EVM | ethers.js v6 |
| Solana | @solana/kit, @metaplex-foundation/mpl-token-metadata-kit |
| Infra | Docker, Nginx, Let's Encrypt, Hetzner Cloud |

## Architecture

```
Browser ─── HTTPS ──→ Nginx ──→ NestJS (REST + WebSocket)
                        │              │
                        │         ┌────┴────┐
                        │         │ Adapters │
                        │         ├─────────┤
                        │         │ EVM     │──→ JSON-RPC / WebSocket
                        │         │ Solana  │──→ Solana RPC / Subscriptions
                        │         │ DexScreener │──→ REST API
                        │         └─────────┘
                        │
                        └──→ Static frontend (SPA)
```

- **Token lookup** and **block subscription** are separated by interface (`TokenLookup` / `BlockSubscriber`) following ISP.
- Chain-specific implementations are resolved through factory classes (`TokenLookupFactory` / `BlockSubscriberFactory`).
- DexScreener integration is a standalone service — failures return empty results without breaking the main flow.

## Getting Started

### Prerequisites

- Node.js 22
- Yarn 1.22+
- Docker (for production)

### Development

```bash
# Install dependencies
yarn install

# Start backend (from project root)
yarn workspace backend start:dev

# Start frontend (from project root)
yarn workspace frontend dev
```

The frontend dev server runs on `http://localhost:5173`, the backend on `http://localhost:3000`.

### Environment Variables

Copy `.env.example` to `.env` and fill in RPC endpoints:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `ETH_RPC_URL` | Ethereum HTTP RPC endpoint |
| `ETH_WS_URL` | Ethereum WebSocket RPC endpoint |
| `BASE_RPC_URL` | Base HTTP RPC endpoint |
| `BASE_WS_URL` | Base WebSocket RPC endpoint |
| `BSC_RPC_URL` | BSC HTTP RPC endpoint |
| `BSC_WS_URL` | BSC WebSocket RPC endpoint |
| `SOLANA_RPC_URL` | Solana HTTP RPC endpoint |
| `SOLANA_WS_URL` | Solana WebSocket RPC endpoint |
| `PORT` | Backend port (default: 3000) |

Public RPC endpoints are included in `.env.example` for quick start. For production, use provider-backed endpoints (Alchemy, Infura, etc.).

### Production

```bash
docker compose up -d --build
```

See [docs/DEPLOY.md](docs/DEPLOY.md) for the full deployment runbook (SSL, firewall, DNS, auto-renewal).

## API

### Token Info

```
GET /api/blockchain/:chain/token/:address
```

Returns token name, symbol, decimals, and total supply.

### DEX Pairs

```
GET /api/blockchain/:chain/token/:address/pairs
```

Returns trading pairs from DexScreener, filtered by minimum $3K liquidity, sorted by 24h volume.

### Block Updates (WebSocket)

Connect via Socket.IO and emit `subscribe_chain` with `{ chain: "ethereum" }` to receive `block_update` events.

## Supported Chains

| Chain | Token Standards |
|-------|---------------|
| Ethereum | ERC-20 |
| Base | ERC-20 |
| BSC | ERC-20 |
| Solana | SPL Token, Token-2022 |

## License

MIT
