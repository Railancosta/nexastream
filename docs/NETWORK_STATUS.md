# NexaStream — Network Status (Single Source of Truth)

> **Este arquivo reflete o estado REAL e verificável do código.**  
> Não mostre nenhum status diferente deste no website ou README.  
> Atualizado em: 2026-08-13.

## Estado atual

| Componente | Estado | Evidência |
|---|---|---|
| API REST v1 (health/version/upload) | **Development — IMPLEMENTADO** | `apps/api`, testes passam. |
| Signaling WebRTC | **Development — IMPLEMENTADO** | `apps/signaling`, testes passam. |
| Banco de dados (PostgreSQL) | **Não implementado** | Sem migrations. |
| Auth (JWT) | **Não implementado** | Será no Módulo 2. |
| Frontend / player | **Protótipo (C)** | `nexastream/` existe, sem integração API v1. |
| Smart contracts NST | **Protótipo (C/E)** | Cópias não consolidadas, sem testes. |
| Blockchain (NexaChain) | **Protótipo (C/B)** | Consenso não auditado. |
| Testnet | **NÃO VALIDADO** | Sem 3 validadores independentes verificados. |
| Mainnet | **BLOQUEADA** | Checklist não verde. |

## Status da rede (verdadeiro)

```
Network status: DEVELOPMENT
Testnet:        NOT VALIDATED
Mainnet:        BLOCKED (MAINNET CANDIDATE não atingido)
```

- **NÃO** declarar "Mainnet Live".
- **NÃO** declarar "Testnet Online".
- Os estados permitidos são: `Development`, `Testnet`, `Candidate`, `Production`, `Mainnet`.

## Roadmap técnico

### Completed
- [x] Monorepo (pnpm workspace, TypeScript estrito)
- [x] API `/api/v1/health`, `/api/v1/version`, `/api/v1/live`, `/api/v1/ready`
- [x] Upload resumável (init/chunk/complete/status) com chunking e SHA-256 server-side
- [x] Content-addressed storage (`ContentStorage` interface + `LocalContentStorage`)
- [x] Signaling WebRTC (WebSocket, protocolo validado, room-manager, rate-limit)
- [x] Testes de signaling e upload/chunking

### In Progress
- [ ] Auth/JWT, usuários, persistência (Módulo 2)
- [ ] Banco PostgreSQL com migrations versionadas (Módulo 2)
- [ ] Storage adapter S3-compatible (Módulo 2)

### Planned
- [ ] Frontend + player híbrido (Módulo 3)
- [ ] Feed, busca, comentários, likes, subscriptions (Módulo 4)
- [ ] Analytics, anti-fraude, ledger 50/50 (Módulo 5)
- [ ] P2P delivery via WebRTC (Módulo 6)
- [ ] CI/CD, website, monitoring, deploy (Módulo 7)
- [ ] Contratos NST (rewards/treasury/staking) com testes (Módulo 8)
- [ ] Testnet: genesis, 3 validadores independentes (Módulo 9)
- [ ] Security validation, load tests, DR, backups (Módulo 10)

### Blocked
- [ ] **Mainnet** — bloqueada até: testnet estável + checklist 100% verde + auditoria.

### Requires Audit
- [ ] NexaChain (Go) — consenso
- [ ] Smart contracts NST — antes de testnet/mainnet
