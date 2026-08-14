# Disaster Recovery — RTO/RPO (rule 61)

## Componentes críticos e seus RTO/RPO

| Componente | RTO | RPO | Estratégia |
|-----------|-----|-----|------------|
| API REST | 5 min | 0 min | Stateless — reiniciar container |
| PostgreSQL | 15 min | 5 min | Backup + WAL + restore test |
| Storage | 30 min | 0 min | Hash dedup — re-upload |
| Blockchain | 30 min | 0 min | State save + block replay |
| Signaling | 5 min | 0 min | Stateless — reiniciar |

## Procedimento: What failed? How to detect? How to recover? How to verify?
- Detect: health check 503, alerts (validator offline, db unavailable)
- Recover: restaurar backup, replay blocks, verify integrity
- Verify: GET /api/v1/health = 200, chain.validateChain() = true
