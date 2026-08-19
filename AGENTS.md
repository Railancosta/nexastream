# NexaStream — Notas para agentes

## Stack
- Backend: Node.js zero-dependências (`node:http` + `node:sqlite` DatabaseSync) em `services/*/server.js`. Core na porta 3002 exige `JWT_SECRET` no ambiente, senão aborta.
- Frontend: Next.js 16 (Turbopack) + Tailwind v4 em `apps/web`. Build: `npm run build` (STATIC_EXPORT=1 gera estático).
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
