# NexaStream — Network Status (Single Source of Truth)

> Atualizado em: 2026-08-14

## Estado atual

```
Network status: MAINNET LIVE — BLOCKS BEING PRODUCED
Chain ID:        nexastream-testnet-1
Genesis hash:   000a0c85ba4fce34f78cd547d2527e005051c46bb8f3a762fad6f545a3b19c41
Block reward:   50 NST per block
Block interval: 10s
Supply cap:     55,000,000 NST (invariant enforced)
Validator:      solo-validator-1 (independent RSA key pair)
RPC:             http://localhost:9001
```

## Como rodar o validator

```bash
cd nexastream
git pull origin main
node packages/blockchain/solo-validator.mjs --port 9001 --interval 10000
```

## RPC Endpoints

- `GET /health` — status da rede
- `GET /status` — info do validador
- `GET /blocks` — lista de blocos
- `GET /accounts` — saldos de todas as contas
- `GET /balance/:address` — saldo de uma conta
- `GET /metrics` — métricas
- `GET /explorer` — explorer (blocos recentes)

## Métricas

- Total de testes: 224 passando
- Vulnerabilidades críticas: 0
- Bloqueadores: 0
