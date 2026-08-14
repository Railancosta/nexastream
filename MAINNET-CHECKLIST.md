# MAINNET-CHECKLIST.md

> Estado: **MAINNET CANDIDATE: BLOQUEADA**
> Atualizado em: 2026-08-14

## Checklist de Mainnet

### Consenso e Blockchain
- [x] Especificação de consenso finalizada (PoW com difficulty target)
- [x] Genesis finalizado e versionado (nexastream-testnet-1, v1)
- [ ] Testnet estável (múltiplos nós em rede por >24h sem inconsistências)
- [x] Multi-validator test (3 validadores independentes com chaves próprias)
- [ ] Security audit externo (consenso)
- [ ] Contract audit externo (NSTToken.sol)

### Infraestrutura
- [ ] Load testing em produção (k6 script criado, não executado em produção)
- [x] Monitoring (MetricsCollector + AlertManager implementados)
- [x] Alerting (AlertManager com 4 tipos de alerta testados)
- [x] Backup (state save/restore testado)
- [x] Restore test (restart recovery validado)
- [x] Disaster recovery (RTO/RPO documentados, procedimento testado)

### Segurança
- [x] No hardcoded secrets (KeyManager.scanForHardcodedSecrets)
- [x] Inputs validated (Zod em todas as rotas)
- [x] CORS strict
- [x] Rate limiting
- [x] No floating point for monetary values (bigint)
- [ ] No critical vulnerabilities (audit externo necessário)

### Key Management
- [x] Environment injection (KeyManager.requireSecret, fail-fast)
- [x] Secret validation (JWT min 32 chars, private key format)
- [x] Hardcoded secret scanner (scanForHardcodedSecrets)
- [ ] Secure key storage (produção — HSM/vault)
- [ ] Hardware security (quando aplicável)

### Contratos
- [x] NSTToken.sol: supply 55M invariável (15 testes)
- [x] Sem mint infinito, sem funções admin escondidas
- [ ] Auditoria externa de contratos
- [ ] Deploy em testnet pública

### Documentação
- [x] Documentação operacional (NETWORK_STATUS, CLASSIFICATION, DR-RTO-RPO)
- [x] Node operations (run-testnet.sh)
- [x] Rollback strategy documentada (ROLLBACK-STRATEGY.md)
- [x] Release checksums (generate-checksums.sh)
- [ ] Reproducible builds

### Observabilidade
- [x] Logging apropriado (sem secrets)
- [x] Métricas (MetricsCollector com counters, gauges, histograms, P50/P95/P99)
- [x] Prometheus export (exportPrometheus)
- [ ] Dashboards (Grafana — config não criada)

### Rollback
- [x] Rollback strategy documentada
- [ ] Rollback testado em produção

## Status atual

```
MAINNET = BLOCKED
```

Itens bloqueantes restantes (exigem ação externa):
1. Testnet em rede ativa por >24h (código existe, precisa ser implantada)
2. Auditoria externa de consenso
3. Auditoria externa de contratos
4. Load testing em produção
5. Secure key storage (HSM/vault de produção)
6. Dashboards Grafana
7. Reproducible builds

Para liberar: resolver todos + autorização explícita "AUTORIZO O LANÇAMENTO DA MAINNET" (regra 112, 219).
