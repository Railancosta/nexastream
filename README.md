# NexaStream — Rede de Vídeo Descentralizada (TESTNET)

> ⚠️ **STATUS: EM DESENVOLVIMENTO** — Testnet local validada. **NÃO está pronto para produção** (Item 42).

## 🎬 v3.1 — Real Upload via Cloudflare R2 (2026-08)

Novidades nesta versão:

- **Upload real para R2** — página `/upload/` reformulada com drag-and-drop, barra de progresso e metadados (título, descrição, categoria, thumbnail).
- **Presigned uploads (S3 SigV4)** — o navegador envia o arquivo **direto para o R2** via URL assinada (sem passar pelo Worker), com suporte a **multipart upload** para arquivos grandes (partes de 25 MB, até 4 GB).
- **Proxy fallback** — se as credenciais S3 não estiverem configuradas, o Worker recebe os bytes via `PUT /api/upload/proxy` e grava no bucket pela binding `BUCKET`.
- **Streaming com Range** — `GET/HEAD /api/videos/stream/:r2Key` serve os vídeos do R2 com suporte a `Range` (seeking no player); thumbnails via `/api/videos/thumb/:r2Key`.
- **Registro no D1** — `POST /api/upload/complete` registra o objeto no banco; o vídeo aparece automaticamente no feed, busca, categorias e relacionados.
- **Backend v3.1** — módulo `workers/api/src/s3.ts` (assinatura SigV4 com WebCrypto, sem dependências), tabela `pending_uploads`, colunas `r2_key`/`file_size`/`mime_type`/`thumb_r2_key` em `videos`.

**Deploy:** veja [DEPLOYMENT.md](DEPLOYMENT.md) — seção 7 cobre criação do bucket R2, CORS, secrets e verificação do fluxo.

---

## 🎬 v3.0 — Platform Update (2026-08)

Novidades nesta versão:

- **Categorias** — página `/categories` com navegação por gênero (Tecnologia, Crypto, Games, Web3…), chips com contagem e filtro no feed inicial.
- **Minha Biblioteca** — página `/watchlist` com abas **Assistir depois** e **Favoritos** (localStorage-first, sincroniza com a API quando autenticado).
- **Watch page reformulada** — botões Curtir / Assistir depois / Favoritar, seção **Relacionados** na sidebar, canal + inscrição.
- **Busca avançada** — filtros por categoria, tipo (vídeo/short) e ordenação, além de termos em alta.
- **Backend v3.0** — novos endpoints: `/api/categories`, `/api/videos/:id/related`, `/api/watchlist`, `/api/favorites`, `/api/history`; busca com filtros; feed `trending`; estado do viewer no detalhe do vídeo.
- **Design system v2** — glassmorphism, hover lift, shimmer skeleton, animações, skin escura do video.js, PWA com shortcuts.

**Deploy:** veja [DEPLOYMENT.md](DEPLOYMENT.md) para instruções completas (Cloudflare Pages + Workers + D1).

---

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

### Endpoints principais (core)

| Endpoint | Método | Função |
|---|---|---|
| `/api/feed?tab=all|shorts|videos&viewer=<id>` | GET | Feed inteligente: ranking por engajamento (likes, conclusões), taxa de conclusão, views, recência e jitter de exploração por espectador. Separa `shorts` (≤60s ou vertical 9:16) de `videos` |
| `/api/videos` | GET | Últimos vídeos prontos (cronológico) |
| `/api/videos/:id` | GET | Detalhe + incrementa views |
| `/api/videos/:id/like` | POST | Curtir (alimenta o ranking) |
| `/api/videos/:id/watch` | POST | Telemetria de watch time/conclusão (alimenta o ranking) |
| `/api/videos/upload?title=&description=&type=short|video&duration=` | PUT | Upload (auth). Detecta duração/resolução via ffprobe e classifica Short automaticamente |
| `/api/search?q=` | GET | Busca textual em título/descrição |
| `/api/geo` | GET | Detecção de idioma por IP (CF-IPCountry) / Accept-Language |
| `/api/translate` | POST | Tradução de títulos/descrições via LibreTranslate self-hosted (`TRANSLATE_URL`) |

No desenvolvimento, o Next.js faz proxy same-origin de `/api/*` e `/storage/*` para o core (`CORE_API_URL`, padrão `http://localhost:3002`) — sem CORS e sem configuração extra no celular.

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
3. **Faça commit** das mudanças (`git commit -m 'Adiciona nova feature'`).
4. **Push** para a branch (`git push origin feature/nova-feature`).
5. **Abra um Pull Request**.

---

## 📄 Licença

MIT License — Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Contato

- **Website:** [https://nexastream.org](https://nexastream.org)
- **GitHub:** [https://github.com/Railancosta/nexastream](https://github.com/Railancosta/nexastream)
