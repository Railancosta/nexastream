# DNS Setup Guide - nexastream.org

## Opção 1: GoDaddy + Cloudflare (Recomendado)

### Passo 1: Configurar Cloudflare (CDN + SSL gratuito)

1. **Criar conta no Cloudflare**
   - Acesse: https://dash.cloudflare.com/signup
   - Cadastre com email e senha
   - Adicione seu domínio: `nexastream.org`

2. **Obter nameservers do Cloudflare**
   - Após adicionar o domínio, o Cloudflare mostrará 2 nameservers
   - Exemplo:
     ```
     leah.ns.cloudflare.com
     matt.ns.cloudflare.com
     ```

3. **Alterar nameservers no GoDaddy**
   - Acesse: https://dns.godaddy.com
   - Selecione **nexastream.org**
   - Clique em "Nameservers" > "Alterar"
   - Selecione "Personalizar"
   - Insira os 2 nameservers do Cloudflare
   - Clique "Salvar"

4. **Aguardar propagação** (até 24-48h, geralmente 5-10 min)

### Passo 2: Configurar DNS no Cloudflare

1. **Acessar DNS do Cloudflare**
   - Acesse: https://dash.cloudflare.com/nexastream.org/dns
   - Clique "Add record"

2. **Adicionar registros DNS:**

#### Frontend (Vercel) - APENAS ESTE!
| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| CNAME | @ | cname.vercel-dns.com | ✅ DNS only |

#### API Backend (Railway/VPS)
| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| A | api | 76.76.21.21 | ✅ DNS only |

#### IPFS Gateway
| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| CNAME | ipfs | cloudflare-ipfs.com | ✅ DNS only |

#### Blockchain RPC
| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| A | rpc | 76.76.21.21 | ✅ DNS only |

#### www (opcional - redirecionar)
| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| CNAME | www | @ | ✅ DNS only |

### Passo 3: Configurar SSL no Cloudflare

1. **SSL/TLS**
   - Acesse: https://dash.cloudflare.com/nexastream.org/ssl-tls
   - Modo: **Full (strict)**
   - Isso garante HTTPS em todo o site

2. **Regras de página (opcional)**
   - Force HTTPS: Crie regra para "http://*nexastream.org/*" → "https://nexastream.org/$1"

---

## Opção 2: GoDaddy Apenas (Sem Cloudflare)

### Passo 1: Acessar DNS do GoDaddy

1. Acesse: https://dns.godaddy.com
2. Selecione **nexastream.org**
3. Clique "Adicionar"

### Passo 2: Adicionar Registros DNS

#### Frontend (Vercel)
| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| CNAME | @ | cname.vercel-dns.com | 1 hora |

#### API Backend
| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | api | IP_DO_SEU_SERVIDOR | 1 hora |

#### IPFS Gateway
| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| CNAME | ipfs | SEU_IPFS_GATEWAY | 1 hora |

#### Blockchain RPC
| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | rpc | IP_DO_SEU_SERVIDOR | 1 hora |

#### www
| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| CNAME | www | @ | 1 hora |

---

## Opção 3: Deploy em Servidor Próprio (VPS)

### Se tiver um VPS (AWS EC2, DigitalOcean, etc.):

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | IP_DO_SEU_VPS | 1 hora |
| A | api | IP_DO_SEU_VPS | 1 hora |
| A | ipfs | IP_DO_SEU_VPS | 1 hora |
| A | rpc | IP_DO_SEU_VPS | 1 hora |
| CNAME | www | @ | 1 hora |

---

## Configuração dos Serviços

### Frontend (Vercel)
```
URL: https://vercel.com/your-username/nexastream
Dominio customizado: nexastream.org, www.nexastream.org
```

### Backend API (Railway)
```
URL: https://backend.railway.app (ou seu domínio customizado)
```

### IPFS Gateway
```
URL: http://localhost:8080 (local) ou seu servidor IPFS
```

---

## Verificar Configuração

### Testar DNS:
```bash
# Frontend
nslookup nexastream.org

# API
nslookup api.nexastream.org

# IPFS
nslookup ipfs.nexastream.org

# RPC
nslookup rpc.nexastream.org
```

### Testar SSL:
```bash
curl -I https://nexastream.org
curl -I https://api.nexastream.org
```

---

## Troubleshooting

### SSL não funciona
1. Aguarde 5-10 min após configurar
2. Verifique se o modo SSL está como "Full"
3. Force HTTPS com regra de página

### Site não carrega
1. Verifique se o Vercel deployou corretamente
2. Check: https://vercel.com/dashboard → seu projeto → Domains

### API não conecta
1. Verifique CORS no backend
2. Backend deve ter: `FRONTEND_URL=https://nexastream.org`

---

## Checklist Final

- [ ] Conta Cloudflare criada
- [ ] Nameservers alterados no GoDaddy
- [ ] Registro CNAME para @ (frontend)
- [ ] Registro A para api.nexastream.org
- [ ] Registro CNAME para ipfs.nexastream.org
- [ ] Registro A para rpc.nexastream.org
- [ ] SSL configurado (Full mode)
- [ ] HTTPS forçado (regra de página)
- [ ] Propagation verificada

---

## URLs de Referência

| Serviço | Setup |
|---------|-------|
| Cloudflare | https://dash.cloudflare.com |
| GoDaddy DNS | https://dns.godaddy.com |
| Vercel | https://vercel.com |
| Railway | https://railway.app |

---

**NexaStream v1.0** - Decentralized Video Platform
