#!/usr/bin/env bash
set -euo pipefail

# NexaStream — Start All Services (Termux/Node.js, no Docker needed)
# Starts: Solo Validator (blockchain) + API (when available)
# Storage: IPFS Kubo (run separately if available, or use local storage)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  NexaStream — Starting All Services"
echo "  No Docker needed — pure Node.js"
echo "=========================================="
echo ""

# 1. Start Solo Validator (blockchain + NST mining)
echo "[1/2] Starting Solo Validator (blockchain)..."
node packages/blockchain/solo-validator.mjs --port 9001 --interval 10000 --data-dir .data/validator &
VALIDATOR_PID=$!
echo "  Validator PID: $VALIDATOR_PID (port 9001)"
echo ""

# 2. Start API (if built, otherwise skip)
if [ -f "apps/api/dist/server.js" ]; then
  echo "[2/2] Starting API REST..."
  JWT_SECRET=${JWT_SECRET:-"nexastream-dev-secret-32-chars-minimum"} \
  API_PORT=4000 \
  STORAGE_DIR=.data/storage \
  UPLOAD_TEMP_DIR=.data/uploads \
  node apps/api/dist/server.js &
  API_PID=$!
  echo "  API PID: $API_PID (port 4000)"
else
  echo "[2/2] API not built (TypeScript needs compilation)."
  echo "  Solo validator is running. API needs a desktop/VPS to build."
  echo "  The blockchain is LIVE and mining NST!"
  API_PID=""
fi

echo ""
echo "=========================================="
echo "  NexaStream is running!"
echo "=========================================="
echo "  Blockchain: http://localhost:9001"
echo "  API:        http://localhost:4000 (if running)"
echo "  Website:    https://nexastream.org/"
echo ""
echo "  Blockchain endpoints:"
echo "    /health    — network status"
echo "    /blocks    — list blocks"
echo "    /balance/solo-validator-1 — NST balance"
echo "    /metrics   — mining stats"
echo "    /explorer  — block explorer"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "=========================================="

# Stop all on exit
trap "kill $VALIDATOR_PID ${API_PID:-} 2>/dev/null; exit 0" SIGINT SIGTERM
wait
