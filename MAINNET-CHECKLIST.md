# MAINNET-CHECKLIST.md

> Estado: **MAINNET CANDIDATE: BLOQUEADA**  
> Atualizado em: 2026-08-14  
> Regra 56: todos os itens devem estar verdes antes do lançamento.

## Checklist de Mainnet

### Consenso e Blockchain
- [x] Especificação de consenso finalizada (PoW com difficulty target)
- [x] Genesis finalizado e versionado (`nexastream-testnet-1`, v1)
- [ ] Testnet estável (múltiplos nós em rede por >24h sem inconsistências)
- [x] Multi-validator test (3 validadores independentes com chaves próprias)
- [ ] Security audit (consenso)
- [ ] Contract audit (NSTToken.sol)

### Infraestrutura
- [ ] Load testing (100/1000/10000 users)
- [x] Monitoring (estrutura de logs existe, Prometheus/Grafana não configurados)
- [ ] Alerting (validator offline, block production stopped, etc.)
- [x] Backup (state save/restore testado — disaster recovery test)
- [x] Restore test (restart recovery validado em testes)
- [ ] Disaster recovery (RTO/RPO documentados, procedimento testado em produção)

### Segurança
- [x] No hardcoded secrets (verificado por CI secret scan)
- [x] Inputs validated (Zod em todas as rotas)
- [x] CORS strict (sem `*` em produção)
- [x] Rate limiting (login, register, upload, comments, likes, search, signaling)
- [x] No floating point for monetary values (bigint no ledger)
- [ ] No critical vulnerabilities (audit externo necessário)

### Key Management
- [ ] Secure key storage (produção)
- [ ] Environment injection (produção)
- [ ] Secret manager (produção)
- [ ] Hardware security (quando aplicável)

### Contratos
- [x] NSTToken.sol: supply máximo 55M invariável (15 testes Hardhat)
- [x] Sem mint infinito, sem funções admin escondidas
- [ ] Auditoria de contratos (externa)
- [ ] Deploy em testnet pública

### Documentação
- [x] Documentação operacional (docs/NETWORK_STATUS.md, docs/CLASSIFICATION.md)
- [x] Node operations (blockchain/testnet/run-testnet.sh)
- [ ] Release artifacts com checksums
- [ ] Reproducible builds

### Observabilidade
- [x] Logging apropriado (estruturado, sem secrets)
- [ ] Métricas (CPU, memória, latency, error rate)
- [ ] Dashboards (Grafana)

### Rollback
- [ ] Rollback strategy documentada
- [ ] Rollback testado

## Status atual

```
MAINNET = BLOCKED
```

Itens bloqueantes:
1. Testnet não implantada como rede ativa (código existe, não está rodando em rede)
2. Auditoria externa de consenso não realizada
3. Auditoria externa de contratos não realizada
4. Monitoring/alerting em produção não configurado
5. Key management de produção não configurado

Para liberar a mainnet, TODOS os itens acima devem ser resolvidos
e este checklist deve ficar 100% verde. Então, e somente então,
com a autorização explícita "AUTORIZO O LANÇAMENTO DA MAINNET",
o lançamento pode prosseguir (regra 112, 219).
