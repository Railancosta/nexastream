# NexaStream Decentralized Architecture

## Overview

NexaStream is a decentralized video platform where infrastructure is formed by the network's own participants. No single cloud provider is required.

## Core Principles

### 1. Zero Paid Cloud
- No mandatory AWS, GCP, Azure, EKS, GKE
- No mandatory Railway, Vercel, Supabase
- Any machine can become a node:
  - Personal computer
  - VPS
  - Raspberry Pi
  - NAS
  - Server
  - Android + Termux

### 2. Distributed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NEXASTREAM P2P NETWORK                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐                                               │
│   │BLOCKCHAIN│  ← NexaChain (PoW + PoS)                    │
│   └────┬─────┘                                               │
│        │                                                     │
│  ┌─────┴─────┬─────────────┐                               │
│  │           │             │                                │
│VALIDATOR  VALIDATOR     MINER                              │
│  │           │             │                                │
│  └─────┬─────┴─────────────┘                                │
│        │                                                     │
│   ┌────┴────┐                                               │
│   │  LIBP2P │  ← P2P Network Layer                          │
│   └────┬────┘                                               │
│        │                                                     │
│  ┌─────┴──────┬───────────┬──────────┐                     │
│  │            │           │          │                      │
│STORAGE      CACHE      VIDEO     LIVE                       │
│NODE         NODE       NODE     STREAM                       │
│  │            │           │          │                      │
│  └─────┬──────┴───────────┴──────────┘                     │
│        │                                                     │
│   ┌────┴────┐                                               │
│   │  USERS  │  ← Content Consumers & Contributors            │
│   └─────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

## Network Components

### Blockchain (NexaChain)

- **Consensus**: Hybrid PoW + PoS
- **Token**: NST (NexaStream Token)
- **Max Supply**: 55,000,000 NST
- **Protocol**: Custom, self-hosted

### P2P Layer (libp2p)

- Peer identity
- Peer discovery
- DHT for content routing
- NAT traversal
- Relay
- Secure transport

### Storage Layer

- **IPFS/Kubo**: Content-addressed storage
- **Content ID (CID)**: Each video has cryptographic identifier
- **Replication**: Multiple nodes store content chunks
- **Minimum Replicas**: Configurable (default: 3)

### Video Delivery

- P2P chunk distribution
- Cooperative caching
- WebRTC for live streaming
- Peer-assisted delivery

## Node Types

### 1. Full Node
```bash
nexastream-node full
```
Functions:
- Blockchain consensus
- P2P networking
- Storage
- Indexing
- Relay

### 2. Validator Node
```bash
nexastream-node validator
```
Functions:
- PoS validation
- Transaction processing
- Block production (PoS)

### 3. Miner Node
```bash
nexastream-node miner
```
Functions:
- PoW mining
- Block production (PoW)

### 4. Storage Node
```bash
nexastream-node storage
```
Functions:
- Store video chunks
- Announce capacity
- Respond to retrieval requests
- Prove availability

### 5. Creator Node
```bash
nexastream-node creator
```
Functions:
- Video upload
- Storage contribution
- Bandwidth contribution
- Live relay

### 6. Light Node
```bash
nexachain-node light
```
Functions:
- Basic wallet
- View content
- Participate in network

## Storage Architecture

### Content Addressing

```
Video File
    ↓
Chunking (e.g., 1MB chunks)
    ↓
Hash each chunk → CID
    ↓
Distribute CIDs across network
    ↓
Multiple nodes store chunks
```

### Replication Protocol

```
VIDEO UPLOAD
     ↓
CID Generated
     ↓
REPLICATION REQUEST
     ↓
AVAILABLE STORAGE NODES
     ↓
CHUNKS DISTRIBUTED
     ↓
REPLICA COUNT TRACKED
     ↓
If replicas < minimum:
     ↓
REPLICATE MORE
```

### Availability Score

Real-time calculation:
```
Availability = f(replicas_online, total_replicas, uptime)
```

## P2P Discovery

### Bootstrap Nodes
Multiple independent bootstrap nodes:
- `bootstrap-1.nexastream.org:30303`
- `bootstrap-2.nexastream.org:30303`
- `bootstrap-3.nexastream.org:30303`

### Discovery Methods
1. Bootstrap peers
2. DHT discovery
3. Peer exchange
4. mDNS (local network)
5. Rendezvous points

## Domain Configuration

### Official Domain
**https://nexastream.org/**

### Subdomains (when real services exist)
| Subdomain | Service | Status |
|-----------|---------|--------|
| nexastream.org | Frontend Gateway | REAL |
| rpc.nexastream.org | Blockchain RPC | TODO |
| ipfs.nexastream.org | IPFS Gateway | TODO |
| explorer.nexastream.org | Block Explorer | TODO |
| docs.nexastream.org | Documentation | TODO |

## Economic Model

### Revenue Split (50/50)
When real revenue exists:
- **50%** → Creators
- **50%** → Platform Treasury

### NST Token
- **Max Supply**: 55,000,000 NST
- **No arbitrary minting**
- **All emission via consensus rules**

## Self-Hosting Guide

### Prerequisites
```bash
# Any Linux system
docker --version
git
```

### Run Full Node
```bash
git clone https://github.com/Railancosta/nexastream
cd nexastream/nexachain

# Build
go build -o nexachain ./cmd/nexachain

# Run
CHAIN_ID=nexastream-mainnet \
IS_VALIDATOR=true \
./nexachain
```

### Run Storage Node
```bash
nexachain-node storage \
  --storage-path /data/nexastream \
  --min-replicas 3
```

### Docker Deployment
```bash
cd nexastream/docker
docker compose -f docker-compose.zero-cloud.yml up -d
```

## Resilience

### Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| 1 bootstrap offline | Network discovers other peers |
| 50% nodes offline | Network continues if quorum met |
| Domain offline | P2P network continues |
| Storage node offline | Content retrieved from replicas |

## Current Status

🟡 **UNDER DEVELOPMENT**

| Component | Status |
|-----------|--------|
| Blockchain Core | ✅ Compiling |
| P2P Networking | ✅ Basic libp2p |
| IPFS Integration | ✅ Container Running |
| Consensus (PoW+PoS) | ⚠️ Needs Testing |
| Multi-Node P2P | ⚠️ Needs Setup |
| Real Video Storage | ⚠️ Needs Test |
| Mainnet | ❌ NOT LIVE |

## Transparency

**DO NOT trust:**
- "Mainnet Live" claims without block verification
- "Decentralized" without multiple independent nodes
- "X validators" without peer IDs
- Token prices without real trading
- User counts without verification

**DO trust:**
- Source code you can audit
- Running nodes you can connect to
- Block explorers with real data
- Verified transaction history

## Contributing

1. Run a node
2. Test P2P connectivity
3. Report issues
4. Submit improvements

## Links

- Website: https://nexastream.org/
- GitHub: https://github.com/Railancosta/nexastream
- Documentation: Coming soon

---

**Remember**: A decentralized network is only as decentralized as its participants. Run a node!
