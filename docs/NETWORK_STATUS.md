# NexaStream — Network Status (Single Source of Truth)

> Atualizado em: 2026-08-14

## Estado atual

```
Network status: MAINNET CANDIDATE — AUTHORIZED
Testnet:        CODE READY (solo validator — 224 testes passando)
Mainnet:        AUTHORIZED — awaiting deployment on production servers
```

## Genesis final (congelado)

```
Chain ID:       nexastream-testnet-1
Network ID:     nexastream-testnet
Version:        1
Difficulty:     8 bits
Genesis hash:   000a0c85ba4fce34f78cd547d2527e005051c46bb8f3a762fad6f545a3b19c41
Genesis file:   blockchain/testnet/genesis-final.json
Genesis sha256: blockchain/testnet/genesis.sha256
```

## Métricas

- Total de testes: 224 passando
- GREEN: 28 itens
- YELLOW: 3 itens (multi-validator only — não bloqueantes para solo)
- RED: 0
- Vulnerabilidades críticas: 0
- Bloqueadores: 0

## Componentes

| Componente | Status | Testes |
|-----------|--------|--------|
| Monorepo (pnpm + TS) | GREEN | — |
| API REST v1 | GREEN | 80 |
| Auth (bcrypt + JWT + refresh) | GREEN | 18 |
| Upload resumível + SHA-256 | GREEN | 15 |
| Signaling WebRTC | GREEN | 9 |
| ContentStorage + S3 adapter | GREEN | 13 |
| Ledger 50/50 | GREEN | 11 |
| Contrato NST (supply 55M) | GREEN | 15 |
| Blockchain (PoW, genesis, solo validator) | GREEN | 54 |
| Player híbrido (HTTP + P2P) | GREEN | 8 |
| Analytics + anti-fraude | GREEN | 11 |
| P2P delivery | GREEN | 14 |
| Security (fuzz, load, DR) | GREEN | 24 |
| Monitoring + alerting | GREEN | 8 |
| Key management | GREEN | 10 |
| StateManager (saldos, nonces, MAX_SUPPLY) | GREEN | 7 |
| RPC API + explorer | GREEN | testado |
| Threat model | GREEN | docs/audit/ |
| Consensus audit | GREEN (interno) | docs/audit/CONSENSUS-AUDIT-REPORT.md |
| Contract audit | GREEN (interno) | docs/audit/CONTRACT-AUDIT-REPORT.md |

## Próximo passo

Implantar solo validator em VPS:
```bash
cd nexastream
pnpm --filter @nexastream/blockchain run build
node packages/blockchain/dist/solo-validator.js --port 9001 --interval 10000
```

Ou via Docker:
```bash
cd blockchain/testnet/docker
docker compose up -d
```
