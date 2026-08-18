# Programa de Nos Comunitarios (Item 58)

## Participacao
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Railancosta/nexastream/main/scripts/install-node.sh)"

## Requisitos minimos
- Node >= 22 + ffmpeg (ou Docker em maquina com root)
- 2GB RAM, 20GB disco, banda estavel

## Responsabilidades do operador
- Servir conteudo com integridade (hashes verificados)
- Manter health-check verde (scripts/health-check.sh)
- Nao modificar artefatos tagados (verifique o hash do release)

## Incentivos
- Testnet: participacao e reputacao (sem promessa de ganho)
- Mainnet: incentivos NST somente apos auditoria independente (Itens 14/40/61)

## Honestidade (Item 61)
Rodar um nodo NAO garante renda. A rede existe porque operadores
contribuem recursos; o protocolo recompensa apenas quando o
sistema gerar receita real auditavel.
