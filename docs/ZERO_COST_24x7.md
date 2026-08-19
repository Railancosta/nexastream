# NexaStream 24/7 com custo R$ 0 — topologia oficial

Objetivo: a plataforma **não depende do celular nem do Termux ligado**. O Termux é apenas o laboratório de desenvolvimento. Tudo roda em infra gratuita permitida: **Cloudflare + GitHub + domínio próprio (nexastream.org)**.

## Camadas

| Camada | Onde roda 24/7 (grátis) | Como |
|---|---|---|
| Código + CI/CD | GitHub | `.github/workflows/ci.yml` (build + testes) e `deploy-site.yml` (deploy automático a cada push na `main`) |
| Frontend (home, feed, shorts, upload) | GitHub Pages / Cloudflare Pages | `STATIC_EXPORT=1 npm run build` em `apps/web` — estático, CDN global grátis |
| DNS + CDN + HTTPS + geo-IP | Cloudflare (free) | Proxy do domínio; header `CF-IPCountry` alimenta `/api/geo` (tradução automática por IP) |
| API (core, auth, vídeos, feed) | Nós da comunidade / qualquer VM ou PC ligado | `node services/core/server.js` — zero dependências, ~30 MB RAM |
| Vídeos (storage) | Rede P2P (`p2p/`) | Chunks replicados entre nós; sobrevive a falha de nós individuais |
| Tradução de conteúdo | LibreTranslate self-hosted | `TRANSLATE_URL=http://seu-nó:5000` no core; sem ele, texto original (fallback) |
| Blockchain NST | Chain própria (`services/chain`) | Nós validadores da comunidade; genesis 55M NST |
| Ponte nano (saques fee-less) | `services/nano` + RPC público nano | `NANO_RPC` configurável; mainnet real, zero taxas |

## Por que não dá para "deployar token NST na nano"

A blockchain **nano não tem smart contracts nem padrão de token** — ela transfere apenas XNO. É uma limitação do protocolo, não de custo. Por isso a arquitetura correta (já implementada) é:

1. **NST vive na chain NexaStream** (emissão, recompensas, monetização — `services/chain`).
2. **Ponte nano** (`services/nano`, `services/nano-settle`) trava NST e liquida em XNO (ou vice-versa) com **zero taxas de rede**, usando RPC público da mainnet nano real.
3. O usuário saca a monetização para qualquer carteira nano externa ou exchange que liste XNO.

## Checklist "desligar o celular"

- [x] Código no GitHub (push da `main`)
- [x] CI/CD automático (build + testes + deploy do frontend estático)
- [x] Frontend estático servido por CDN grátis 24/7
- [x] API same-origin (sem CORS) — `next.config.ts` roteia cada `/api/<serviço>` para o microsserviço certo
- [ ] Pelo menos 1 nó sempre ligado rodando `services/core` (qualquer PC/VM/Raspberry da comunidade — não precisa ser o seu celular)
- [ ] Nós P2P replicando storage (quanto mais, melhor)
- [ ] Cloudflare apontando `nexastream.org` para o frontend + `/api` para um nó ativo

## Desenvolvimento no Termux (laboratório)

```sh
pkg install nodejs ffmpeg git
git clone https://github.com/Railancosta/nexastream
cd nexastream/apps/web && npm ci && npm run build
JWT_SECRET=$(openssl rand -hex 32) node ../../services/core/server.js &
PORT=3000 npm start
```

O Termux serve para **desenvolver e testar**. Produção = GitHub + Cloudflare + nós da comunidade.
