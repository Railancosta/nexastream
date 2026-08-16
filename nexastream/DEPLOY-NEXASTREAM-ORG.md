# 🚀 Deploy NexaStream para nexastream.org

## Passo 1: Deploy Backend (Railway)

### 1.1 Crie conta no Railway
- Acesse: https://railway.app
- Login com GitHub

### 1.2 Deploy Backend
```bash
# No Railway Dashboard:
# 1. Click "New Project" → "Deploy from GitHub repo"
# 2. Selecione seu repositório
# 3. Configure:

# Build Command: (deixe vazio - não precisa)
# Start Command: cd backend && npm start

# Environment Variables:
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://nexastream.org
JWT_SECRET=nexastream-production-secret-change-this
```

### 1.3 Obtenha URL do Backend
Após deploy, você verá algo como:
```
https://backend.railway.app
```
Anote essa URL!

---

## Passo 2: Deploy Frontend (Vercel)

### 2.1 Crie conta no Vercel
- Acesse: https://vercel.com
- Login com GitHub

### 2.2 Deploy Frontend
```bash
cd frontend
npm install -g vercel
vercel --prod
```

### 2.3 Configure Domínio
1. No Vercel Dashboard → Settings → Domains
2. Adicione: `nexastream.org`
3. Adicione: `www.nexastream.org`

### 2.4 Configure Variáveis
```
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app/api
NEXT_PUBLIC_DOMAIN=nexastream.org
```

---

## Passo 3: Configure DNS no GoDaddy

### 3.1 Acesse GoDaddy
1. Vá para https://dns.godaddy.com
2. Selecione **nexastream.org**

### 3.2 Configure Records

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| CNAME | www | cname.vercel-dns.com | 1 hora |
| A | @ | 76.76.21.21 | 1 hora |

### 3.3 (Opcional) Redirecionar
Se quiser forçar HTTPS:
- Configure Page Rule no Cloudflare

---

## Passo 4: Deploy Blockchain (Opcional)

### 4.1 NixOS/VPS
```bash
cd nexachain
go build -o nexachain
./nexachain
```

### 4.2 AWS/GCP/Azure
```bash
# Criar instância
# Instalar Go 1.21+
# git clone seu-repo
# cd nexachain && go build
# ./nexachain
```

---

## URLs Finais

Após deploy:
- **Site**: https://nexastream.org
- **API**: https://api.nexastream.org
- **Health**: https://api.nexastream.org/api/health

---

## Troubleshooting

### SSL não funciona
- Aguarde 24-48h para propagação DNS
- Force HTTPS no Cloudflare

### API não conecta
- Verifique se CORS está configurado
- Backend deve ter `FRONTEND_URL=https://nexastream.org`

### Build falha
```bash
cd frontend
npm run build
```

---

## Suporte

- Email: support@nexastream.org
- Discord: https://discord.gg/nexastream

---

**NexaStream v1.0** - Decentralized Video Platform
