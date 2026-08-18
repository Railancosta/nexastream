# NexaStream — Rede de Vídeo Descentralizada (TESTNET)

> ⚠️ **STATUS: EM DESENVOLVIMENTO** — Testnet local validada. **NÃO está pronto para produção** (Item 42).

## 🚀 Começando

### Pré-requisitos
- Node.js 18+ (recomendado: 20 LTS)
- npm ou yarn
- ffmpeg (para transcoding de vídeos)
- Git

### Instalação

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/Railancosta/nexastream.git
   cd nexastream
   ```

2. **Configurar variáveis de ambiente:**
   ```bash
   # Copiar o arquivo de exemplo
   cp .env.example .env
   
   # Editar o .env com suas configurações
   nano .env  # ou use seu editor preferido
   ```
   
   **⚠️ IMPORTANTE:** 
   - `JWT_SECRET` **deve ser uma chave única e complexa** (mínimo 32 caracteres).
   - Nunca use valores padrão em produção.

3. **Instalar dependências:**
   ```bash
   # Instalar dependências do frontend
   cd apps/web
   npm install
   cd ../..
   
   # Instalar dependências dos serviços (se necessário)
   cd services/auth
   npm install
   cd ../videos
   npm install
   cd ../../
   ```

---

## 🏃 Rodando os Serviços

### Opção 1: Rodar individualmente (para desenvolvimento)

```bash
# Terminal 1: Serviço Core (API principal)
node services/core/server.js &

# Terminal 2: Serviço de Autenticação
node services/auth/server.js &

# Terminal 3: Serviço de Vídeos
node services/videos/server.js &

# Terminal 4: Serviço de Monitoramento
node services/monitor/server.js &

# Terminal 5: Frontend (Next.js)
cd apps/web
npm run dev
```

### Opção 2: Usar Docker (recomendado para produção)

```bash
# Construir e rodar com Docker Compose
docker-compose up -d
```

---

## 📡 Serviços Disponíveis

| Serviço | Porta | Função |
|---|---|---|
| **core** | 3002 | API principal: auth JWT, upload, transcoding (ffmpeg), vídeos, busca |
| **auth** | 3001 | Serviço de autenticação (registro, login, JWT) |
| **videos** | 3003 | Serviço de gerenciamento de vídeos (upload, transcoding, thumbnails) |
| **content** | 3004 | Content addressing: SHA-256, chunks 256KB, integridade, dedup |
| **chain** | 3008 | Blockchain NST: genesis 55M, carteiras secp256k1, PoW, verify |
| **explorer** | 3009 | Explorer + creator economy (1 NST/view, anti-fraud) |
| **monitor** | 3010 | Observabilidade (Item 27) |
| **web** | 3000 | Frontend Next.js |
| **p2p** | 3005+ | Nós P2P: discovery, chunks, integridade, sobrevivência a falha |

---

## 🔒 Segurança

### ✅ Boas Práticas Implementadas
- **JWT com expiração** (7 dias para tokens de autenticação).
- **Hash de senhas** com `crypto.pbkdf2Sync` (SHA-512, 10000 iterações).
- **Prepared Statements** em todas as consultas SQL (prevenção de SQL Injection).
- **Sanitização de inputs** (prevenção de XSS).
- **CORS restritivo** (apenas domínios permitidos).
- **Rate Limiting** (100 requisições/15min por IP).
- **Limite de upload** (100MB máximo).
- **Validação de arquivos** (apenas tipos de vídeo permitidos).
- **Headers de segurança** (HSTS, CSP, X-XSS-Protection, etc.).

### ⚠️ Configurações Obrigatórias para Produção

1. **Configurar `JWT_SECRET`:**
   ```bash
   # Gerar uma chave segura (Linux/macOS)
   openssl rand -hex 32
   
   # Ou use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Configurar `ALLOWED_ORIGINS`:**
   ```env
   ALLOWED_ORIGINS=https://nexastream.org,https://www.nexastream.org
   ```

3. **Usar HTTPS:**
   - Configure um proxy reverso (Nginx, Apache) com SSL/TLS.
   - Ou use serviços como Vercel, Netlify, ou Railway que oferecem HTTPS automático.

4. **Nunca exponha o `.env`:**
   - Adicione `.env` ao `.gitignore` (já está incluído).
   - Nunca faça commit do `.env`.

---

## 🛡️ Vulnerabilidades Corrigidas

| Vulnerabilidade | Status | Solução |
|----------------|--------|---------|
| Hardcoded JWT_SECRET | ✅ Corrigido | Usa variável de ambiente |
| SQL Injection | ✅ Corrigido | Prepared Statements |
| CORS Aberto | ✅ Corrigido | Lista de domínios permitidos |
| XSS | ✅ Corrigido | Sanitização de inputs |
| Upload sem validação | ✅ Corrigido | Limite de tamanho + validação de tipo |
| Rate Limiting | ✅ Adicionado | express-rate-limit |
| Headers de Segurança | ✅ Adicionado | HSTS, CSP, X-XSS-Protection |

---

## 📦 Estrutura do Projeto

```
nexastream/
├── apps/
│   ├── web/          # Frontend Next.js
│   └── site/         # Site estático (Next.js)
├── services/
│   ├── auth/         # Autenticação (JWT, registro, login)
│   ├── core/         # API principal
│   ├── videos/       # Gerenciamento de vídeos
│   ├── content/      # Content addressing
│   ├── chain/        # Blockchain NST
│   ├── explorer/     # Blockchain Explorer
│   ├── monitor/      # Observabilidade
│   └── ...          # Outros serviços
├── blockchain/
│   └── ...          # Implementação da blockchain
├── p2p/
│   └── ...          # Rede P2P
├── database/
│   └── nexastream.db # Banco de dados SQLite
├── storage/
│   ├── videos/      # Vídeos uploadados
│   └── thumbs/      # Thumbnails
├── docs/
│   └── ...          # Documentação
└── .env.example     # Variáveis de ambiente
```

---

## 🤝 Contribuindo

1. **Fork** o repositório.
2. **Crie uma branch** para sua feature (`git checkout -b feature/nova-feature`).
3. **Faça commit** das suas mudanças (`git commit -m 'Adiciona nova feature'`).
4. **Push** para a branch (`git push origin feature/nova-feature`).
5. **Abra um Pull Request**.

---

## 📄 Licença

MIT License — Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Contato

- **Website:** [https://nexastream.org](https://nexastream.org)
- **GitHub:** [https://github.com/Railancosta/nexastream](https://github.com/Railancosta/nexastream)
