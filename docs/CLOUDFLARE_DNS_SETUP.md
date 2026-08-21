# Configuração DNS — Cloudflare + NexaStream

## Passo 1: Criar conta no Cloudflare

1. Acesse [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Crie uma conta gratuita
3. Verifique o email

---

## Passo 2: Adicionar domínio ao Cloudflare

1. No dashboard, clique em **"Add a site"**
2. Digite: `nexastream.org`
3. Selecione o plano **Free** (suficiente)
4. Clique **"Add site"**

---

## Passo 3: Configurar registros DNS

O Cloudflare vai escanear registros existentes. Configure:

| Tipo | Nome | Conteúdo | Proxy | TTL |
|------|------|----------|-------|-----|
| `A` | `@` | `192.0.2.1` | ☁️ Proxied | Auto |
| `CNAME` | `www` | `nexastream.pages.dev` | ☁️ Proxied | Auto |
| `CNAME` | `@` | `nexastream.pages.dev` | ☁️ Proxied | Auto |

> **Nota:** Se já existir um registro A apontando para o IP anterior do Vercel, **exclua-o** e substitua pelo CNAME acima.

---

## Passo 4: Copiar nameservers do Cloudflare

Após criar o site, o Cloudflare mostrará 2 nameservers. Exemplo:

```
aria.ns.cloudflare.com
bob.ns.cloudflare.com
```

**Copie esses 2 nameservers** — você vai usar no GoDaddy.

---

## Passo 5: Atualizar nameservers no GoDaddy

1. Acesse [https://dcc.godaddy.com/](https://dcc.godaddy.com/)
2. Vá em **Meus Produtos** → **Domínios**
3. Clique em `nexastream.org`
4. Clique em **"Nameservers"** no menu lateral
5. Clique em **"Change Nameservers"**
6. Selecione **"I'll use my own nameservers"**
7. Cole os 2 nameservers do Cloudflare:
   - Nameserver 1: `aria.ns.cloudflare.com` (o que o Cloudflare deu)
   - Nameserver 2: `bob.ns.cloudflare.com` (o que o Cloudflare deu)
8. Clique **"Save"**
9. Confirme a mudança

---

## Passo 6: Ativar Cloudflare Pages

### Via Dashboard:

1. No Cloudflare, vá em **Workers & Pages**
2. Clique em **"Create application"** → **"Pages"**
3. Conecte ao GitHub: `Railancosta/nexastream`
4. Configure:
   - **Framework preset:** Next.js
   - **Build command:** `STATIC_EXPORT=1 npx next build`
   - **Build output directory:** `out`
5. Clique **"Save and Deploy"**

### Adicionar domínio customizado:

1. No projeto Pages, vá em **Custom domains**
2. Clique **"Set up a custom domain"**
3. Digite: `nexastream.org`
4. Clique **"Activate domain"**

---

## Passo 7: Configurar SSL/TLS

1. No Cloudflare, vá em **SSL/TLS**
2. Modo: **Full (strict)**
3. Ative **"Always Use HTTPS"**
4. Ative **"Automatic HTTPS Rewrites"**

---

## Passo 8: Configurar regras de redirecionamento

1. Vá em **Rules** → **Configuration Rules**
2. Crie regra para forçar HTTPS se necessário

---

## Passo 9: Variáveis de ambiente no GitHub

No repositório GitHub (`Railancosta/nexastream`):

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione:
   - `CLOUDFLARE_API_TOKEN` — gere em [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
     - Permissões: `Cloudflare Pages:Edit`, `Zone:Read`
   - `CLOUDFLARE_ACCOUNT_ID` — encontrado na URL do dashboard: `dash.cloudflare.com/<ACCOUNT_ID>`

---

## Passo 10: Verificar propagação

Após 5-30 minutos:

```bash
# Verificar nameservers
dig NS nexastream.org +short

# Verificar CNAME
dig CNAME nexastream.org +short

# Verificar se resolve
curl -I https://nexastream.org
```

---

## Checklist final

- [ ] Conta Cloudflare criada
- [ ] Domínio `nexastream.org` adicionado ao Cloudflare
- [ ] Records DNS configurados (CNAME para `nexastream.pages.dev`)
- [ ] Nameservers atualizados no GoDaddy
- [ ] Cloudflare Pages criado e conectado ao GitHub
- [ ] Domínio customizado ativado no Pages
- [ ] SSL/TLS configurado em Full (strict)
- [ ] Variáveis de ambiente GitHub Actions configuradas
- [ ] Site acessível em `https://nexastream.org`
