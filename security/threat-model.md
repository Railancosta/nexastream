# Threat Model (Item 30, 39)

## Superfície de ataque
- Web App: XSS, CSRF, injeção
- APIs: auth bypass, IDOR, rate limit
- P2P: Sybil, eclipse, envenenamento de DHT
- Blockchain: 51%, long-range, timestamp manipulation, reorg
- Storage: chunk corruption, censura
- Wallet: phishing, replay, perda de mnemonic

## Mitigações implementadas
- [x] Hash SHA-256 padrão (Item 15) — nunca inventamos crypto
- [x] Anti-fraud multi-sinal (Item 22)
- [x] Rate limit em todos endpoints
- [x] CORS restritivo em produção
- [x] Content addressing via hash (Item 10) — integridade verificável
- [x] Replicação mínima (Item 12)
- [x] Timelock em DAO (Item 18)
- [x] Auditoria independente OBRIGATÓRIA antes de mainnet (Item 40)

## Pendente (pré-mainnet)
- [ ] Pentest externo
- [ ] Formal verification do consenso
- [ ] Bug bounty público
- [ ] Red team
