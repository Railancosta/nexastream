# NexaStream

Rede de vídeo descentralizada: plataforma de vídeo + rede P2P (WebRTC) + armazenamento distribuído (content-addressed) + blockchain nativa NST (supply máx. 55.000.000) + economia 50/50 (criadores/NexaStream).

> ⚠️ **Estado real da rede: `DEVELOPMENT`.**  
> Não há mainnet e a testnet não está validada. Veja [`docs/NETWORK_STATUS.md`](docs/NETWORK_STATUS.md).

## Estado por componente

| Componente | Estado | Detalhe |
|---|---|---|
| Monorepo (pnpm + TS) | ✅ Implementado | workspace, tsconfig estrito |
| API REST v1 | ✅ Implementado | health/version + upload resumível |
| Upload + chunking + SHA-256 | ✅ Implementado | server-side hashing, validação |
| Signaling WebRTC | ✅ Implementado | WebSocket, protocolo validado |
| Banco de dados (PostgreSQL) | 🚧 Planejado | Módulo 2 |
| Auth (JWT) | 🚧 Planejado | Módulo 2 |
| Frontend / player híbrido | 🚧 Planejado | Módulo 3 |
| Smart contracts NST | 🧪 Protótipo | não auditado |
| Blockchain (NexaChain) | 🧪 Protótipo | consenso não auditado |
| Testnet | ❌ Não validada | requer 3 validadores |
| Mainnet | ❌ Bloqueada | checklist não verde |

Classificação A–F de todos os componentes: [`docs/CLASSIFICATION.md`](docs/CLASSIFICATION.md).

## Stack

- **Node.js 22 LTS** (ver `.nvmrc`), **TypeScript estrito (ESM)**, **pnpm**.
- Backend: Express + Zod.
- Storage: interface `ContentStorage` (SHA-256); primeira implementação local.
- Signaling: WebSocket (`ws`), protocolo com Zod.

## Ambiente de desenvolvimento

```bash
git clone https://github.com/Railancosta/nexastream.git
cd nexastream
cp .env.example .env   # preencha JWT_SECRET com >=32 chars
pnpm install
pnpm build
pnpm test
```

Rodar os serviços localmente (terminais separados):

```bash
pnpm --filter @nexastream/api dev        # API em :4000
pnpm --filter @nexastream/signaling dev  # signaling em :4010
```

## Estrutura

```
apps/
├── api/          # REST /api/v1 (health, version, uploads)
└── signaling/    # servidor WebSocket WebRTC signaling
packages/
└── shared/       # ContentStorage + protocolo de signaling (Zod)
docs/
├── CLASSIFICATION.md   # classificação A–F do código
└── NETWORK_STATUS.md  # status real da rede (single source of truth)
```

O legado existente (`backend/`, `nexachain/`, `contracts/`, `frontend/`, `nexastream/`, etc.) **não foi removido** — está classificado e será migrado incrementalmente. Nenhuma funcionalidade é declarada como pronta sem código que compila e testes que passam.

## Segurança

- Nenhum segredo no repositório (ver `.env.example`).
- `JWT_SECRET` é obrigatório e deve ter ≥32 caracteres; a API falha ao iniciar sem ele.
- CORS estrito (sem `*` em produção).
- Inputs validados com Zod; JSON arbitrário é rejeitado no signaling.
- SHA-256 calculado no servidor; hash do cliente é comparado, nunca confiável.

## Licença

`LICENSE.md` (preservada).

---

BUILD THE NETWORK. EMPOWER CREATORS. DECENTRALIZE VIDEO.
