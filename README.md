# NexaStream v3.0 - The First Democratic Video Platform

## 🚀 Features

### Core Platform
- **Instant Monetization** - Earn USDC from your first video
- **YouTube-Style Algorithm** - Fair, transparent ranking based on engagement
- **Blockchain Payments** - Secure USDC payouts directly to your wallet
- **SEO Optimized** - Built-in search and discoverability

### Monetization
- **70% Revenue Share** - Industry-leading creator earnings
- **Boost System** - Pay to promote videos (optional)
- **Sponsorships** - Connect with brands directly
- **Real-time Analytics** - Track your earnings

### Security
- **Military-Grade Security** - SQL/XSS/CSRF protection
- **JWT Authentication** - Secure session management
- **Rate Limiting** - DDoS protection
- **Ethereum Blockchain** - Immutable, transparent transactions

## 📋 Requirements

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
cd backend && npm install
cd ../frontend && npm install
\`\`\`

### 2. Setup Database
\`\`\`bash
cd backend
npx prisma generate
npx prisma db push
npm run seed
\`\`\`

### 3. Configure Environment
Edit \`backend/.env\` with your settings.

### 4. Start Development
\`\`\`bash
npm run dev
\`\`\`

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Default Login
- Email: admin@nexastream.org
- Password: admin123

## 💰 Payment Configuration

Your USDC payment address is pre-configured:
\`\`\`
0xa453B71A216a8A6608e79247B162df47B2770899
\`\`\`

All creator withdrawals will be sent to this address.

## 📊 Algorithm Weights

| Factor | Weight |
|--------|--------|
| Views | 25% |
| Likes | 20% |
| Engagement Rate | 20% |
| Boost Level | 15% |
| Recency | 10% |
| Watch Time | 10% |

## 🛠 Tech Stack

### Backend
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT + bcrypt
- ethers.js (Ethereum)

### Frontend
- Next.js 14 + React 18
- Tailwind CSS
- Zustand (State)
- Lucide Icons

## 📁 Project Structure

\`\`\`
nexastream/
├── backend/
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth, security
│   │   ├── config/      # Configuration
│   │   └── utils/       # Helpers
│   └── prisma/          # Database schema
├── frontend/
│   ├── src/
│   │   ├── pages/       # Next.js pages
│   │   ├── lib/         # API client, store
│   │   └── styles/      # Global styles
│   └── public/          # Static assets
└── docker/              # Deployment configs
\`\`\`

## 🌐 Deploy

### Docker
\`\`\`bash
docker-compose -f docker/docker-compose.yml up -d
\`\`\`

### Manual Deploy
1. Build: \`npm run build\`
2. Set production env vars
3. Start: \`npm start\`

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | Secret for JWT tokens |
| ETHEREUM_RPC_URL | Ethereum RPC endpoint |
| PLATFORM_WALLET | Your USDC receiving address |
| CORS_ORIGINS | Allowed origins |

## 📈 API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- GET /api/auth/me

### Videos
- GET /api/videos
- GET /api/videos/trending
- POST /api/videos
- POST /api/videos/:id/like
- POST /api/videos/:id/boost

### Channels
- GET /api/channels
- POST /api/channels
- POST /api/channels/:id/subscribe

### Wallet
- GET /api/wallet
- POST /api/wallet/connect
- POST /api/wallet/withdraw
- GET /api/wallet/transactions

## 📜 License

MIT © NexaStream

## 🌟 Support

- Email: support@nexastream.org
- Docs: https://docs.nexastream.org

---

**Built with ❤️ for creators worldwide**
