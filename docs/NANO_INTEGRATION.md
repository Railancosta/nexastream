# Integração Nano — Trilho Global de Pagamentos (feeless)

## Arquitetura
- Nano (chain pública, feeless, instantânea) = trilho de pagamentos/monetização.
- NÃO-CUSTODIAL: criador registra o próprio endereço; a plataforma valida checksum e gera URIs nano:.
- Tesouraria da plataforma: endereço público divulgado; chave fora do repo (produção = hardware/multisig).
- Saldo inicial 0; payouts só ocorrem quando houver fundos reais. Sem promessa de ganhos (Item 61).

## Por que não precisa de auditoria própria
- Não estamos LANÇANDO chain própria (Item 40): estamos USANDO uma chain pública existente.
- Criptografia estabelecida (ed25519-blake2b via lib madura nanocurrency) — Item 15.

## NST
- Mainnet NST permanece GATEADA até auditoria independente, consensus testing e DR validado.
- Nano = pagamentos hoje; NST = governança/infraestrutura no futuro auditado.

## Endpoints (services/nano, porta 3021)
GET  /api/nano/health | /api/nano/treasury | /api/nano/validate?address= | /api/nano/creator/:user | /api/nano/balance/:addr | /api/nano/tips
POST /api/nano/register | /api/nano/tip-log
