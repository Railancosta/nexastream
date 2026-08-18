# Especificação de Consenso — Testnet NST (Item 16)
STATUS: PROTOTIPO DE TESTNET. NAO é mainnet. Auditoria independente pendente (Item 40).

## Modelo
Round-robin Proof-of-Authority entre N validadores conhecidos no genesis.
Assinaturas: Ed25519 (node:crypto) sobre sha256(header). Criptografia estabelecida (Item 15).

## Suposições de segurança
- Maioria honesta de validadores (N=2 tolera 0 falhas Bizantinos; tolera 1 falha de crash via skip blocks).
- Membership autenticada: conjunto de validadores fixo no genesis; Sybil = impossível sem comprometer chaves do genesis.

## Seleção de validadores
Testnet: config run/validators.json. Mainnet (futuro): seleção por stake + reputação, documentada antes (Item 40).

## Produção de blocos
Proposer = height % N. Intervalo alvo 2s. Se proposer ausente > 5s, o próximo índice produz bloco "skip" (liveness).

## Finalidade
Bloco final quando N-1 acks assinados (quorum). `finals` = maior height com quorum. Reorgs proibidos abaixo de finals.

## Forks e reorganizações
Regra da cadeia mais longa com TODAS as assinaturas e links verificados (sync). Forks acima de finals resolvidos por quorum de acks; abaixo de finals, rejeitados.

## Slashing
NÃO implementado na testnet. Para mainnet: slashing por double-sign comprovado (duas assinaturas válidas no mesmo height) — especificar antes da auditoria.

## Recompensas
Proposer recebe tx de recompensa (integração futura com chain:3008). Tesouraria DAO controla parâmetros.

## Ataques considerados
- DoS: rate-limit e limites de mensagem (pendente implementar).
- Long-range: checkpoint de `finals` no boot; cadeias que divergem abaixo do checkpoint são rejeitadas.
- Timestamp manipulation: deriva > 30s rejeitada (a implementar); hoje ts é apenas métrica.

## Recuperação
Nó atrasado pede `sync`, verifica bloco a bloco (height, prev, role, assinatura) e adota cadeia válida mais longa.

## Métricas expostas
height, head, finals, avgBlockMs, validators (HTTP porta+1000).
