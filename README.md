# NexaStream

## The First Democratic Video Platform

NexaStream is a next-generation video platform that revolutionizes content creation with instant monetization, transparent algorithms, and blockchain-powered payments.

### Key Features

- 🚀 **Instant Monetization** - Earn from your first view, no minimum subscribers
- 💰 **Blockchain Payments** - USDC and crypto payments directly to your wallet
- 🎯 **Transparent Algorithms** - Customize your feed with adjustable weights
- 🔐 **Bank-Grade Security** - Military-level encryption and protection
- 🌐 **Multi-Language** - Available in 100+ languages
- 📊 **Creator Dashboard** - Real-time analytics and earnings tracking

### Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Cache**: Redis
- **Blockchain**: Ethereum, USDC, viem
- **Storage**: S3/IPFS

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Railancosta/nexastream.git
cd nexastream

# Install dependencies
npm install

# Start development servers
npm run dev
```

### Project Structure

```
nexastream/
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/     # Next.js pages
│   │   ├── lib/       # Utilities and API client
│   │   └── styles/    # Global styles
│   └── package.json
├── backend/           # Express.js backend
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── middleware/ # Express middleware
│   │   ├── services/  # Business logic
│   │   ├── config/    # Configuration
│   │   └── utils/     # Utilities
│   ├── prisma/        # Database schema
│   └── package.json
├── security/          # Security implementations
├── management/       # Management tools
└── package.json       # Root workspace config
```

### Environment Variables

Create `.env` files in both `frontend/` and `backend/`:

**Backend (.env)**
```env
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ETHEREUM_RPC_URL=...
USDC_CONTRACT=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### API Documentation

API endpoints are available at `/api/v1`:

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/google` - Google OAuth
- `GET /api/v1/videos` - List videos
- `GET /api/v1/videos/trending` - Trending videos
- `GET /api/v1/channels` - List channels
- `POST /api/v1/wallet/connect` - Connect wallet
- `POST /api/v1/wallet/withdraw` - Withdraw funds

### Security Features

- ✅ Helmet.js security headers
- ✅ Rate limiting
- ✅ CSRF protection
- ✅ Input sanitization
- ✅ bcrypt password hashing
- ✅ JWT authentication
- ✅ 2FA support
- ✅ Blockchain transaction verification

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### License

MIT License - see LICENSE file for details.

### Support

- Documentation: https://docs.nexastream.org
- Discord: https://discord.gg/nexastream
- Email: support@nexastream.org

---

Built with ❤️ by the NexaStream Team
