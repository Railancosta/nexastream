# NexaStream - The Decentralized Video Network

<p align="center">
  <img src="https://nexastream.org/logo.png" alt="NexaStream" width="200"/>
</p>

<p align="center">
  <strong>Your videos. Your network. Your ownership.</strong>
</p>

<p align="center">
  <a href="https://nexastream.org">Website</a> •
  <a href="https://github.com/Railancosta/nexastream">GitHub</a> •
  <a href="./docs/PROTOCOL_SPEC.md">Protocol</a> •
  <a href="./docs/CREATOR-ECONOMY.md">Creator Economy</a>
</p>

---

## ⚠️ Current Status

🟡 **DEVELOPMENT IN PROGRESS**

NexaStream is currently under development. The following are NOT yet live:

- ❌ Mainnet blockchain
- ❌ P2P network (live nodes)
- ❌ Real video storage
- ❌ Real revenue
- ❌ Real payments

**Do NOT trust any website claiming to be the "live NexaStream mainnet" until this notice is removed.**

---

## 🎯 What We Are Building

NexaStream is building a **truly decentralized video platform** with:

- **No paid cloud dependencies** (no AWS, GCP, Azure, Vercel, Railway)
- **P2P content distribution** using IPFS and libp2p
- **Own blockchain** (NexaChain) with NST token
- **50/50 creator revenue split** (when real revenue exists)
- **Self-hostable nodes** on any hardware

---

## 🏗️ Architecture

```
                         NEXASTREAM P2P NETWORK
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
         BLOCKCHAIN             P2P NETWORK          STORAGE
              │                     │                     │
    ┌─────────┼─────────┐    ┌─────┼─────┐      ┌───────┼───────┐
    │         │         │    │     │     │      │       │       │
VALIDATORS MINERS  RPC   DHT  CACHE VIDEO  INDEXER IPFS   NODES
```

### Key Components

| Component | Technology | Status |
|-----------|------------|--------|
| Blockchain | Go (custom) | In Progress |
| P2P Network | libp2p | In Progress |
| Content Storage | IPFS/Kubo | In Progress |
| Video Streaming | HLS/WebRTC | Planned |
| Frontend | Next.js | In Progress |
| Database | PostgreSQL (self-hosted) | Available |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- 4GB RAM minimum

### Run Local Network

```bash
# Clone the repository
git clone https://github.com/Railancosta/nexastream
cd nexastream

# Start zero-cloud environment
docker-compose -f docker/docker-compose.zero-cloud.yml up

# Access:
# - Frontend: http://localhost:3000
# - IPFS API: http://localhost:5001
# - IPFS Gateway: http://localhost:8080
# - Blockchain RPC: http://localhost:26657
```

### Run Individual Node

```bash
# Build NexaChain node
cd nexachain
go build -o nexachain ./cmd/nexachain

# Run node
./nexachain --chain-id=nexastream-local --p2p.port=30303
```

---

## 📋 Zero-Cloud Philosophy

NexaStream is designed to run WITHOUT:

| ❌ NOT Required | ✅ Instead |
|----------------|------------|
| AWS S3 | IPFS + Local Storage |
| Vercel | Self-hosted Next.js |
| Railway | Self-hosted Backend |
| Supabase | PostgreSQL (local) |
| Cloudflare | Self-hosted CDN |
| AWS/GCP/Azure | Any VPS or local hardware |

### Run on Anything

- 🖥️ Desktop computer
- 💻 Laptop
- 🛒 Raspberry Pi
- 📱 Android + Termux
- 🏢 Server
- ☁️ Any VPS provider
- 🏫 University machines
- 🏠 Home NAS

---

## 💰 Tokenomics

| Token | NST |
|-------|-----|
| Name | NexaStream Token |
| Symbol | NST |
| Max Supply | 55,000,000 |
| Consensus | PoW + PoS Hybrid |

### Token Distribution

```
50% Ecosystem (27,500,000 NST)
30% Rewards (16,500,000 NST)
10% Team (5,500,000 NST)
5% Public Sale (2,750,000 NST)
5% Liquidity (2,750,000 NST)
```

---

## 👥 Creator Economy

**50/50 Revenue Split** (when real revenue exists)

```
TOTAL REVENUE
     │
     ├── 50% → CREATORS (based on verified metrics)
     │
     └── 50% → PLATFORM TREASURY
```

**Anti-Fraud Measures**:
- Bot detection
- View verification
- Sybil attack prevention
- No fake metrics

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PROTOCOL_SPEC.md](./docs/PROTOCOL_SPEC.md) | Technical protocol specification |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture |
| [CREATOR-ECONOMY.md](./docs/CREATOR-ECONOMY.md) | Revenue sharing policy |
| [TOKENOMICS.md](./docs/TOKENOMICS.md) | NST tokenomics |
| [DECENTRALIZED-GOALS.md](./docs/DECENTRALIZED-GOALS.md) | Decentralization roadmap |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⚖️ License

This project is licensed under the terms included in [LICENSE.md](./LICENSE.md).

---

## 🔗 Links

- **Website**: https://nexastream.org
- **GitHub**: https://github.com/Railancosta/nexastream
- **Documentation**: https://github.com/Railancosta/nexastream/tree/main/docs

---

## ⚠️ Disclaimer

**This is experimental software. Use at your own risk.**

- No warranties about functionality
- No guarantees about uptime
- No promises about data persistence
- No financial advice

**Never invest more than you can afford to lose.**

---

<p align="center">
  Built with ❤️ by the NexaStream community
</p>
