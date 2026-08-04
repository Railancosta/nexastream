# 🌟 NexaStream - Decentralized Video Platform

![NexaStream Banner](https://img.shields.io/badge/NexaStream-Decentralized%20Video-0ea5e9?style=for-the-badge&logo=blockchain&logoColor=white)

**NexaStream** is the next-generation video platform powered by blockchain technology. Create, share, and earn cryptocurrency while watching content.

## 🚀 Features

### 🎬 For Viewers
- Watch videos from creators worldwide
- Earn $NEXA tokens for engagement
- Support favorite creators directly
- Live streaming capabilities
- Short-form and long-form content

### 💰 For Creators
- **50% of platform revenue** goes to content creators
- Direct cryptocurrency payments
- Transparent engagement metrics
- Verified creator program
- Viral content bonuses

### ⛓️ NexaChain Blockchain
- **Hybrid PoW/PoS Consensus**: Best of both worlds
- **Low fees**: $0.001 per transaction
- **High throughput**: Thousands of TPS
- **EVM Compatible**: Run any Solidity contract

### 🪙 $NEXA Token
- Total Supply: **1 Billion NEXA**
- 50% Creator Rewards Pool
- 50% Platform Treasury
- Staking rewards
- Governance participation

## 🏗️ Project Structure

```
nexastream/
├── nexachain/           # NexaChain Blockchain (Go)
│   ├── nexachain.go     # Main blockchain implementation
│   └── contracts/        # Solidity smart contracts
│       ├── NEXAToken.sol
│       ├── RewardsDistribution.sol
│       └── Staking.sol
├── frontend/            # NexaStream Web App (Next.js)
│   ├── src/
│   │   ├── app/         # Next.js App Router
│   │   └── components/  # React components
│   └── package.json
└── docs/               # Documentation
```

## 🛠️ Quick Start

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`

### Run NexaChain Node

```bash
cd nexachain
go run nexachain.go
```

## 📦 Deploy to Production

### Option 1: Deploy Frontend to IPFS (Recommended)

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Upload to IPFS via Pinata:
```bash
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "pinata_api_key: YOUR_API_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET" \
  -F "file=@./out"
```

3. Get the CID and configure DNSLink

### Option 2: Deploy to Vercel

```bash
cd frontend
npm install -g vercel
vercel
```

### Option 3: Deploy to Cloudflare Pages

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `out`

## 🔗 Domain Configuration (nexastream.org)

### Step 1: Configure DNS

Add these DNS records in GoDaddy:

| Type | Name | Value |
|------|------|-------|
| CNAME | www | cname.cloudflare.com |
| TXT | _dnslink | dnslink=/ipfs/YOUR_CID |

### Step 2: Set up Cloudflare (Recommended)

1. Add nexastream.org to Cloudflare
2. Update nameservers in GoDaddy
3. Enable SSL/TLS (Full)
4. Configure Page Rules for IPFS

## 📊 Tokenomics

```
Total Supply: 1,000,000,000 NEXA

├── Creator Rewards Pool (50%)
│   └── 500,000,000 NEXA
│       └── Distributed over 4 years
│
├── Platform Treasury (50%)
│   └── 500,000,000 NEXA
│       └── Operations, development, marketing
│
└── Transaction Fees
    ├── 50% → Creator Rewards
    ├── 30% → Staking Rewards
    └── 20% → Burn
```

## ⛓️ NexaChain Specifications

### Consensus: Hybrid PoW/PoS

| Feature | PoW | PoS |
|---------|-----|-----|
| Block Time | 60s | 5s |
| Reward | 10 NEXA | 5 NEXA |
| Energy | High | Low |
| Security | High | High |

### Network Parameters

- **Difficulty (PoW)**: 4 leading zeros
- **Min Stake**: 1,000 NEXA
- **Transaction Fee**: 0.1%
- **Block Size**: Up to 100 transactions

## 🔐 Smart Contracts

### NEXAToken.sol
ERC-20 token with deflation mechanism and fee distribution.

### RewardsDistribution.sol
Manages creator rewards, engagement metrics, and viral bonuses.

### Staking.sol
Stake NEXA to earn rewards and participate in governance.

## 📈 Roadmap

- [x] MVP Frontend
- [x] NexaChain PoW/PoS Consensus
- [x] $NEXA Token Contracts
- [x] DAO Governance
- [x] NFT Marketplace Integration
- [ ] Mainnet Launch
- [ ] Mobile Apps (iOS/Android)
- [ ] Creator Verification Program

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🙏 Acknowledgments

- **OpenZeppelin** for secure smart contracts
- **RainbowKit** for wallet integration
- **Next.js** for the amazing framework
- **TailwindCSS** for styling

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- **Website**: https://nexastream.org
- **Documentation**: https://docs.nexastream.org
- **Discord**: https://discord.gg/nexastream
- **Twitter**: https://twitter.com/nexastream
- **Telegram**: https://t.me/nexastream

## 💬 Support

For questions and support:
- Email: support@nexastream.org
- Discord: Join our community

---

**Built with ❤️ by the NexaStream Team**

*Empowering creators. Decentralizing content. Revolutionizing video.*
