# NexaStream — Network Status (Single Source of Truth)

> **Este arquivo reflete o estado REAL e verificável do código.**  
> Atualizado em: 2026-08-14.

## Estado atual

| Componente | Estado | Evidência |
|---|---|---|
| Monorepo (pnpm + TS) | ✅ Implementado | `package.json`, `pnpm-workspace.yaml` |
| API REST v1 (health/upload/auth) | ✅ Implementado | `apps/api`, 39 testes |
| Upload resumível + chunking + SHA-256 | ✅ Implementado | `apps/api/src/services/upload-manager.ts` |
| Signaling WebRTC | ✅ Implementado | `apps/signaling`, 9 testes |
| Auth (bcrypt + JWT + refresh) | ✅ Implementado | `apps/api/src/services/auth/`, 18 testes |
| Migration PostgreSQL (users + refresh_tokens) | ✅ Implementado | `apps/api/src/migrations/001_initial.sql` |
| Content addressing (ContentStorage) | ✅ Implementado | `packages/shared/src/storage/` |
| Ledger 50/50 (idempotente, sem float) | ✅ Implementado | `packages/economics/`, 11 testes |
| Contrato NST (Solidity, supply 55M) | ✅ Implementado | `contracts/nst/`, 15 testes |
| Blockchain (PoW, genesis, 3 validadores) | ✅ Implementado | `packages/blockchain/`, 19 testes |
| Player híbrido (HTTP + P2P) | ✅ Implementado | `apps/web/src/lib/hybrid-player.ts`, 8 testes |
| Security (fuzzing, SQL/XSS, tamper) | ✅ Implementado | `packages/security/`, 24 testes |
| Load tests (1000 events, 100 blocks) | ✅ Implementado | `packages/security/test/load.test.ts` |
| Disaster recovery (backup/restore) | ✅ Implementado | `packages/security/test/disaster-recovery.test.ts` |
| Android APK build | 🚧 Workflow criado | `.github/workflows/build-apk.yml` |
| Frontend completo (feed, busca, etc) | 🚧 Planejado | Módulo 4 |
| Testnet pública | ❌ Não implantada | Requer deploy + estabilidade |
| Mainnet | ❌ Bloqueada | Checklist não verde |

## Total de testes: 116 passando

## Status da rede

```
Network status: DEVELOPMENT (Foundation + Auth + Blockchain complete)
Testnet:        NOT DEPLOYED (code exists, not running on network)
Mainnet:        BLOCKED (audit + stability required)
```

## Genesis da testnet (determinístico)

```
Chain ID:    nexastream-testnet-1
Network ID:  nexastream-testnet
Version:     1
Difficulty:  8 bits
Validators:  3 independentes (validator-1, validator-2, validator-3)
```
