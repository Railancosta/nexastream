# IPFS Kubo Node — Storage Proprio 100% Ilimitado e Gratuito

## O que e
IPFS com Kubo (go-ipfs) e um no de storage descentralizado P2P:
- ILIMITADO — sem limite de storage
- GRATUITO — sem custos de egress, storage ou operacoes
- DESCENTRALIZADO — conteudo distribuido entre nos P2P
- CONTENT-ADDRESSED — cada arquivo enderecado pelo seu CID

## Setup Rapido (Docker)
docker compose -f infrastructure/ipfs/docker-compose.ipfs.yml up -d

## Setup VPS
ipfs init --profile server
ipfs config Datastore.StorageMax 0
ipfs daemon --enable-gateway &

## Configuracao backend
IPFS_API_URL=http://localhost:5001/api/v0
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
IPFS_PIN=true

## Vantagens
| Feature | IPFS (Kubo) | R2 | S3 |
|---------|------------|-----|-----|
| Storage | ILIMITADO | 10GB | $0.023/GB |
| Egress | GRATUITO | Gratuito | $0.09/GB |
| Descentralizado | SIM (P2P) | Nao | Nao |
| Custo | $0/mes ilimitado | $0 (10GB) | $$ |
