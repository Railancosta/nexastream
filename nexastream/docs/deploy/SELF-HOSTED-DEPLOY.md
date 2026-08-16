# NexaStream — Self-Hosted Deploy (100% Free, No External Services)

## Filosofia
- Sem Render.com
- Sem AWS S3
- Sem Cloudflare R2
- Apenas IPFS Kubo (storage ilimitado, gratuito, descentralizado)
- Self-hosted com Docker

## Arquitetura
```
nexastream.org (GitHub Pages, gratuito)
       ↓
API (self-hosted, Docker) ← PostgreSQL (Docker)
       ↓
IPFS Kubo (storage ilimitado, P2P)
       ↓
Blockchain (solo validator, Docker)
```

## Deploy completo (1 comando)

```bash
cd nexastream/infrastructure/docker
docker compose -f docker-compose.full.yml up -d
```

Isso inicia:
- nexastream-api (API REST, porta 4000)
- nexastream-signaling (WebRTC, porta 4010)
- nexastream-validator (blockchain, porta 9001)
- nexastream-ipfs (storage ilimitado, porta 5001/8080)
- nexastream-db (PostgreSQL, porta 5432)

## Sem custos
- GitHub Pages: $0 (frontend)
- Docker (self-hosted): $0 (seu servidor)
- IPFS Kubo: $0 (storage ilimitado)
- PostgreSQL: $0 (Docker)
- Blockchain: $0 (Docker)

Total: $0/mês — ilimitado
