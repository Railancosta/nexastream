# NexaStream — Cloudflare Workers Backend (100% Free, 24/7)

## Why Cloudflare Workers?
- **Free tier**: 100,000 requests/day
- **24/7 uptime**: Always online, no server to manage
- **Global**: Deployed to 300+ cities worldwide
- **No VPS needed**: Serverless
- **No Termux needed**: Runs on Cloudflare's edge

## Setup (5 minutes)

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2. Deploy the API worker
```bash
cd nexastream
wrangler deploy worker-api.js --name nexastream-api
```
This creates: `https://nexastream-api.YOUR-SUBDOMAIN.workers.dev`

### 3. Update platform.html
Replace the API URL in app.js:
```
NEXASTREAM_API = 'https://nexastream-api.YOUR-SUBDOMAIN.workers.dev/api/v1'
```

### 4. Set up KV Storage (free database)
```bash
wrangler kv:namespace create NST_USERS
wrangler kv:namespace create NST_VIDEOS
wrangler kv:namespace create NST_SESSIONS
```

### 5. Deploy
```bash
wrangler deploy
```

The API is now live 24/7 on Cloudflare's global edge network.
Login, register, upload, feed, search — all working.

## Cost: $0/month
- Workers: 100k requests/day free
- KV: 100k reads/day, 1k writes/day free
- No VPS, no Termux, no server
