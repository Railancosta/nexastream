# Runbook de Emergencia — NexaStream (Itens 40/52/53)

## Cenarios cobertos
1. Falha de servico(s) → restart via pidfiles
2. Perda/corrupcao de banco → restore do ultimo backup
3. Perda de storage → re-verify de integridade por content hash

## Procedimento manual
1. Diagnosticar: `bash scripts/health-check.sh` (ou curl /api/health por porta)
2. Reiniciar servicos: `bash scripts/start-all.sh`
3. Se DB ausente/corrompido:
   - `ls -1t backups | head -1` → identifique BK
   - `cp backups/$BK/*.db database/`
   - `bash scripts/start-all.sh`
4. Verificar:
   - `curl -s localhost:3008/api/chain/verify` → "valid":true
   - `curl -s localhost:3004/api/content/verify/<VID>` → "integrity":true
   - contagens: `sqlite3 database/nexastream.db "SELECT COUNT(*) FROM videos;"`
5. Registrar resultado em docs/DR_DRILL_LOG.md (RTO medido, BK usado, PASS/FAIL)

## RPO/RPO alvo
- RPO <= 24h (backup diario) | RTO <= 15 min
- Neste ambiente de testnet: backup sob demanda via scripts/backup.sh

## Regra de ouro
Nunca "consertar para frente" sem backup: quarentena primeiro (run/quarantine-*),
restauracao depois. O drill (scripts/dr-drill.sh) automatiza isso sem destruir dados.
