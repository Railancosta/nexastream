# 🚀 Deploy NexaStream no GoDaddy - Guia Completo

## 📦 Arquivos Preparados

Local: `/workspace/project/nexastream/frontend/out/`

Arquivo compactado: `nexastream-deploy.tar.gz` (217KB)

---

## 📋 Passo a Passo

### 1️⃣ Acesse o GoDaddy

1. Vá para https://dcc.godaddy.com
2. Faça login na sua conta
3. Selecione o domínio **nexastream.org**

---

### 2️⃣ Configurar Hospedagem

Se você já tem hospedagem web ativa:
1. Clique em **"Hospedagem Web"**
2. Gerenciar

Se não tem:
1. Vá em **Produtos** → **Hospedagem Web**
2. Adicione uma nova hospedagem
3. Selecione o plano adequado

---

### 3️⃣ Upload dos Arquivos

#### Opção A: File Manager (Mais Fácil)

1. No painel de hospedagem, clique em **"File Manager"**
2. Abra a pasta **"public_html"**
3. **DELETE** todos os arquivos existentes (exceto .htaccess se existir)
4. Clique em **"Upload"**
5. Arraste e solte **TODOS os arquivos da pasta `out/`**

#### Opção B: FTP

1. Obtenha as credenciais FTP:
   - Vá em **Hospedagem Web** → **Configurações** → **Acesso FTP**
   - Crie um usuário ou use o existente

2. Use um cliente FTP (FileZilla, Cyberduck):
   ```
   Host: ftp.nexastream.org
   Username: seu-usuario
   Password: sua-senha
   Port: 21
   ```

3. Navegue até `public_html`
4. Delete arquivos antigos
5. Upload da pasta `out/`

---

### 4️⃣ Verificar Arquivos

Após upload, a pasta `public_html` deve conter:

```
public_html/
├── .htaccess          ✅ (configuração do site)
├── index.html         ✅ (página principal)
├── 404.html           ✅ (página de erro)
├── index.txt
└── _next/            ✅ (arquivos JS/CSS)
    └── static/
    └── ...
```

---

### 5️⃣ Configurar DNS

No painel GoDaddy:

1. Vá em **DNS** → **Gerenciar DNS**

2. Adicione/Edite estes registros:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | IP do servidor | 600 |
| CNAME | www | @ | 600 |

**Para encontrar o IP do servidor:**
- Vá em **Hospedagem Web** → **Detalhes**
- Procure por "Endereço IP"

---

### 6️⃣ SSL/HTTPS

1. No painel de hospedagem, vá em **SSL/TLS**
2. Ative o certificado **Let's Encrypt** (gratuito)
3. Force HTTPS:
   - No File Manager, edite o `.htaccess`
   - Adicione no início:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

### 7️⃣ Testar

Aguarde 5-30 minutos para propagação DNS.

Teste em:
- https://nexastream.org
- https://www.nexastream.org

---

## 🔧 Backend/API

O site está configurado como **site estático** (HTML/CSS/JS).

Para o **backend funcionar**, você precisa:

### Opção A: Hospedar Backend Separadamente

1. **Railway** (Recomendado - Free tier):
   - https://railway.app
   - Deploy do `backend/`
   - Pegue a URL

2. Depois, no frontend, configure a API URL:
   - Edite `/out/index.html` (não recomendado)
   - Ou use variáveis de ambiente no build

### Opção B: API Externa

O site já está configurado para buscar dados da API.
Sem backend, ele usa **dados mock** (demonstração).

---

## ❌ Troubleshooting

### "Site não carrega"
- Verifique se os arquivos estão em `public_html`
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique DNS em https://dnschecker.org

### "Página em branco"
- Verifique se `index.html` está presente
- Verifique o `.htaccess`

### "Erro de CSS/JS"
- Verifique se a pasta `_next/` foi transferida completamente
- Use modo de transferência **Binary** no FTP

### "SSL inválido"
- Aguarde até 24h para emissão do certificado
- Force HTTPS no .htaccess

---

## 📞 Suporte GoDaddy

- Brasil: 0800 891 3819
- Email: suporte@godaddy.com
- Chat: Available 24/7

---

## ✅ Checklist Final

- [ ] Arquivos enviados para public_html
- [ ] .htaccess configurado
- [ ] DNS configurado
- [ ] SSL ativado
- [ ] Site carregando em https://nexastream.org

---

**NexaStream v1.0** - Decentralized Video Platform
