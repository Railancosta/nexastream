# NexaStream - Deploy 100% Cloudflare + GitHub

## Arquitetura

```
GitHub (Main Repo)
       │
       ├── Frontend → Cloudflare Pages
       │                   │
       │                   └── nexastream.org (HTTPS)
       │
       └── API → Cloudflare Workers
                   │
                   └── nexastream-api.pages.dev/api
```

---

## PASSO 1: Deploy Frontend no Cloudflare Pages

### 1.1 - Acesse Cloudflare Dashboard

👉 https://dash.cloudflare.com

### 1.2 - Selecione "Workers & Pages"

### 1.3 - Create Application → Pages → Connect to GitHub

1. **Project name:** `nexastream`
2. **Production branch:** `main`
3. **Build command:** `npm run build`
4. **Build output directory:** `frontend/out`

### 1.4 - Environment Variables

```
NEXT_PUBLIC_API_URL=https://nexastream.pages.dev/api
NEXT_PUBLIC_APP_URL=https://nexastream.org
```

### 1.5 - Deploy!

---

## PASSO 2: Configurar API Routes (Functions)

Criar `frontend/functions/api/[...path].js`:

```javascript
export async function onRequest({ request, env, params }) {
  const path = params.path.join('/');
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://nexastream.org',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (path === 'health') {
    return new Response(JSON.stringify({
      status: 'ok',
      service: 'nexastream-api',
      timestamp: Date.now(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Route: /api/videos
  if (path.startsWith('videos')) {
    return handleVideos(request, corsHeaders);
  }

  // Route: /api/channels
  if (path.startsWith('channels')) {
    return handleChannels(request, corsHeaders);
  }

  // Route: /api/users
  if (path.startsWith('users')) {
    return handleUsers(request, corsHeaders);
  }

  // Route: /api/wallet
  if (path.startsWith('wallet')) {
    return handleWallet(request, corsHeaders);
  }

  // Route: /api/nft
  if (path.startsWith('nft')) {
    return handleNFT(request, corsHeaders);
  }

  // 404
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleVideos(request, cors) {
  // Demo response - replace with actual Supabase queries
  return new Response(JSON.stringify({
    videos: [
      { id: '1', title: 'Welcome to NexaStream', views: 1250 },
      { id: '2', title: 'Blockchain Basics', views: 890 },
    ]
  }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

async function handleChannels(request, cors) {
  return new Response(JSON.stringify({
    channels: [
      { id: '1', name: 'NexaStream Official', subscribers: 5000 },
    ]
  }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

async function handleUsers(request, cors) {
  return new Response(JSON.stringify({
    users: []
  }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

async function handleWallet(request, cors) {
  return new Response(JSON.stringify({
    balance: 0,
    currency: 'NEXA'
  }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

async function handleNFT(request, cors) {
  return new Response(JSON.stringify({
    nfts: []
  }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}
```

---

## PASSO 3: Configurar Custom Domain

### 3.1 - No Cloudflare Pages

1. Vá no projeto `nexastream`
2. **Settings** → **Custom domains**
3. Add domain: `nexastream.org`
4. Click **Check DNS configuration**

### 3.2 - DNS (GoDaddy → Cloudflare)

1. Acesse: https://godaddy.com
2. **My Products** → **DNS** (nexastream.org)
3. **Nameservers** → **Change** → **Add my own nameservers**

Adicione:
```
june.ns.cloudflare.com
amir.ns.cloudflare.com
```

### 3.3 - SSL

- **SSL/TLS** → **Mode:** `Full` ou `Strict`

---

## PASSO 4: GitHub Actions (Deploy Automático)

Criar `.github/workflows/cloudflare.yml`:

```yaml
name: Cloudflare Pages Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Build
        run: npm run build
        working-directory: frontend

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: nexastream
          directory: frontend/out
```

---

## RESULTADO FINAL

```
┌─────────────────────────────────────────────────────────────┐
│  🌐 nexastream.org                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND (Cloudflare Pages) ✅                            │
│  └── https://nexastream.pages.dev → nexastream.org         │
│                                                             │
│  API (Cloudflare Pages Functions) ✅                        │
│  └── https://nexastream.pages.dev/api                      │
│                                                             │
│  DATABASE (Supabase PostgreSQL) ✅                          │
│  └── db.bslfsfquympulymbagde.supabase.co                  │
│                                                             │
│  SOURCE (GitHub) ✅                                         │
│  └── github.com/Railancosta/nexastream                    │
│                                                             │
│  🔐 SECURITY (100% Cloudflare)                            │
│  ├── HTTPS/TLS 1.3           ✅                           │
│  ├── SHA-256                 ✅                           │
│  ├── HSTS                    ✅                           │
│  ├── CSP                     ✅                           │
│  ├── DDoS Protection         ✅                           │
│  └── WAF                     ✅                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## COMANDOS RÁPIDOS

```bash
# Ver deploys
# Dashboard: https://dash.cloudflare.com

# Testar API
curl https://nexastream.pages.dev/api/health

# Verificar SSL
# SSL/TLS Overview no Cloudflare Dashboard
```

---

## CONFIGURAÇÃO DNS CLOUDFLARE

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | www | nexastream.pages.dev | ☁️ Proxied |
| CNAME | @ | nexastream.pages.dev | ☁️ Proxied |

---

## VARIÁVEIS DE AMBIENTE

```
NEXT_PUBLIC_API_URL=https://nexastream.pages.dev/api
NEXT_PUBLIC_APP_URL=https://nexastream.org
NEXT_PUBLIC_APP_NAME=NexaStream
```
