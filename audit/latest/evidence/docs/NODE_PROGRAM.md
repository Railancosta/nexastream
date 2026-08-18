# Programa de Nós Comunitários (Item 58)

## Requisitos mínimos
- Node >= 22
- ffmpeg (para transcodificação)
- 2GB RAM, 20GB disco
- Banda estável

## Instalação
```bash
bash -c "$(curl -fsSL https://nexastream.org/install-node.sh)"
```

## Responsabilidades
1. Servir conteúdo com integridade (hashes verificáveis)
2. Manter health-check verde (`scripts/health-check.sh`)
3. Não modificar artefatos tagados
4. Reportar bugs via GitHub Issues

## Incentivos
- **Testnet**: participação, reputação, acesso antecipado
- **Mainnet**: apenas após auditoria (Itens 14/40/61)

## Honestidade (Item 61)
Rodar um nó **NÃO garante renda**. A rede existe porque operadores
contribuem recursos. Recompensas só acontecem quando o sistema
gerar receita real auditável.
