# NexaStream Architecture Documentation

## Version: 1.0.0
## Last Updated: 2024

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Blockchain Architecture](#5-blockchain-architecture)
6. [Storage Architecture](#6-storage-architecture)
7. [Streaming Architecture](#7-streaming-architecture)
8. [Infrastructure Architecture](#8-infrastructure-architecture)
9. [Security Architecture](#9-security-architecture)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Web       │  │   Mobile   │  │    CLI     │  │   Wallet    │     │
│  │   Browser   │  │   iOS/Android│ │   Tools    │  │   DApps    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CDN / EDGE LAYER                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Static     │  │  Video     │  │  API       │  │  Media     │     │
│  │  Assets     │  │  Content   │  │  Gateway   │  │  Cache     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                           Cloudflare / AWS CloudFront                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
        ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
        │     FRONTEND      │ │      BACKEND      │ │    BLOCKCHAIN     │
        │   (Next.js)       │ │   (Express.js)   │ │   (NexaChain)    │
        │   Port: 3000      │ │   Port: 3001     │ │   Port: 8545     │
        └───────────────────┘ └───────────────────┘ └───────────────────┘
                    │                   │                   │
                    └───────────┬───────┘                   │
                                ▼                           │
                    ┌───────────────────┐ ┌───────────────────┐
                    │     DATABASE       │ │    BLOCKCHAIN     │
                    │   PostgreSQL      │ │   Storage/P2P    │
                    │   Port: 5432     │ │                   │
                    └───────────────────┘ └───────────────────┘
                                │                   │
                                ▼                   ▼
                    ┌───────────────────┐ ┌───────────────────┐
                    │      REDIS        │ │  STORAGE LAYER    │
                    │   Cache/Sessions │ │   S3/MinIO       │
                    │   Port: 6379     │ │                   │
                    └───────────────────┘ └───────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js | 14.x |
| **Mobile** | React Native + Capacitor | 6.x |
| **Backend** | Express.js | 4.x |
| **Database** | PostgreSQL | 15.x |
| **Cache** | Redis | 7.x |
| **Blockchain** | Go (NexaChain) | 1.21+ |
| **Smart Contracts** | Solidity | 0.8.x |
| **Storage** | MinIO / S3 | Latest |
| **CDN** | Cloudflare | - |
| **Container** | Docker + Kubernetes | Latest |

---

## 2. Component Architecture

### 2.1 Project Structure

```
nexastream/
├── frontend/                 # Legacy static export frontend
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/     # React components
│   │   ├── lib/           # Utilities
│   │   └── pages/         # Pages Router pages (deprecated)
│   ├── public/            # Static assets
│   └── out/                # Static export output
│
├── nexastream/             # Main frontend application
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/     # UI components
│   │   ├── lib/           # Utilities & API
│   │   └── types/         # TypeScript types
│   └── ...
│
├── backend/                # Backend API server
│   ├── src/
│   │   ├── routes/        # Express routes
│   │   ├── middleware/     # Express middleware
│   │   ├── models/        # Data models
│   │   ├── services/      # Business logic
│   │   ├── blockchain/    # Blockchain integration
│   │   └── config/       # Configuration
│   ├── tests/             # Jest tests
│   └── ...
│
├── nexachain/              # NexaStream Blockchain
│   ├── api/               # RPC/API server
│   ├── cmd/               # CLI commands
│   ├── consensus/         # PoW/PoS consensus
│   ├── core/              # Blockchain core
│   ├── crypto/           # Cryptography
│   │   └── postquantum/   # Post-quantum crypto
│   ├── governance/        # DAO governance
│   ├── livestream/        # Live streaming
│   ├── nft/               # NFT marketplace
│   ├── p2p/              # P2P networking
│   ├── storage/           # Distributed storage
│   ├── streaming/         # Video streaming
│   └── wallet/            # Wallet system
│
├── contracts/              # Solidity smart contracts
│   ├── NSTToken.sol      # NST token
│   ├── NSTStaking.sol    # Staking contract
│   ├── NSTRewards.sol    # Rewards contract
│   └── NSTDAO.sol        # Governance contract
│
├── k8s/                   # Kubernetes manifests
│   ├── deployment.yaml    # Main deployment
│   └── monitoring.yaml    # Monitoring stack
│
├── docker/                 # Docker configs
├── scripts/               # Utility scripts
│   └── termux/           # Termux deployment scripts
├── docs/                   # Documentation
└── security/              # Security documentation
```

---

## 3. Frontend Architecture

### 3.1 App Router Structure (Main App: `/nexastream`)

```
nexastream/src/app/
├── layout.tsx           # Root layout
├── page.tsx             # Home page
├── providers.tsx        # Context providers
├── auth/
│   └── login/
│       └── page.tsx    # Login page
├── dashboard/
│   └── page.tsx       # User dashboard
├── upload/
│   └── page.tsx       # Video upload
├── wallet/
│   └── page.tsx       # Web3 wallet
├── channels/
│   └── page.tsx       # Channel management
├── globals.css          # Global styles
└── ...
```

### 3.2 Pages Router Structure (Legacy: `/frontend`)

```
frontend/src/
├── app/                 # App Router pages (new)
├── pages/               # Pages Router (deprecated)
│   ├── billing/
│   ├── channel/
│   ├── dashboard/
│   ├── explore/
│   ├── settings/
│   ├── studio/
│   └── watch/
├── components/         # Shared components
│   ├── VideoCard.tsx
│   ├── StatsBanner.tsx
│   ├── LiveSection.tsx
│   ├── TrendingSection.tsx
│   └── ...
└── lib/
    ├── api.ts          # API client
    ├── socket.js       # WebSocket client
    └── ...
```

### 3.3 State Management

| State Type | Solution |
|------------|----------|
| Global State | React Context / Zustand |
| Server State | TanStack Query |
| Form State | React Hook Form |
| URL State | Next.js Router |

---

## 4. Backend Architecture

### 4.1 API Routes

```
backend/src/routes/
├── api/
│   ├── users.js         # User management
│   ├── videos.js        # Video operations
│   ├── channels.js     # Channel management
│   ├── payments.js     # Payment processing
│   ├── streaming.js    # Streaming endpoints
│   ├── nft.js          # NFT operations
│   └── analytics.js     # Analytics
├── index.js             # Route aggregator
├── auth.js             # Authentication routes
├── blockchain.js       # Blockchain routes
├── comments.js         # Comments
├── feed.js             # Feed generation
├── likes.js            # Like operations
├── recommendations.js   # Recommendation engine
├── rewards.js          # Rewards system
├── search.js           # Search endpoints
├── stats.js            # Statistics
├── subscriptions.js    # Subscriptions
├── upload.js           # Video upload
├── videos.js           # Video management
└── wallet.js           # Wallet operations
```

### 4.2 Middleware Stack

```
Request
    │
    ▼
┌─────────────────┐
│  Rate Limiter   │ ← Protect against abuse
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Helmet.js     │ ← Security headers
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  CORS           │ ← Cross-origin requests
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Compression    │ ← Response compression
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Body Parser    │ ← Request body parsing
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Input Sanitize │ ← XSS prevention
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  JWT Auth       │ ← Authentication
└─────────────────┘
    │
    ▼
    Route Handler
```

---

## 5. Blockchain Architecture

### 5.1 NexaChain Components

```
nexachain/
├── core/
│   ├── blockchain.go     # Block & state management
│   └── consensus.go      # Hybrid PoW/PoS
│
├── crypto/
│   ├── crypto.go        # ECDSA signatures
│   └── postquantum/     # CRYSTALS-Dilithium
│
├── wallet/
│   └── wallet.go        # Wallet management
│
├── p2p/
│   └── server.go        # Peer-to-peer networking
│
├── storage/
│   └── distributed_storage.go  # P2P storage
│
├── streaming/
│   └── streaming.go     # Video streaming
│
├── livestream/
│   └── livestream.go   # Live streaming
│
├── nft/
│   └── marketplace.go   # NFT marketplace
│
├── governance/
│   └── governance.go   # DAO governance
│
└── api/
    └── server.go        # RPC server
```

### 5.2 Consensus Mechanism

```
┌────────────────────────────────────────────────────────┐
│              HYBRID CONSENSUS                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│   BLOCK PATTERN:                                       │
│   Block 1-9:  Proof of Stake (PoS)                     │
│   Block 10:  Proof of Work (PoW)                       │
│                                                        │
│   PoW Block (60s):                                    │
│   ┌─────────────────────────────────────────────┐    │
│   │  • Secure the network                        │    │
│   │  • Mining reward: 10 NST                    │    │
│   │  • Higher difficulty                      │    │
│   └─────────────────────────────────────────────┘    │
│                                                        │
│   PoS Block (3s):                                     │
│   ┌─────────────────────────────────────────────┐    │
│   │  • Fast finality                           │    │
│   │  • Validator reward: 2 NST                │    │
│   │  • Low latency                            │    │
│   └─────────────────────────────────────────────┘    │
│                                                        │
│   VALIDATOR SELECTION:                                  │
│   Weighted random by stake amount                       │
│                                                        │
│   SLASHING CONDITIONS:                                 │
│   • Double signing: -5% stake                        │
│   • Unavailability: Reputation penalty                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 5.3 Post-Quantum Cryptography

```
┌────────────────────────────────────────────────────────┐
│           POST-QUANTUM SECURITY LAYER                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│   SIGNATURE ALGORITHMS:                                │
│   ┌─────────────────────────────────────────────┐   │
│   │  ECDSA-P256     │  128-bit  │ Classical     │   │
│   │  ECDSA-P384     │  192-bit  │ Classical     │   │
│   │  Dilithium2     │  128-bit  │ Post-Quantum │   │
│   │  Dilithium3     │  192-bit  │ Post-Quantum │   │
│   │  Dilithium5     │  256-bit  │ Post-Quantum │   │
│   │  Hybrid         │  256-bit  │ Both         │   │
│   └─────────────────────────────────────────────┘   │
│                                                        │
│   KEY EXCHANGE:                                        │
│   ML-KEM (Kyber) 512/768/1024                        │
│                                                        │
│   DEFAULT: Hybrid ECDSA-P256 + Dilithium3               │
│   SECURITY LEVEL: 256-bit                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 6. Storage Architecture

### 6.1 Distributed Storage Layer

```
┌─────────────────────────────────────────────────────────┐
│           NEXASTREAM STORAGE LAYER                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  VIDEO FRAGMENTATION:                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │  Original Video (100 MB)                          │  │
│  │        │                                         │  │
│  │        ▼                                         │  │
│  │  ┌─────┬─────┬─────┬─────┬─────┐               │  │
│  │  │ 4MB │ 4MB │ 4MB │ 4MB │ ... │  Fragments  │  │
│  │  └─────┴─────┴─────┴─────┴─────┘               │  │
│  │        │                                         │  │
│  │        ▼                                         │  │
│  │  REPLICATION (5x)                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  Node 1: Fragment 1, 6, 11...           │  │  │
│  │  │  Node 2: Fragment 2, 7, 12...           │  │  │
│  │  │  Node 3: Fragment 3, 8, 13...           │  │  │
│  │  │  Node 4: Fragment 4, 9, 14...           │  │  │
│  │  │  Node 5: Fragment 5, 10, 15...           │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  INTEGRITY:                                             │
│  • SHA256 checksums for each fragment                  │
│  • Reed-Solomon encoding for recovery                  │
│  • Automatic re-replication on node failure            │
│                                                          │
│  SCALABILITY:                                          │
│  • Supports up to 30,000 storage nodes                │
│  • Geographic distribution                            │
│  • Reputation-based node selection                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Streaming Architecture

### 7.1 Video Pipeline

```
UPLOAD → VALIDATION → TRANSCODING → STORAGE → CDN → STREAMING
  │           │             │           │        │         │
  ▼           ▼             ▼           ▼        ▼         ▼
┌────┐    ┌────┐      ┌────┐    ┌────┐  ┌────┐   ┌────┐
│FFm│    │MIME│      │FFm│    │S3/ │  │CF │   │HLS │
│peg │    │Val │      │peg │    │Min │  │CDN│   │DAS │
└────┘    └────┘      └────┘    └────┘  └────┘   └────┘
```

### 7.2 Supported Resolutions

| Resolution | Width | Height | Bitrate |
|------------|-------|--------|---------|
| 144p | 256 | 144 | 400 kbps |
| 240p | 426 | 240 | 700 kbps |
| 360p | 640 | 360 | 1000 kbps |
| 480p | 854 | 480 | 2500 kbps |
| 720p | 1280 | 720 | 5000 kbps |
| 1080p | 1920 | 1080 | 8000 kbps |
| 1440p | 2560 | 1440 | 16000 kbps |
| 4K | 3840 | 2160 | 35000 kbps |
| 8K | 7680 | 4320 | 80000 kbps |

---

## 8. Infrastructure Architecture

### 8.1 Kubernetes Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    KUBERNETES CLUSTER                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │               INGRESS / LOAD BALANCER                │ │
│  └──────────────────────────────────────────────────┘ │
│                            │                             │
│         ┌─────────────────┼─────────────────┐            │
│         ▼                 ▼                 ▼            │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐        │
│   │Frontend  │     │ Backend  │     │ Blockchain│        │
│   │(3 pods) │     │(5 pods) │     │(3 pods) │        │
│   └──────────┘     └──────────┘     └──────────┘        │
│         │                 │                 │            │
│         └─────────────────┼─────────────────┘            │
│                           ▼                             │
│              ┌────────────────────┐                   │
│              │    DATA LAYER      │                   │
│              ├────────────────────┤                   │
│              │  PostgreSQL (HA)   │                   │
│              │  Redis Cluster     │                   │
│              │  MinIO Storage    │                   │
│              └────────────────────┘                   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │               MONITORING STACK                       │ │
│  │  Prometheus + Grafana + Alertmanager + Loki         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Service Endpoints

| Service | Internal | External |
|---------|----------|-----------|
| Frontend | ClusterIP | ingress |
| Backend API | ClusterIP | ingress |
| Blockchain RPC | ClusterIP | ingress |
| PostgreSQL | ClusterIP | None |
| Redis | ClusterIP | None |
| MinIO | ClusterIP | None |
| Prometheus | ClusterIP | ingress |
| Grafana | ClusterIP | ingress |

---

## 9. Security Architecture

### 9.1 Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  NETWORK LAYER:                                         │
│  • TLS 1.3 for all connections                        │
│  • Cloudflare WAF + DDoS protection                    │
│  • VPC/Network isolation                              │
│                                                          │
│  APPLICATION LAYER:                                     │
│  • JWT authentication                                  │
│  • Rate limiting (Redis-based)                        │
│  • Input validation + sanitization                    │
│  • Helmet.js security headers                         │
│                                                          │
│  DATA LAYER:                                           │
│  • AES-256 encryption at rest                          │
│  • PostgreSQL row-level security                       │
│  • Encrypted backups                                  │
│                                                          │
│  BLOCKCHAIN LAYER:                                     │
│  • Post-quantum signatures                            │
│  • Multi-sig for large transactions                  │
│  • Hardware wallet support                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Deployment Architecture

### 10.1 Environment Matrix

| Environment | Purpose | Deploy Trigger |
|-------------|---------|----------------|
| Development | Local testing | Manual |
| Staging | Pre-production | PR merge |
| Testnet | Blockchain testing | Release tag |
| Production | Mainnet | Manual approval |

### 10.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  PUSH → LINT → TEST → BUILD → SECURITY → DEPLOY        │
│    │       │      │      │         │         │         │
│    ▼       ▼      ▼      ▼         ▼         ▼         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│  │Git │ │ESL │ │Jest│ │Docker│ │Trivy│ │K8s │        │
│  │Hook│ │Lint│ │Test│ │Image│ │Scan │ │Apply│        │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘        │
│                                                          │
│  GATES:                                                 │
│  • All tests must pass                                  │
│  • No critical vulnerabilities                         │
│  • Manual approval for production                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix A: Port Reference

| Service | Port | Protocol |
|----------|------|----------|
| Frontend | 3000 | HTTP |
| Backend API | 3001 | HTTP |
| Blockchain RPC | 8545 | HTTP |
| Blockchain P2P | 30303 | TCP |
| Blockchain WS | 8546 | WebSocket |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |
| MinIO API | 9000 | HTTP |
| Prometheus | 9090 | HTTP |
| Grafana | 3001 | HTTP |

---

## Appendix B: Environment Variables

### Backend
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
BLOCKCHAIN_RPC=http://nexachain:8545
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://api.nexastream.org
NEXT_PUBLIC_WS_URL=wss://api.nexastream.org
NEXT_PUBLIC_CHAIN_ID=1
```

---

**Document Owner**: Architecture Team
**Last Updated**: 2024
