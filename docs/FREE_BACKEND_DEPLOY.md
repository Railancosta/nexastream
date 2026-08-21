# NexaStream — Backend 100% Gratuito no Cloudflare

## Arquitetura Completa (Custo: $0/mês)

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Cloudflare Pages)                            │
│  • Static HTML/JS/CSS                                   │
│  • 19 páginas Next.js                                   │
│  • CDN global grátis                                    │
│  • Domínio: nexastream.org                              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│  API (Cloudflare Workers)                               │
│  • 100,000 requests/dia grátis                          │
│  • Auth JWT + Rate Limiting                             │
│  • Video CRUD + Feed                                    │
│  • WebTorrent integration                               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  DATABASE (Cloudflare D1)                               │
│  • SQLite serverless                                    │
│  • 5GB storage grátis                                   │
│  • 100,000 reads/dia grátis                             │
│  • Users, Videos, Comments, Subscriptions               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  STORAGE (Cloudflare R2)                                │
│  • Object storage (S3-compatible)                       │
│  • 10GB grátis                                          │
│  • 10,000,000 requests/mês grátis                       │
│  • Vídeos + Thumbnails                                  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  P2P (WebTorrent + DHT)                                 │
│  • Distribuição entre usuários                          │
│  • Seeding incentives (NST)                             │
│  • Sem custo de banda para a plataforma                 │
└─────────────────────────────────────────────────────────┘
```

## Limites do Plano Free

| Serviço | Limite Free | Custo Excedente |
|---------|-------------|-----------------|
| Cloudflare Pages | Ilimitado | N/A |
| Cloudflare Workers | 100k req/dia | $0.50/milhão |
| Cloudflare D1 | 5GB + 100k reads/dia | $0.75/milhão |
| Cloudflare R2 | 10GB + 10M req/mês | $0.015/GB |
| WebTorrent | Ilimitado (P2P) | N/A |

**Para uma plataforma em crescimento, o plano free sustenta até ~10,000 usuários ativos/dia.**

---

## Passo a Passo: Deploy

### 1. Criar Conta Cloudflare

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com/sign-up)
2. Crie conta gratuita
3. Verifique email

### 2. Criar D1 Database

```bash
# Instalar Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Criar banco
wrangler d1 create nexastream-db

# Copiar o database_id e atualizar workers/api/wrangler.toml

# Inicializar schema
cd workers/api
wrangler d1 execute nexastream-db --remote --file=./schema.sql

# Seed dados (opcional)
wrangler d1 execute nexastream-db --remote --file=./seed.sql
```

### 3. Criar R2 Bucket

1. No Dashboard: R2 Object Storage → Create bucket
2. Nome: `nexastream-videos`
3. Região: Auto (mais próximo do usuário)

### 4. Deploy API Worker

```bash
cd workers/api

# Gerar secret aleatório
JWT_SECRET=$(openssl rand -hex 32)

# Atualizar wrangler.toml com:
# - database_id do D1
# - JWT_SECRET

# Deploy
wrangler deploy
```

### 5. Configurar DNS

No Cloudflare Dashboard:

1. Adicione domínio `nexastream.org`
2. Records DNS:
   - `A` → `@` → `nexastream-api.<subdomain>.workers.dev` (para API)
   - `CNAME` → `www` → `nexastream.pages.dev` (para frontend)

3. Workers Routes:
   - `nexastream.org/api/*` → `nexastream-api`

### 6. Variáveis de Ambiente

No Dashboard → Workers → nexastream-api → Settings → Variables:

| Variável | Valor |
|----------|-------|
| `JWT_SECRET` | *(seu secret)* |
| `DB` | *(binding do D1)* |
| `R2` | *(binding do R2)* |

---

## Estrutura do Código

```
nexastream/
├── src/                    # Frontend Next.js
│   ├── app/               # 19 páginas
│   ├── components/        # UI components
│   └── lib/               # WebTorrent, API, i18n
├── workers/               # Cloudflare Workers
│   └── api/
│       ├── src/index.ts   # API principal
│       ├── schema.sql     # Database schema
│       ├── seed.sql       # Dados de teste
│       └── wrangler.toml  # Configuração
├── public/                # Static assets
│   ├── _headers           # Cloudflare headers
│   ├── _redirects         # SPA fallback
│   └── CNAME              # Domínio
└── out/                   # Build estático
```

---

## Endpoints da API

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

### Social
- `GET /api/mod/removed` — Vídeos removidos

### Blockchain
- `GET /api/chain/balance?userId=` — Saldo NST

### Health
- `GET /api/health` — Status do sistema

---

## Seeding Incentives (NST)

O sistema recompensa usuários que mantêm vídeos disponíveis:

| Ação | Recompensa |
|------|------------|
| Seeding 1 GB por 1 hora | 100 NST |
| Upload de vídeo original | 1,000 NST |
| Comentário | 10 NST |
| Like | 5 NST |

**Fórmula:** `NST = GB_servidos × 100`

---

## Limitações Conhecidas

1. **Storage R2**: 10GB free = ~20 vídeos de 500MB
2. **Workers**: 100k req/dia = ~3,300 req/hora
3. **D1**: 100k reads/dia = ~4,166 reads/hora

**Solução para escala**: upgrade para plano pago ($5/mês) aumenta:
- Workers: 10M req/mês
- D1: 25GB + 25M reads/mês
- R2: 10GB (sem mudança no free tier)

---

## Monitoramento

### Logs
```bash
wrangler tail nexastream-api
```

### Métricas
- Dashboard Cloudflare → Workers → nexastream-api → Metrics
- Requests, Errors, Latência, CPU time

### Health Check
```bash
curl https://nexastream.org/api/health
```

---

## Rollback

```bash
# Listar versões
wrangler deployments list

# Reverter
wrangler rollback <deployment-id>
```

---

## Próximos Passos

1. [ ] Criar conta Cloudflare
2. [ ] Deploy D1 + schema
3. [ ] Deploy R2 bucket
4. [ ] Deploy API Worker
5. [ ] Configurar DNS
6. [ ] Testar endpoints
7. [ ] Conectar frontend à API
8. [ ] Implementar WebTorrent no frontend
9. [ ] Adicionar sistema de recompensas NST
