# NexaStream — Component Classification

**Data:** 2026-08-13  
**Responsável:** CTO autônomo (engenharia)  
**Regra:** uma funcionalidade só é "IMPLEMENTADA" quando existe código, compila, testes passam e o comportamento foi validado. "PRODUCTION READY" e "MAINNET READY" exigem gate adicional.

Cada componente existente no repositório foi classificado (A–F):

- **A — Implementado e testado**
- **B — Implementado parcialmente**
- **C — Protótipo**
- **D — Apenas documentação**
- **E — Placeholder / código fictício**
- **F — Obsoleto**

## Classificação

| Camada / Componente | Caminho | Classe | Observação |
|---|---|---|---|
| Monorepo raiz (pnpm workspace) | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` | **A** | Adicionado nesta entrega. Build/teste via `pnpm -r`. |
| API REST v1 (health/version) | `apps/api/src/routes/health.ts` | **A** | `/live`, `/ready`, `/health`, `/version`. Testes passam. |
| Upload resumável + chunking | `apps/api/src/services/upload-manager.ts` | **A** | init/chunk/complete/status; validação de índice, duplicata, expiração. |
| Content addressing (SHA-256) | `apps/api/src/storage/local-storage.ts`, `crypto.ts` | **A** | Hash calculado no servidor; `expectedSha256` comparado, não confiável. |
| Contrato `ContentStorage` | `packages/shared/src/storage/index.ts` | **A** | Interface `put/get/has/delete`. |
| Protocolo de signaling (Zod) | `packages/shared/src/signaling/index.ts` | **A** | Schemas estritos; rejeita JSON arbitrário. |
| Servidor de signaling WebRTC | `apps/signaling/src/` | **A** | WS, room-manager, rate-limit, peer-id no servidor, cleanup. |
| Auth (register/login/logout/JWT) | — | **E / Não implementado** | Não existe nesta entrega. O legado `backend/src/routes/auth.js.bak` e `.js` é **B/C** (CommonJS/ESM misturados, não compila junto). Será implementado no Módulo 2. |
| Banco de dados (PostgreSQL) | — | **Não implementado** | Não existe nesta entrega. O legado `backend/src/db/` usa SQLite/better-sqlite3 (**C**). Migration versionada será criada no Módulo 2. |
| Frontend (Next.js) | `frontend/`, `nexastream/` | **C / B** | Existem dois frontends. `nexastream/` (App Router) é protótipo. Não há player nem integração com a API v1. |
| Player híbrido (CDN+P2P) | — | **Não implementado** | Módulo 3 (plano). |
| Feed / busca / comentários / likes / subs | — | **Não implementado** | Módulo 4 (plano). |
| Analytics / anti-fraude / ledger 50/50 | — | **Não implementado** | Módulos 4–5 (plano). |
| P2P delivery (WebRTC data) | — | **Não implementado** | Signaling existe (A); entrega de vídeo P2P é Módulo 6. |
| Storage IPFS adapter | — | **Não implementado** | A interface existe (A); o adapter IPFS não. NÃO declarar suporte IPFS. |
| Smart contracts NST | `contracts/`, `nexastream/contracts/`, `nexachain/contracts/solidity/NSTToken.sol` | **C / E** | Múltiplas cópias não consolidadas. Sem bateria de testes verificada. Módulo 8. |
| Blockchain NexaChain (Go) | `nexachain/` | **C / B** | Código Go com `go.mod`. Consenso não auditado. NÃO é mainnet-ready. |
| Blockchain (JS) | `blockchain/src/` | **C** | Protótipo didático. |
| Testnet | `testnet/`, `mainnet/` | **D / E** | `genesis.json` existe, mas não há 3 validadores independentes com identidade própria verificada. Status real: **NÃO VALIDADO**. |
| Mainnet | `mainnet/` | **E / Não lançada** | Nenhum checklist de mainnet verde. Estado: **MAINNET CANDIDATE: BLOQUEADA**. |
| CI/CD | `.github/workflows/` | **B** | Workflows existem, mas referenciam `npm run lint` ausente em vários pacotes. Novo workflow do monorepo nesta entrega. |
| Docker / k8s | `docker/`, `k8s/` | **C / B** | Manifestos existem; não validados como produção-ready. |
| Observabilidade (Prometheus/Grafana) | `monitoring/` | **C** | Parcial. |

## Inconsistências detectadas (violações de "não inventar implementação")

1. `STATUS.md` declara "PROJECT COMPLETE", "100% Complete" em todos os componentes e "Mainnet Ready 100%". **Isso não é comprovado** — o backend legado mistura `require()` (CommonJS) em `server.js` com `import` (ESM) em `routes/upload.js`, não podendo compilar como está.
2. `README.md` exibe badges "v2.0" e "100% Decentralized" sem evidência no código.
3. Dois frontends duplicados (`frontend/` e `nexastream/`).
4. Três bases de contratos não consolidadas (`contracts/`, `nexastream/contracts/`, `nexachain/contracts/solidity/`).
5. `mainnet/genesis.json` existe sem checklist verde e sem validadores independentes verificados.

## Decisão técnica (ADR resumida)

- **Não apagar** o legado nesta entrega. Construir a fundação nova em `apps/` + `packages/` (monorepo pnpm, TypeScript estrito, ESM).
- Classificar o legado acima. Migração incremental nos módulos seguintes.
- `STATUS.md` e `README.md` serão corrigidos para refletir o estado real (não removidos — preservam histórico).
