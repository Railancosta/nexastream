# ✅ NexaStream - Deploy Completo

## 📋 PASSO 1: Railway (Backend)

### 1.1 Abra o Railway
Acesse: https://railway.com/project/e8f41e8f-ed49-4440-96d3-2390f0a50cb3

### 1.2 Configure o Backend
1. Settings → Networking
2. Ative **"Public Networking"** ou **"Generate Domain"**
3. Copie a URL pública (ex: `https://abc123.up.railway.app`)

### 1.3 Adicione Variáveis
Em Settings → Variables:
```
JWT_SECRET=nexastream2024secret
NODE_ENV=production
FRONTEND_URL=https://nexastream.org
```

### 1.4 Deploy
- Railway detecta automaticamente Node.js
- Aguarde ~2 minutos
- **Copie a URL pública**

---

## 📋 PASSO 2: Frontend

### 2.1 Edite o arquivo
No GitHub, edite `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=https://SUA-URL-RAILWAY-AQUI
```

### 2.2 Exemplo
Se sua URL Railway for: `https://nexastream-abc123.up.railway.app`
```
NEXT_PUBLIC_API_URL=https://nexastream-abc123.up.railway.app
```

### 2.3 Commit
```
git add .
git commit -m "Update API URL"
git push
```

GitHub Actions vai fazer deploy automaticamente!

---

## 📋 PASSO 3: Verificar

```bash
# Teste backend
curl https://SUA-URL-RAILWAY/api/health

# Deve retornar:
{"status":"ok","database":"connected","videos":0}
```

```bash
# Teste frontend
curl https://nexastream.org

# Deve carregar a página
```

---

## 🎯 URLs Esperadas

| Serviço | URL |
|---------|-----|
| Frontend | https://nexastream.org |
| Backend | https://xxxx.up.railway.app |
| API | https://xxxx.up.railway.app/api |

---

## ⏱️ Tempo Total: ~10 minutos

## 💰 Custo: R$0 (GRÁTIS)
