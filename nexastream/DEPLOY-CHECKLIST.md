# 🚀 Deploy Checklist - NexaStream para nexastream.org

## ✅ Código já está no GitHub!

Repositório: https://github.com/Railancosta/nexastream

---

## 1️⃣ Configurar GitHub Secrets

### No GitHub, vá em:
Settings → Secrets and variables → Actions → New repository secret

Adicione estes secrets:

```bash
# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Railway (opcional)
RAILWAY_TOKEN=your_railway_token
RAILWAY_PROJECT_ID=your_project_id
```

### Como obter os tokens:

**Vercel:**
1. Acesse https://vercel.com/dashboard
2. Settings → Tokens
3. Create Token

**Railway:**
1. Acesse https://railway.app
2. Account Settings → Tokens
3. Create Token

---

## 2️⃣ Deploy Backend (Railway)

### Opção A: GitHub Integration
1. Acesse https://railway.app
2. Login com GitHub
3. New Project → Deploy from GitHub repo
4. Selecione `Railancosta/nexastream`
5. Configure:

```
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

6. Environment Variables:
```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://nexastream.org
JWT_SECRET=your-secure-random-string
```

### Opção B: Deploy Local
```bash
cd backend
npm install --production
npm start
```

---

## 3️⃣ Deploy Frontend (Vercel)

### Opção A: Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel --prod
```

### Opção B: Vercel Dashboard
1. Acesse https://vercel.com
2. Import Project → GitHub
3. Selecione `nexastream`
4. Configure:

```
Framework: Next.js
Root Directory: ./frontend
Build Command: npm run build
Output Directory: .next
```

5. Environment Variables:
```
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api
NEXT_PUBLIC_DOMAIN=nexastream.org
```

6. Domains:
   - Add `nexastream.org`
   - Add `www.nexastream.org`

---

## 4️⃣ Configurar DNS no GoDaddy

### Acesse: https://dns.godaddy.com

### Registros DNS:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | cname.vercel-dns.com | 600 |
| A | @ | 76.76.21.21 | 600 |

### Para Vercel:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600 (1 hour)
```

### Para Railway (se usar API):
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600
```

---

## 5️⃣ Configurar HTTPS/SSL

No Vercel Dashboard:
1. Security → SSL/TLS
2. Enable "Enforce HTTPS"

No GoDaddy:
1. SSL Certificates
2. Compre ou use Let's Encrypt free

---

## 6️⃣ Atualizar API URL no Frontend

Depois de deploy, atualize:

No Vercel Environment Variables:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
```

---

## 📋 Deploy Rápido (10 min)

1. ✅ Railway: Deploy backend → Copiar URL
2. ✅ Vercel: Deploy frontend → Adicionar domínio
3. ✅ GoDaddy: Configurar DNS
4. ✅ Aguardar propagação (5-60 min)

---

## 🔧 Troubleshooting

### "502 Bad Gateway"
- Backend não está rodando → Verifique Railway
- Health check falhando → Verifique logs

### "Cannot connect to API"
- NEXT_PUBLIC_API_URL incorreto → Corrija no Vercel
- CORS não configurado → Backend precisa ter FRONTEND_URL

### DNS não funciona
- Aguarde até 48h para propagação
- Use https://dnschecker.org para verificar

---

## 🎉 Pronto!

Após seguir todos os passos, seu site estará em:
**https://nexastream.org**

---

## 📞 Suporte

- Email: support@nexastream.org
- Discord: https://discord.gg/nexastream
