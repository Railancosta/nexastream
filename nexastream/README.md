# NexaStream - Next-Generation Democratic Video Platform

<p align="center">
  <img src="public/logo.svg" alt="NexaStream Logo" width="200"/>
</p>

<p align="center">
  <strong>Democratize Video. Earn from Day 1.</strong>
</p>

<p align="center">
  <a href="https://nexastream.io">Website</a> •
  <a href="https://docs.nexastream.io">Documentation</a> •
  <a href="https://discord.gg/nexastream">Discord</a> •
  <a href="https://twitter.com/nexastream">Twitter</a>
</p>

---

## 🎯 Overview

NexaStream is a next-generation video platform that combines Web3 blockchain technology with content creation to offer unprecedented monetization opportunities. Built on Ethereum mainnet, it provides instant USDC payouts, transparent algorithms, and community governance.

### Key Features

- 🚀 **Instant Monetization** - Earn from your first view, no subscriber requirements
- 💰 **80% Revenue Share** - Industry-leading creator earnings (vs 45% YouTube)
- ⚡ **Instant USDC Payouts** - Get paid immediately via Ethereum blockchain
- 🔒 **Maximum Security** - Smart contract audited, non-custodial wallet integration
- 🗳️ **Community Governance** - $NEXA token holders vote on platform decisions
- 📊 **Real-time Analytics** - Comprehensive dashboard for creators
- 🌐 **SEO Optimized** - Built-in search optimization and Google Analytics
- 🎨 **Modern UI/UX** - Beautiful, responsive design

## 🔗 Platform Owner Address

**USDC Payout Address (Ethereum Mainnet):**
```
0xa453B71A216a8A6608e79247B162df47B2770899
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Animations
- **RainbowKit** - Web3 wallet connection
- **Wagmi** - Ethereum interactions
- **React Query** - Data fetching

### Backend
- **Node.js** - Server runtime
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **AWS S3** - Video storage
- **CloudFront** - CDN distribution

### Blockchain
- **Solidity** - Smart contracts
- **Hardhat** - Development framework
- **Ethers.js** - Ethereum library
- **OpenZeppelin** - Security-first contracts

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL (or Docker)
- Redis (or Docker)
- Ethereum wallet (MetaMask)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/nexastream.git
cd nexastream
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

4. **Start infrastructure (using Docker)**
```bash
docker-compose up -d postgres redis
```

5. **Run the development server**
```bash
npm run dev
```

6. **Compile smart contracts (optional)**
```bash
npm run compile
```

### Environment Variables

See `.env.example` for all required environment variables:

```env
# Blockchain
NEXT_PUBLIC_ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID

# Platform
NEXT_PUBLIC_PLATFORM_OWNER=0xa453B71A216a8A6608e79247B162df47B2770899

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nexastream

# Auth
JWT_SECRET=your-secret-key
```

## 📁 Project Structure

```
nexastream/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Creator dashboard
│   │   ├── wallet/            # Wallet management
│   │   ├── channels/          # Channel browsing
│   │   ├── upload/            # Video upload
│   │   ├── login/             # Authentication
│   │   └── register/           # Registration
│   ├── components/            # React components
│   │   ├── ui/               # UI primitives
│   │   ├── layout/           # Layout components
│   │   ├── video/            # Video components
│   │   ├── auth/             # Auth components
│   │   ├── dashboard/        # Dashboard widgets
│   │   └── wallet/           # Wallet components
│   ├── lib/                   # Utilities
│   │   ├── blockchain/        # Web3 utilities
│   │   ├── auth/             # Auth utilities
│   │   ├── db/               # Database utilities
│   │   └── utils/            # Common utilities
│   └── types/                # TypeScript types
├── contracts/                 # Smart contracts
│   ├── NexaStreamCore.sol   # Main platform contract
│   └── NEXAToken.sol         # Governance token
├── public/                    # Static assets
└── ...config files
```

## 🔐 Smart Contracts

### NexaStreamCore.sol
Main platform contract handling:
- Creator earnings deposits
- USDC withdrawals
- Video boosting
- Fee management

### NEXAToken.sol
Governance token for:
- Platform voting
- Content boosting
- Premium features

### Deployment

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Deploy to Ethereum mainnet
npx hardhat run scripts/deploy.ts --network mainnet
```

## 🎨 Features

### For Creators
- [x] Video upload with custom thumbnails
- [x] Real-time earnings dashboard
- [x] USDC withdrawals to any wallet
- [x] Channel customization
- [x] Analytics and insights
- [x] Video boosting (paid promotion)

### For Viewers
- [x] Email/password authentication
- [x] Google OAuth sign-in
- [x] Web3 wallet connection
- [x] Subscription to channels
- [x] Watch history
- [x] Watch-to-earn ($NEXA)

### Platform
- [x] Ad revenue distribution
- [x] Creator verification
- [x] Content moderation
- [x] SEO optimization
- [x] Google Analytics integration
- [x] Email notifications
- [ ] Mobile apps (coming soon)

## 🔒 Security

- Non-custodial wallet integration
- Smart contract audits (OpenZeppelin)
- Rate limiting on all endpoints
- CSRF protection
- Input validation and sanitization
- Encrypted session management
- 2FA support

## 📊 Google Analytics Setup

1. Create a GA4 property at [Google Analytics](https://analytics.google.com)
2. Get your Measurement ID (G-XXXXXXXXXX)
3. Add to environment:
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

### AWS

- Use AWS Amplify or Elastic Beanstalk
- Configure CloudFront for video delivery
- Set up RDS PostgreSQL
- Use ElastiCache for Redis

### Docker

```bash
docker build -t nexastream .
docker run -p 3000:3000 nexastream
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for secure smart contracts
- [RainbowKit](https://www.rainbowkit.com/) for wallet integration
- [Next.js](https://nextjs.org/) for the amazing framework
- [TailwindCSS](https://tailwindcss.com/) for styling

---

<p align="center">
  Built with ❤️ for creators worldwide
</p>
