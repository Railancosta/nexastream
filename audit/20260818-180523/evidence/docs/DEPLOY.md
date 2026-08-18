# Deploy Guide (Itens 28/42/49)
## Nodo backend (qualquer maquina real com Docker)
git clone https://github.com/Railancosta/nexastream && cd nexastream
git checkout v0.1-testnet
docker compose up -d --build
docker exec nexastream-node bash scripts/health-check.sh   # health verification
## Rollback
git fetch --tags && bash scripts/rollback.sh v0.1-testnet
## Versioning
Toda release = tag git (vX.Y-testnet). Producao sempre aponta para uma tag, nunca para main.
## Status mainnet
NAO PRONTO (docs/MAINNET_READINESS.md). Este deploy eh TESTNET.
