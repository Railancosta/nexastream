# NexaStream Backend API v2.0

Complete backend API for NexaStream - Blockchain Video Platform

## 🚀 Features

- **User Management**: Auth, profiles, 2FA, KYC
- **Video Platform**: Upload, streaming, comments, likes
- **Live Streaming**: RTMP, chat, moderation
- **NFT Marketplace**: Minting, trading, royalties
- **Blockchain Rewards**: Per-view rewards, tips
- **Analytics**: Platform, channel, video stats
- **Real-time**: WebSocket for live updates

## 📦 Installation

```bash
npm install
```

## 🔧 Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
```

## 🚀 Run

```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Endpoints

| Route | Description |
|-------|-------------|
| `/api/users` | User management |
| `/api/videos` | Video platform |
| `/api/channels` | Creator channels |
| `/api/payments` | Wallet & transactions |
| `/api/streaming` | Live streaming |
| `/api/nft` | NFT marketplace |
| `/api/analytics` | Platform analytics |
| `/api/health` | Health check |

## 🌐 Deploy

### Render

1. Fork this repo
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repo
4. Set root directory: `backend`
5. Add environment variables
6. Deploy!

### Railway

```bash
railway init
railway up
```

### Docker

```bash
docker build -t nexastream-backend .
docker run -p 3001:3001 nexastream-backend
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration
│   ├── middleware/      # Express middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   │   └── api/        # Route handlers
│   ├── server.js       # Entry point
│   └── index.js        # Legacy entry
├── .env.example        # Environment template
├── Dockerfile         # Docker config
├── render.yaml        # Render Blueprint
└── package.json
```

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment mode |
| `JWT_SECRET` | Yes | JWT signing secret |
| `DATABASE_URL` | No | PostgreSQL connection |
| `REDIS_URL` | No | Redis connection |

## 📈 API Documentation

### Health Check

```bash
curl https://your-api.com/api/health
```

### Register User

```bash
curl -X POST https://your-api.com/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"pass123"}'
```

### Get Videos

```bash
curl https://your-api.com/api/videos
```

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT © NexaStream
