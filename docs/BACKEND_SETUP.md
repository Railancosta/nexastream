# 🚀 NexaStream Backend Setup Guide

## Architecture

```
┌─────────────────────────────────────────────┐
│  Cloudflare Workers API                     │
│  https://nexastream-api.railancosta.workers.dev │
├─────────────────────────────────────────────┤
│  Auth: JWT + PBKDF2-SHA256                 │
│  Database: Cloudflare D1 (SQLite)           │
│  Storage: Cloudflare R2 (S3-compatible)     │
│  P2P: WebTorrent + DHT                      │
│  Economy: NST token rewards                 │
└─────────────────────────────────────────────┘
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | List videos (paginated) |
| GET | `/api/videos/:id` | Get video details |
| POST | `/api/videos/upload` | Upload video |
| POST | `/api/videos/:id/like` | Like/unlike video |
| POST | `/api/videos/:id/watch` | Report watch time |

### Feed & Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feed?tab=all\|shorts\|videos` | Smart feed |
| GET | `/api/search?q=query` | Search videos |

### Treasury & Economy
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/treasury/balance` | Get NST balance |
| GET | `/api/treasury/transactions` | Transaction history |
| POST | `/api/treasury/withdraw` | Withdraw to crypto |

### Wallets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wallet/connect` | Connect wallet |
| GET | `/api/wallet/info` | Get wallet info |

### P2P
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/p2p/report` | Report seeding proof |
| GET | `/api/p2p/peers?video_id=x` | List active peers |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos/:id/comments` | Get comments |
| POST | `/api/videos/:id/comments` | Add comment |

## NST Reward System

| Action | Reward (NST) |
|--------|-------------|
| Register | 1,000 (welcome bonus) |
| Like a video | 5 to creator |
| Watch video (>30s) | 1-2 to creator |
| Comment | 10 to commenter |
| Seed 10MB via P2P | 1 per 10MB |
| Daily login | 50 |

## Setup on Cloudflare

### 1. Create D1 Database
```bash
wrangler d1 create nexastream-db
# Copy the database_id to wrangler.toml
```

### 2. Create R2 Bucket
```bash
wrangler r2 bucket create nexastream-videos
```

### 3. Initialize Schema
```bash
cd workers/api
wrangler d1 execute nexastream-db --remote --file=schema.sql
```

### 4. Seed Data
```bash
wrangler d1 execute nexastream-db --remote --file=seed.sql
```

### 5. Deploy
```bash
wrangler deploy
```

### 6. GitHub Secrets (for auto-deploy)
| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers/D1/R2 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

## Wallet Integration

Supported chains:
- **Ethereum** (MetaMask, WalletConnect)
- **Solana** (Phantom, Solflare)
- **Bitcoin** (Xverse, Leather)
- **Nano** (Natrium, Canoe)

The API validates wallet addresses per chain and supports:
- Multi-chain wallet binding per account
- Cross-chain withdrawals via Li.Fi / THORChain (production)
- Memo/Tag validation for exchanges (XRP, XLM, EOS, TON, ATOM)

## Anti-Fraud

The watch endpoint validates:
- Minimum watch time (>30s) before crediting
- Completion bonus (2x reward for full watch)
- Per-user per-video deduplication
- Reputation scoring (production: ClickHouse analytics)

## Security

- Passwords: PBKDF2-SHA256, 100k iterations, random salt
- Auth: JWT with HMAC-SHA256, 24h expiry
- Rate limiting: Configurable at Cloudflare level
- CORS: Enabled for all origins (restrict in production)
