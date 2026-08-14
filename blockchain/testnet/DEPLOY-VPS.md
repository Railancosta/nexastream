# Testnet Deployment Guide — 3 VPS Validators

## Pré-requisitos
- 3 VPS (Hetzner CX21, DigitalOcean Droplet, ou AWS EC2 t3.small)
- Docker instalado em cada VPS
- Git

## Passo 1: Em cada VPS

```bash
git clone https://github.com/Railancosta/nexastream.git
cd nexastream/blockchain/testnet/docker
docker compose up -d
```

## Passo 2: Verificar
```bash
docker compose logs -f
```

Cada VPS roda 1 validador com sua própria chave RSA.
Os 3 compartilham o mesmo genesis determinístico.

## Passo 3: Manter 24h+ (regra 55)

A testnet deve rodar 24h sem inconsistências para satisfazer o checklist.

## Restart recovery (regra 54)
- Estado salvo em volume Docker
- Node restaura chain state no restart
- Se um cair, os outros continuam (failover testado)
