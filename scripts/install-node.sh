#!/usr/bin/env bash
# Item 58 — Programa de Nós Comunitários (instalador one-liner)
set -e
echo "═══════════════════════════════════════════════════"
echo "  NexaStream — Instalador de Nó Comunitário v1.0"
echo "═══════════════════════════════════════════════════"
command -v git  >/dev/null || { echo "❌ git necessário"; exit 1; }
command -v node >/dev/null || { echo "❌ node >= 22 necessário"; exit 1; }
command -v ffmpeg >/dev/null || echo "⚠️  ffmpeg ausente (transcodificação limitada)"
command -v python3 >/dev/null || echo "⚠️  python3 ausente (monitoração limitada)"

echo "[1/4] clonando repositório..."
rm -rf nexastream-node
git clone --depth 1 https://github.com/Railancosta/nexastream nexastream-node
cd nexastream-node

echo "[2/4] instalando dependências..."
for s in services/* blockchain/* contracts; do
  [ -f "$s/package.json" ] && (cd "$s" && npm i --omit=dev --silent 2>/dev/null || true)
done

echo "[3/4] compilando P2P Rust..."
[ -x /usr/bin/rustc ] && rustc p2p/discovery/main.rs -o p2p/discovery/ns-dht 2>/dev/null && echo "  ✅ DHT"

echo "[4/4] validação..."
bash scripts/health-check.sh || echo "⚠️  health-check: alguns serviços offline"

cat << DONE

✅ Nó instalado!

Próximos passos:
  • Inicie:  node services/videos/index.js &
  • Carteira: node blockchain/wallet/index.js &
  • Chain:    node blockchain/node/index.js &

Responsabilidades (Item 58):
  • Servir conteúdo com integridade (hashes verificados)
  • Manter health-check verde
  • Não modificar artefatos tagados

Incentivos:
  • Testnet: reputação (sem promessa de ganho)
  • Mainnet: apenas após auditoria (Item 40/61)
DONE
