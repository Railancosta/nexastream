# NexaStream - Deploy Guide

## 🚀 Quick Deploy

### Backend (API)

**Option 1: Docker (Recommended)**
```bash
cd backend
docker-compose up -d
```

**Option 2: Manual**
```bash
cd backend
npm install
npm run db:init
npm run seed  # Create demo data
npm start
```

### Frontend
O frontend já está configurado para GitHub Pages via GitHub Actions.

## 🔗 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Get current user |
| `/api/feed/home` | GET | Home feed |
| `/api/feed/trending` | GET | Trending videos |
| `/api/recommendations/for-you` | GET | Personalized feed |
| `/api/videos/:id` | GET | Get video |
| `/api/channels/@:handle` | GET | Get channel |
| `/api/search` | GET | Search videos/channels |
| `/api/subscriptions/:id` | POST | Subscribe |
| `/api/likes/:id` | POST | Like video |
| `/api/comments/video/:id` | GET/POST | Comments |

## 🔐 Demo Account
- Email: `crypto@demo.com`
- Password: `demo123`

## 🌐 Production Deploy

### Backend (Railway/Render/Fly.io)
1. Connect repo to Railway/Render
2. Set environment variables:
   - `JWT_SECRET=your-secret-key`
   - `FRONTEND_URL=https://nexastream.org`
   - `NODE_ENV=production`
3. Deploy!

### Database
SQLite file is stored at `backend/data/nexastream.db`

## 📱 Blockchain Integration

Para integrar blockchain real (Base/Polygon):
1. Obtenha RPC URL em [Alchemy](https://www.alchemy.com/) ou [Infura](https://www.infura.io/)
2. Deploy smart contract na blockchain
3. Atualize `BLOCKCHAIN_RPC` no ambiente

Custos estimados para deploy na Base:
- Deploy contract: ~$0.10-0.50
- Transações: ~$0.01-0.10 cada

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, TailwindCSS
- **Backend**: Express.js, SQLite (better-sqlite3)
- **Auth**: JWT, bcrypt
- **Deploy**: Docker, GitHub Pages
