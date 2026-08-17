# NexaStream — Rede de Vídeo Descentralizada (TESTNET)

Projeto em construção conforme Developer Pitch Plan (Item 63).
STATUS: testnet local validada. NAO é production-ready (Item 42).

## Serviços (backend 100% Node.js nativo, zero npm)
| Serviço | Porta | Função |
|---|---|---|
| core | 3002 | auth JWT, upload, transcoding ffmpeg, vídeos, busca |
| content | 3004 | content addressing: SHA-256, chunks 256KB, integridade, dedup |
| chain | 3008 | blockchain NST: genesis 55M, carteiras secp256k1, PoW, verify |
| explorer | 3009 | explorer + creator economy (1 NST/view, anti-fraud) |
| monitor | 3010 | observabilidade (Item 27) |
| web | 3000 | frontend Next.js |
| p2p | 3005+ | nós P2P: discovery, chunks, integridade, sobrevivência a falha |

## Rodar
node services/core/server.js &
node services/content/server.js &
node services/chain/server.js &
node services/chain/explorer.js &
node services/monitor/server.js &
cd apps/web && npm run dev

## Segurança
Criptografia apenas padroes estabelecidos (Item 15): SHA-256, HMAC, scrypt, ECDSA secp256k1.
Sem credenciais no repo (Item 61). Sem mainnet sem auditoria (Item 40).
