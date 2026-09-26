# NexaStream — Notas para agentes

## Stack
- Backend: Node.js zero-dependências (`node:http` + `node:sqlite` DatabaseSync) em `services/*/server.js`. Core na porta 3002 exige `JWT_SECRET` no ambiente, senão aborta.
- Frontend: o app Next.js 16 + Tailwind v4 é a **raiz do repo** (`src/app`, build `npm run build`). `apps/web` é só um PWA estático (index.html + app.js + style.css, build `node build.mjs` que gera `out/`). `apps/site` é o portal público, também Next.
- Android: app nativo Kotlin + Compose em `apps/android` (`./gradlew :app:testDebugUnitTest`, `:app:assembleDebug`).
- Transcoding: ffmpeg/ffprobe precisam estar no PATH (no sandbox, binário estático instalado em /usr/local/bin a partir de johnvansickle.com).

## Feed inteligente
- `GET /api/feed?tab=all|shorts|videos&viewer=<id>` no core ranqueia por engajamento (likes*3 + completions*2), taxa de conclusão, log(views), decaimento de recência (~7d) e jitter determinístico por espectador/dia. Short = `is_short` (≤60s ou vertical, detectado via ffprobe no upload).
- Engajamento: `POST /api/videos/:id/like` e `POST /api/videos/:id/watch {seconds, completed}`.

## Frontend
- Base da API em `src/lib/api.ts` (`apiBase()`): same-origin por padrão; override via `?api=` ou localStorage `ns_api`. O `next.config.ts` faz rewrite de `/api/*` e `/storage/*` para `CORE_API_URL` (padrão localhost:3002).
- Tema é escuro fixo: regras de body ficam em `@layer base` em globals.css (CSS fora de camada sobrescreve utilities do Tailwind v4).
- Mobile: BottomNav (`md:hidden`) com botão central de upload; shorts em `/shorts` (snap vertical fullscreen); viewport exportado no layout.
- Páginas novas precisam de Suspense ao usar `useSearchParams` (ex.: `/shorts`, `/search`).
- tsconfig target é ES2020 (necessário p/ BigInt literals em `nano/page.tsx`).

## Gotchas
- Ao reiniciar `next start`, mate o processo `next-server` antigo (bind EADDRINUSE silencioso se o novo falhar).
- Remova `.next/` e `tsconfig.tsbuildinfo` após mudar tsconfig ou instalar deps de PostCSS (cache de build fica stale).
- package.json de apps/web originalmente não listava tailwind/typescript/video.js — já adicionados como deps.
- Banco SQLite em `database/nexastream.db` (gitignored); migrações de colunas via ALTER TABLE com try/catch no boot do core.

## Sessão 2 (i18n + proxy + fixes)
- Proxy: next.config.ts roteia /api/<prefixo> para cada microsserviço (SERVICES_HOST/SVC_<porta>_URL). Nunca hardcodar URL absoluta em página — sempre same-origin.
- i18n: src/lib/i18n.ts (useI18n, translateTexts, detectLang). Idioma: localStorage nst_lang > /api/geo (CF-IPCountry) > navigator.language. Conteúdo traduz via TRANSLATE_URL (LibreTranslate) no core.
- Serviços com type:module + server.js CJS foram renomeados p/ server.cjs (moderation, kpi, live, analytics).
- nanocurrency v2 é ASYNC: await generateSeed()/deriveSecretKey(seed, 0); endereço via deriveAddress (prefixo xrb_ -> trocar p/ nano_).
- database/nano-treasury.json contém SEED — gitignored, nunca commitar.

## Sessão 3 (Android + monetização + correções de infra)
- **Colisão de tabela `wallets`**: core e chain compartilham `database/nexastream.db`. O core cria `wallets(owner_id, nst_micro, ...)` e o chain criava `wallets(address, pubkey, privkey, ...)`. Como `CREATE TABLE IF NOT EXISTS` mantém a primeira, o chain quebrava no boot com "table wallets has 10 columns but 4 values were supplied". A tabela do chain agora é `chain_wallets` (também usada por explorer.js e bounty/server.js). Nunca reutilize nome de tabela entre serviços que abrem o mesmo arquivo.
- **Rede**: chain/explorer reportavam `network: 'mainnet'` fixo. Agora usam `NS_NETWORK` (padrão `testnet`). Só defina `NS_NETWORK=mainnet` após os gates da Fase 6.
- **apps/web NÃO é Next**: é um PWA estático (index.html + app.js + style.css). Não tem `app/` nem `pages/`, então `next build` sempre falhava. O build agora é `node build.mjs` (monta `out/`, que CI e deploy-site consomem). `style.css` estava faltando e foi recriado.
- **apps/site tem postcss.config.mjs próprio** (plugins vazios) para não herdar o Tailwind da raiz. Sem isso, o build do site falha quando o `node_modules` da raiz não existe — que é exatamente o caso do CI.
- **CI**: job `android` precisa de `packages:` explícito no setup-android (o pacote `tools` não existe mais e o sdkmanager pré-instalado é antigo). O job de chain precisa subir `explorer.js` junto, senão 7 testes do explorer falham. Job `platform` adicionado para buildar o app Next da raiz.
- **Secret Scan**: em execução `schedule` não existe `github.event.before`, então o diff comparava o branch com ele mesmo e o TruffleHog falhava. Agora o scan agendado usa histórico completo.
- Contract test (`apps/android/contract-test.mjs`) valida os campos que os parsers Android leem; se renomear rota/campo, ele quebra antes do device.

