# Threat Model (Fase 5 — Item 39)
| Ameaça | Superfície | Mitigação implementada | Status |
|---|---|---|---|
| Upload não autenticado | core:3002 | JWT obrigatório (401) | ✅ testado |
| JWT forjado | core:3002 | HMAC-SHA256 verificado | ✅ testado |
| Path traversal | core:3002 /storage | normalize + startsWith | ✅ testado |
| Credential stuffing | core:3002 | scrypt + 401 genérico | ✅ |
| Tx blockchain forjada | chain:3008 | ECDSA secp256k1 verificado | ✅ testado |
| Replay de tx | chain:3008 | tabela usedtx + mempool id | ✅ |
| View farming / Sybil | explorer:3009 | 1 reward/viewer/vídeo + teto 100 | ✅ |
| Spam de denúncia | moderation:3014 | rate limit 10/min | ✅ |
| Abuso de moderação | moderation:3014 | ações whitelist (approve/remove) + auditoria | ✅ testado |
| Perda de dados | storage | backup sqlite .backup + retenção 7 + restore test | ✅ |
