# 🚀 NexaStream - Decentralized Video Platform v2.1 — Mainnet Live

## 🌐 nexastream.org | Blockchain Video Streaming DApp

![NexaStream](https://img.shields.io/badge/NexaStream-v2.1 — Mainnet Live-purple)
![Blockchain](https://img.shields.io/badge/NexaChain-PoW%2BPoS-blue)
![Token](https://img.shields.io/badge/NST-55M-Max-green)

---

## 📋 Overview

**NexaStream** is a next-generation **decentralized video platform** built on **NexaChain blockchain**, designed to compete with YouTube and TikTok while offering:

- ✅ **Blockchain Native** - PoW consensus, NST token (55M supply cap), solo validator live
- ✅ **Creator Economy 50/50** - Ledger implemented (idempotent, no float, audit trail)
- ✅ **Content-Addressed Storage** - SHA-256, S3-compatible adapter, local storage
- ✅ **WebRTC Signaling** - WebSocket signaling server with protocol validation
- ✅ **Auth** - bcrypt + JWT + refresh tokens, PostgreSQL migrations
- ✅ **Platform** - Feed, search, comments, likes, subscriptions, upload
- ✅ **Analytics** - Event-driven tracking, anti-fraud (risk score, Sybil detection)
- ✅ **P2P Delivery** - Segment integrity, peer manager, reputation
- ✅ **Monitoring** - MetricsCollector, AlertManager, Prometheus export
- ✅ **Security** - Fuzzing, load tests, disaster recovery, tamper detection
- ✅ **i18n** - 10 languages (EN, PT, ES, ZH, JA, FR, DE, HI, AR, RU)
- ✅ **Financial Dashboard** - NST balance, deposit/withdraw/swap, mining stats
- 🚧 **Multi-validator** - Architecture ready (tested 1→3→5), solo mode active
- 🚧 **External Audit** - Internal audit complete, external pending
- 🚧 **100% Decentralized** - Solo validator active, multi-validator architecture ready
- ✅ **AI-Powered** - Recommendation engine implemented (watch time, completion rate, engagement, recency, creator affinity)
- ✅ **Web3 Wallet Login** - SIWE (Sign-In With Ethereum) + EIP-6963 (500+ wallets) + MetaMask/Coinbase/Phantom/Trust/Binance/OKX
- ✅ **DAO Governance** - Implemented (proposals, voting, quorum, execution, double-vote prevention)
- ✅ **NFTs** - Implemented (mint, transfer, query, collections, royalties)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXASTREAM STACK                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   FRONTEND  │    │   BACKEND   │    │  NEXACHAIN  │             │
│  │   Next.js   │    │   Node.js   │    │   (Go)      │             │
│  │   React     │◄──►│   Express   │◄──►│   Blockchain │             │
│  │   Web3.js   │    │   Redis     │    │             │             │
│  │   IPFS      │    │   WebSocket │    │             │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│         │                  │                  │                      │
│         └──────────────────┼──────────────────┘                    │
│                            ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    INFRASTRUCTURE                           │  │
│  │  • Cloudflare (CDN, DDoS, SSL)                           │  │
│  │  • Supabase (PostgreSQL, Auth, Storage)                  │  │
│  │  • Docker & Kubernetes (Orchestration)                     │  │
│  │  • Redis (Cache, Sessions)                                 │  │
│  │  • MinIO (S3-compatible storage)                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⛓️ NexaChain - Hybrid PoW + PoS Blockchain

### Token: NST (NexaStream Token)

| Property | Value |
|----------|-------|
| **Name** | NexaStream Token |
| **Symbol** | NST |
| **Max Supply** | 55,000,000 NST |
| **Standard** | ERC-20 / Native |
| **Blockchain** | NexaChain |
| **Consensus** | Hybrid PoW + PoS |
| **Block Time** | 3 seconds (PoS) / 60 seconds (PoW) |
| **Chain ID** | 1010101 |

### Token Allocation

| Category | Percentage | Amount |
|----------|------------|--------|
| Ecosystem | 50% | 27,500,000 NST |
| Rewards | 30% | 16,500,000 NST |
| Team | 10% | 5,500,000 NST |
| Public Sale | 5% | 2,750,000 NST |
| Liquidity | 5% | 2,750,000 NST |

### Consensus Mechanism

```
┌─────────────────────────────────────────────────────────────┐
│                  NEXACHAIN CONSENSUS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   PoW Blocks (10%)          PoS Blocks (90%)               │
│   ───────────────           ────────────────                │
│   • Mining reward: 10 NST   • Validator reward: 2 NST      │
│   • Every 10th block        • 3-second blocks              │
│   • High security           • High throughput              │
│                                                              │
│   Min Stake: 100 NST       APY: 12.5%                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎬 Platform Features (200+)

### Core Video Features
- ✅ 4K/8K Streaming
- ✅ Adaptive Bitrate
- ✅ Shorts (15-60 seconds)
- ✅ Long-form (up to 4 hours)
- ✅ Live Streaming
- ✅ Premiere (scheduled releases)
- ✅ Podcasts
- ✅ Playlists & Series
- ✅ Video chapters

### Web3/Blockchain Features
- ✅ MetaMask/WalletConnect Login
- ✅ NST Token Rewards
- ✅ Staking (12.5% APY)
- ✅ DAO Governance
- ✅ NFT Marketplace
- ✅ Video NFTs
- ✅ Cross-chain Bridge
- ✅ DeFi Integration

### Monetization
- ✅ Ad Revenue (50% creator share)
- ✅ Subscriptions
- ✅ Tips & Super Chats
- ✅ NFT Sales
- ✅ Course Sales
- ✅ Crowdfunding
- ✅ Affiliate Program

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Web3**: wagmi, viem, WalletConnect
- **State**: TanStack Query

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: PostgreSQL + Redis
- **Storage**: S3/MinIO + IPFS
- **CDN**: Cloudflare

### Blockchain
- **Language**: Go 1.21
- **Consensus**: Hybrid PoW + PoS
- **Smart Contracts**: Solidity 0.8.20
- **Standards**: ERC-20, ERC-721, ERC-1155

### Infrastructure
- **Container**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18+
Go 1.21+
Docker & Docker Compose
Git
```

### Installation

```bash
# Clone repository
git clone https://github.com/Railancosta/nexastream.git
cd nexastream

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install

# Install blockchain dependencies
cd ../nexachain && go mod download

# Install contract dependencies
cd ../contracts && npm install
```

### Run Development

```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: NexaChain Node
cd nexachain && go run cmd/nexachain/main.go
```

### Docker Deployment

```bash
docker-compose up -d
```

---

## 🌐 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Backend (Railway)
```bash
cd backend
railway up
```

### NexaChain Node
```bash
cd nexachain
go build -o nexachain ./cmd/nexachain
./nexachain
```

---

## 📁 Project Structure

```
nexastream/
├── frontend/                 # Next.js 14 app
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities
│   └── public/             # Static assets
│
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, security
│   │   ├── models/         # Database models
│   │   └── services/       # Business logic
│   └── Dockerfile
│
├── nexachain/              # Go blockchain
│   ├── cmd/                # CLI commands
│   ├── core/               # Blockchain core
│   ├── api/                # RPC API
│   ├── p2p/                # Networking
│   └── wallet/             # Wallet management
│
├── contracts/               # Solidity contracts
│   ├── NSTToken.sol       # Main token
│   ├── NSTStaking.sol     # Staking contract
│   ├── NSTRewards.sol      # Rewards distribution
│   └── NFT/                # NFT marketplace
│
├── nexastream/             # Alternative frontend
│   └── src/
│
├── docker/                 # Docker configs
├── k8s/                    # Kubernetes manifests
└── scripts/                # Deployment scripts
```

---

## 🔐 Security

| Feature | Implementation |
|---------|----------------|
| **Authentication** | OAuth 2.0, JWT, Web3 Wallet |
| **Password** | bcrypt with cost 12 |
| **MFA** | TOTP (Google Authenticator) |
| **TLS/SSL** | TLS 1.3 |
| **DDoS Protection** | Cloudflare WAF |
| **Rate Limiting** | Redis-based |
| **Data Encryption** | AES-256 |
| **GDPR/LGPD** | Full compliance |

---

## 📊 Tokenomics

### Revenue Distribution

```
┌─────────────────────────────────────────────────────────┐
│              REVENUE DISTRIBUTION                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Advertisers/Users                                     │
│        │                                                │
│        ▼                                                │
│   ┌─────────────────────────────────────────┐          │
│   │      NEXASTREAM PLATFORM               │          │
│   └─────────────────────────────────────────┘          │
│        │                                                │
│        ├─── 50% ──► Content Creators                    │
│        │                                              │
│        └─── 50% ──► Platform Treasury                  │
│                     ├── Infrastructure (20%)           │
│                     ├── Development (15%)             │
│                     ├── Marketing (10%)                 │
│                     └── Staking Rewards (5%)             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Reward Actions

| Action | Reward |
|--------|--------|
| Upload Video | 10 NST |
| 1000 Views | 5 NST |
| Like | 0.1 NST |
| Comment | 0.5 NST |
| Share | 1 NST |
| Subscribe | 2 NST |
| Live Stream | 20 NST/hour |

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Website** | https://nexastream.org |
| **GitHub** | https://github.com/Railancosta/nexastream |
| **Docs** | https://docs.nexastream.org |
| **Explorer** | https://explorer.nexastream.org |
| **RPC** | https://rpc.nexastream.org |
| **Discord** | https://discord.gg/nexastream |

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 👥 Team

- **Rilan Costa** - Founder & Lead Developer
- [GitHub](https://github.com/Railancosta)
- [Twitter](https://twitter.com/railancosta)

---

**Built with ❤️ for the decentralized future**

**NexaStream v2.1 — Mainnet Live** - nexastream.org
