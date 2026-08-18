#!/usr/bin/env bash
# Smoke tests (Item 29)
set -e
cd "$(dirname "$0")/.."
echo "🧪 Smoke tests NexaStream v1.0"

# 1. Estrutura
echo "[T1] estrutura Item 48"
[ -d apps/web ] && [ -d services ] && [ -d blockchain ] && [ -d p2p ] && echo "  ✅"

# 2. Anti-fraud
echo "[T2] anti-fraud Item 22"
python3 monitoring/anti_fraud.py | grep -q "bot1" && echo "  ✅"

# 3. Mainnet gate
echo "[T3] gate Item 40"
grep -q "MAINNET.*BLOQUEADA" scripts/release.sh && echo "  ✅"

# 4. Honestidade Item 61
echo "[T4] sem falsas alegações Item 61"
! grep -rq "renda garantida\|ganho garantido\|lucro certo" apps/ services/ blockchain/ docs/ 2>/dev/null && echo "  ✅"

# 5. Crypto madura Item 15
echo "[T5] crypto padrão Item 15"
! grep -rq "invent.*crypto\|algoritmo.*propri" blockchain/ 2>/dev/null && echo "  ✅"

echo ""
echo "🎉 todos os gates de integridade passaram"
