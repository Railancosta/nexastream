# Escopo de Auditoria Independente — NexaStream (testnet)
Gerado: 20260818-180523 | Commit: 597f5b9

## Em escopo
- Codigo listado em evidence/checksums.sha256
- Servicos: core 3002, content 3004, chain 3008, monitor 3010, moderation 3014, kpi 3017, nano 3019 + web
- Testes frescos: security, wallet, scale-1k, dr-drill (evidence/test-results/)
- Politicas: threat model, DR, runbook, gate mainnet (evidence/docs/)

## Fora de escopo (declarado)
- Mainnet NST (NAO ATIVA — Item 40)
- Producao real (site estatico em GitHub Pages; backend testnet/local)
- node_modules (supply-chain audit separada)

## Como o auditor verifica
1. sh audit/20260818-180523/verify.sh
2. Re-executar: node scripts/security-test.mjs | wallet-test.mjs | scale-10k.mjs | bash scripts/dr-drill.sh
3. Conferir claims-evidence.json contra as evidencias
