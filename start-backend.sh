#!/usr/bin/env bash
set -euo pipefail

# NexaStream — Start Backend API + Public Tunnel (24/7 on Termux)
# Uses localtunnel for FREE public URL

cd "$(dirname "$0")"

echo "=========================================="
echo "  NexaStream Backend — Starting..."
echo "=========================================="

# 1. Start API server (pure JS, no build needed)
echo "[1/3] Starting API server..."
node api-server.mjs &
API_PID=$!
echo "  API PID: $API_PID (port 4000)"
sleep 2

# 2. Start Solo Validator (blockchain)
echo "[2/3] Starting blockchain validator..."
node packages/blockchain/solo-validator.mjs --port 9001 --interval 10000 --data-dir .data/validator &
VAL_PID=$!
echo "  Validator PID: $VAL_PID (port 9001)"
sleep 2

# 3. Start public tunnel (localtunnel)
echo "[3/3] Starting public tunnel..."
npx localtunnel --port 4000 --subdomain nexastream-api 2>/dev/null || npm install -g localtunnel && lt --port 4000 --subdomain nexastream-api &
TUNNEL_PID=$!

echo ""
echo "=========================================="
echo "  NexaStream Backend is RUNNING!"
echo "=========================================="
echo "  Local API:       http://localhost:4000"
echo "  Local Blockchain: http://localhost:9001"
echo "  Public API:      https://nexastream-api.loca.lt"
echo ""
echo "  Test:"
echo "    curl https://nexastream-api.loca.lt/api/v1/health"
echo ""
echo "  Press Ctrl+C to stop all."
echo "=========================================="

trap "kill $API_PID $VAL_PID $TUNNEL_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
