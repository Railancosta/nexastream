# NexaStream API — Cloudflare Workers

Backend 100% gratuito para a plataforma de vídeos NexaStream.

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Workers (API)                               │
│  • 100,000 requests/dia grátis                          │
│  • Auth JWT + Rate Limiting                             │
│  • Video CRUD + Feed                                    │
│  • WebTorrent integration                               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Cloudflare D1 (Database)                               │
│  • SQLite serverless                                    │
│  • 5GB storage grátis                                   │
│  • Users, Videos, Comments, Subscriptions               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Cloudflare R2 (Storage)                                │
│  • Object storage (S3-compatible)                       │
│  • 10GB grátis                                          │
│  • Vídeos + Thumbnails                                  │
└─────────────────────────────────────────────────────────┘
```

## Deploy Rápido

```bash
# 1. Login no Cloudflare
wrangler login

# 2. Executar script de deploy
chmod +x deploy.sh
./deploy.sh

# 3. Testar
curl https://nexastream-api.railancosta.workers.dev/api/health
```

## Deploy Manual

```bash
# Criar D1 Database
wrangler d1 create nexastream-db
# Copie o database_id e atualize wrangler.toml

# Criar R2 Bucket
wrangler r2 bucket create nexastream-videos

# Inicializar Schema
wrangler d1 execute nexastream-db --remote --file=./schema.sql

# Seed Dados
wrangler d1 execute nexastream-db --remote --file=./seed.sql

# Deploy
wrangler deploy
```

## Endpoints

### Auth
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Entrar

### Videos
- `GET /api/videos` — Listar vídeos
- `GET /api/feed?tab=all|shorts|videos` — Feed inteligente
- `GET /api/videos/:id` — Detalhes do vídeo
- `POST /api/videos/upload` — Upload (requer auth)

### P2P
- `POST /api/p2p/report` — Reportar bandwidth (seeding)
- `GET /api/p2p/peers?videoId=` — Listar peers

### Blockchain
- `GET /api/chain/balance?userId=` — Saldo NST

### Health
- `GET /api/health` — Status do sistema

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `JWT_SECRET` | Secret para JWT tokens |
| `DB` | D1 Database binding |
| `R2` | R2 Bucket binding |

## Limites Free Tier

| Serviço | Limite |
|---------|--------|
| Workers | 100k req/dia |
| D1 | 5GB + 100k reads/dia |
| R2 | 10GB + 10M req/mês |

## Estrutura

```
workers/api/
├── src/index.ts     # API principal
├── schema.sql       # Database schema
├── seed.sql         # Dados de teste
├── wrangler.toml    # Configuração
├── deploy.sh        # Script de deploy
└── README.md        # Este arquivo
```
