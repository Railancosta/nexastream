# Mainnet Readiness Gate — NST (Item 40)

STATUS: **GATEADA** — mainnet NÃO será ativada enquanto houver bloqueante.

| Pré-requisito (Item 40) | Status | Evidência |
|---|---|---|
| Testnet estável | PARCIAL | testnet local + chain testnet operando; falta soak ≥ 30 dias |
| Auditorias independentes | **NÃO INICIADO (bloqueante)** | exige firma externa; ver docs/SECURITY.md |
| Consensus testing | PASS | scripts/consensus-test.mjs (acordo, finalidade, liveness, sync, falha de validador) |
| Security testing | PASS | scripts/security-test.mjs (7 checks), fuzz, rate limits, anti-fraud |
| Disaster-recovery validation | PASS | scripts/backup.sh + restore-test.sh (integrity_check ok) |
| Documentação | PASS | docs/ (API, threat model, bridge NST↔Nano, runbooks) |
| Monitoring | PASS | services/monitor + services/kpi + /metrics |
| Procedimentos de emergência | PARCIAL | runbooks existem; falta simulacro rehearsed |
| Genesis final configurado | **NÃO INICIADO (bloqueante)** | supply 55M definido; parâmetros finais pendentes |
| Infraestrutura de validadores | PARCIAL | 2 nós testnet; falta multi-região |

## Decisão
Enquanto "Auditorias independentes" e "Genesis final" estiverem em aberto,
a mainnet permanece DESLIGADA. NST opera apenas como ledger de testnet;
liquidação real usa trilho feeless (Nano) conforme docs/NST_NANO_BRIDGE.md.

## Regra de ouro (Item 15/61)
- Sem criptografia inventada; sem promessa de ganho; sem alegação de prontidão sem evidência.
