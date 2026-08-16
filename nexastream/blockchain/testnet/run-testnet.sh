#!/usr/bin/env bash
set -euo pipefail

# NexaStream Testnet — 3 independent validators
# Each validator has its own key pair and data directory.
# Rule 52: minimum 3 validators. Rule 107: independent identity.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
GENESIS="$SCRIPT_DIR/genesis.json"
DATA_DIR="$ROOT_DIR/.data/testnet"
NODE_BIN="$ROOT_DIR/packages/blockchain/dist/node/node.js"

mkdir -p "$DATA_DIR/validator-1" "$DATA_DIR/validator-2" "$DATA_DIR/validator-3"

echo "=========================================="
echo "  NexaStream Testnet — 3 Validators"
echo "=========================================="
echo "Genesis: $GENESIS"
echo "Data:    $DATA_DIR"
echo ""

if [ ! -f "$NODE_BIN" ]; then
  echo "Building blockchain package..."
  cd "$ROOT_DIR" && pnpm --filter @nexastream/blockchain run build
fi

echo "Starting validator-1 (port 9001)..."
node "$NODE_BIN" --genesis "$GENESIS" --validator validator-1 --port 9001 --data-dir "$DATA_DIR/validator-1" &
PID1=$!

echo "Starting validator-2 (port 9002)..."
node "$NODE_BIN" --genesis "$GENESIS" --validator validator-2 --port 9002 --data-dir "$DATA_DIR/validator-2" &
PID2=$!

echo "Starting validator-3 (port 9003)..."
node "$NODE_BIN" --genesis "$GENESIS" --validator validator-3 --port 9003 --data-dir "$DATA_DIR/validator-3" &
PID3=$!

echo ""
echo "Testnet running!"
echo "  validator-1: PID $PID1 (port 9001)"
echo "  validator-2: PID $PID2 (port 9002)"
echo "  validator-3: PID $PID3 (port 9003)"
echo ""
echo "Press Ctrl+C to stop all validators."

trap "kill $PID1 $PID2 $PID3 2>/dev/null; exit 0" SIGINT SIGTERM

wait
