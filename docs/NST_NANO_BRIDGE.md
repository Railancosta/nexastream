# NST ↔ Nano — Modelo de Integração (honesto)

## Realidade técnica
- Nano mainnet: feeless, block-lattice, SEM tokens/smart contracts/memo.
- Logo: NST NÃO pode existir como token nativo na Nano.
- Mainnet NST (chain própria): gateada (Item 40) — exige auditoria, consensus testing, DR.

## Modelo adotado
- NST = token de ledger da plataforma (testnet hoje).
- Nano = trilho de liquidação sem taxas: payouts de criadores, doações, tesouraria.
- Tesouraria: conta Nano publicada em /nst.html (endereço público; seed offline).

## Fluxo de payout (quando houver receita real)
1. Ledger NST calcula recompensa (métricas verificáveis, Item 21).
2. Operador envia NANO da tesouraria ao criador (taxa zero).
3. Ledger NST marca a recompensa como liquidada (audit trail).

## Segurança
- Seed da tesouraria: offline, nunca em repo (Item 61).
- Sem custódia obrigatória; criadores podem usar carteiras próprias.
- Nenhuma promessa de ganho; NST não é investimento.
