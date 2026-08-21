# Setup Cloudflare — Sem Terminal (100% pelo Browser)

O Wrangler não funciona no Termux/Android. Use o **Cloudflare Dashboard** + **GitHub Actions** para deploy automático.

---

## Passo 1: Criar Conta Cloudflare

1. Acesse [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Crie conta gratuita
3. Verifique email

---

## Passo 2: Obter Account ID

1. No Dashboard, vá em **Workers & Pages**
2. No canto inferior esquerdo, copie o **Account ID**
3. Guarde este valor

---

## Passo 3: Criar API Token

1. No Dashboard, vá em **My Profile** → **API Tokens**
2. Clique em **Create Token**
3. Use o template **"Edit Cloudflare Workers"**
4. Permissões necessárias:
   - `Account` → `Cloudflare Workers` → `Edit`
   - `Account` → `D1` → `Edit`
   - `Account` → `R2` → `Edit`
5. Clique em **Continue to summary**
6. Clique em **Create Token**
7. **Copie o token** (aparece apenas uma vez!)

---

## Passo 4: Criar Database D1

1. No Dashboard, vá em **Workers & Pages** → **D1**
2. Clique em **Create database**
3. Nome: `nexastream-db`
4. Região: Auto
5. Clique em **Create**
6. Copie o **Database ID**

---

## Passo 5: Criar R2 Bucket

1. No Dashboard, vá em **R2 Object Storage**
2. Clique em **Create bucket**
3. Nome: `nexastream-videos`
4. Região: Auto
5. Clique in **Create bucket**

---

## Passo 6: Adicionar Secrets no GitHub

1. Vá em [github.com/Railancosta/nexastream/settings/secrets/actions](https://github.com/Railancosta/nexastream/settings/secrets/actions)
2. Clique em **New repository secret**
3. Adicione:

| Name | Value |
|------|-------|
| `CLOUDFLARE_API_TOKEN` | *(o token criado no Passo 3)* |
| `CLOUDFLARE_ACCOUNT_ID` | *(o Account ID do Passo 2)* |

---

## Passo 7: Deploy Automático

Depois de adicionar os secrets, o deploy acontece **automaticamente** quando você fizer push para o GitHub.

1. Faça push das alterações:
   ```bash
   git push origin main
   ```

2. O GitHub Actions vai:
   - ✅ Deployar o Worker
   - ✅ Inicializar o D1 Database
   - ✅ Seed dados de teste
   - ✅ Criar R2 Bucket

3. Verifique o status em:
   [github.com/Railancosta/nexastream/actions](https://github.com/Railancosta/nexastream/actions)

---

## Passo 8: Atualizar wrangler.toml

Após criar o D1 Database, atualize o `workers/api/wrangler.toml` com o Database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "nexastream-db"
database_id = "COLE_AQUI_O_DATABASE_ID"
```

Faça push para ativar:
```bash
git add workers/api/wrangler.toml
git commit -m "chore: update D1 database ID"
git push origin main
```

---

## Passo 9: Testar

```bash
curl https://nexastream-api.railancosta.workers.dev/api/health
```

Resposta esperada:
```json
{"status":"ok","service":"nexastream-api","timestamp":1234567890}
```

---

## Passo 10: Configurar DNS

No Cloudflare Dashboard → `nexastream.org` → DNS → Records:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| `CNAME` | `@` | `nexastream.freebuff.app` | ☁️ Proxied |
| `CNAME` | `www` | `nexastream.freebuff.app` | ☁️ Proxied |

SSL/TLS → Full (strict) + Always HTTPS

---

## ✅ Checklist Final

- [ ] Conta Cloudflare criada
- [ ] Account ID copiado
- [ ] API Token criado
- [ ] D1 Database criado (copiar ID)
- [ ] R2 Bucket criado
- [ ] Secrets adicionados no GitHub
- [ ] wrangler.toml atualizado com Database ID
- [ ] Push para GitHub (deploy automático)
- [ ] API testada com curl
- [ ] DNS configurado para nexastream.org
- [ ] SSL/TLS configurado

---

## 🔧 Troubleshooting

### "Unsupported platform: android arm64"
O Wrangler não funciona no Termux. Use o GitHub Actions (deploy automático).

### "Database not found"
Verifique se o Database ID no wrangler.toml está correto.

### "Unauthorized"
Verifique se o API Token está correto e tem as permissões necessárias.

### "CORS error"
O Worker já tem CORS configurado. Se persistir, verifique se o frontend está usando a URL correta da API.

---

## 📊 Custo Total: $0/mês

| Serviço | Limite Free |
|---------|-------------|
| Cloudflare Workers | 100k req/dia |
| Cloudflare D1 | 5GB + 100k reads/dia |
| Cloudflare R2 | 10GB + 10M req/mês |
| GitHub Actions | 2,000 min/mês |
