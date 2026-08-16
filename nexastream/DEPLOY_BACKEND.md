# 🚀 NexaStream Backend Deploy Guide

## Opções de Deploy (Grátis)

### 1. Railway (Recomendado) ⚡

1. **Criar conta**: https://railway.app

2. **Conectar GitHub**:
   - Clique "New Project" → "Deploy from GitHub repo"
   - Selecione `Railancosta/nexastream`
   - Escolha o diretório `backend`

3. **Configurar variáveis de ambiente** no Railway:
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-me
   NODE_ENV=production
   FRONTEND_URL=https://nexastream.org
   PORT=3001
   ```

4. **Deploy** - Railway detecta automaticamente Node.js e faz deploy!

5. **Obter URL do backend**: 
   - Vá em Settings → Networking → Public Networking
   - Copie a URL (ex: `https://nexastream-backend.up.railway.app`)

---

### 2. Render (Alternativa Gratuita)

1. **Criar conta**: https://render.com

2. **New → Web Service**

3. **Configurar**:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

4. **Adicionar Environment Variables**:
   ```
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   FRONTEND_URL=https://nexastream.org
   ```

5. **Deploy!**

---

### 3. Fly.io (Docker)

1. **Instalar**: `brew install flyctl`

2. **Login**: `flyctl auth login`

3. **Deploy**:
   ```bash
   cd backend
   fly launch
   fly secrets set JWT_SECRET=your-secret-key
   fly deploy
   ```

---

## 🔗 Após Deploy

### 1. Configurar Frontend

Crie arquivo `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

### 2. Deploy Frontend (GitHub Actions já configurado)

Faça push para GitHub - Actions fará deploy automaticamente.

---

## 📊 APIs Disponíveis

Após deploy, seu backend terá:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Registrar |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Perfil |
| `/api/feed/home` | GET | Feed home |
| `/api/feed/trending` | GET | Em alta |
| `/api/recommendations/for-you` | GET | Para você (TikTok) |
| `/api/recommendations/trending` | GET | Trending (YouTube) |
| `/api/videos/:id` | GET | Ver vídeo |
| `/api/videos/upload` | POST | Upload |
| `/api/search` | GET | Buscar |
| `/api/subscriptions` | POST | Inscrever |
| `/api/likes/:id` | POST | Curtir |
| `/api/comments/video/:id` | GET/POST | Comentários |
| `/api/analytics/view` | POST | Tracking views |
| `/api/analytics/engage` | POST | Tracking engajamento |
| `/api/blockchain/status` | GET | Status blockchain |

---

## 🐳 Deploy com Docker

```bash
cd backend
docker build -t nexastream-backend .
docker run -p 3001:3001 \
  -e JWT_SECRET=your-secret \
  -e NODE_ENV=production \
  nexastream-backend
```

---

## ✅ Verificar Deploy

```bash
curl https://seu-backend.railway.app/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "database": "connected",
  "videos": 0
}
```

---

## 🆘 Troubleshooting

### ERRO: "Port already in use"
```bash
PORT=3002 npm start
```

### ERRO: "Cannot find module"
```bash
npm install
```

### ERRO: "Database locked"
```bash
rm -f data/*.db-journal
```

---

## 📈 Escalar para Produção

Para milhões de usuários:

1. **Migrar para PostgreSQL**:
   - Railway PostgreSQL addon
   - Atualizar `src/config/database.js`

2. **Adicionar Redis** para cache:
   ```bash
   REDIS_URL=redis://localhost:6379
   ```

3. **CDN para uploads**:
   - AWS S3
   - Cloudflare R2
   - Uploadcare

---

## 💰 Custos

| Serviço | Plano Gratuito | Limite |
|---------|---------------|--------|
| Railway | $5/mês crédito | 500h/mês |
| Render | 750h/mês | 1 serviço |
| Fly.io | 3 VMs | 160GB RAM |

Para começar, Railway ou Render são ideais!
