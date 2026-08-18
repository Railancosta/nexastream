# Bug Bounty NexaStream

## Regras (safe harbor)
- Pesquisa apenas em testnet/infra própria; sem acesso a dados de usuários.
- Divulgação responsável: 90 dias antes de publicação.
- Sem promessa de ganhos; rewards são discricionários e pagos em NST TESTNET (mainnet só pós-auditoria) — Item 61.

## Severidades e rewards (NST testnet)
critical 5000 · high 2000 · medium 500 · low 100

## Fluxo de payout (automático após gates)
report → triage(severity) → 2-de-3 aprovações → timelock 48h → payout automático via chain testnet.
NUNCA automático sem validação (protege a tesouraria) — Item 18.

## Reportar
POST /api/bounty/report {reporter, reporter_nst, title, description, poc_url}
