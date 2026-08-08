#!/bin/bash
# NexaStream Testnet Deployment Script
# Usage: ./deploy.sh [command]

set -e

# Configuration
NETWORK="testnet"
CHAIN_ID=9999
P2P_PORT=30303
RPC_PORT=8545
WS_PORT=8546
METRICS_PORT=26660
DATA_DIR="${DATA_DIR:-/data/nexachain}"
NODE_NAME="${NODE_NAME:-nexastream-node}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v go &> /dev/null; then
        error "Go is required. Install: https://go.dev/doc/install"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        warn "Docker not found. Some commands may not work."
    fi
    
    log "Prerequisites check complete"
}

# Initialize node
init_node() {
    local validator_key="${1:-}"
    
    log "Initializing NexaStream Testnet Node..."
    
    # Create data directory
    mkdir -p "$DATA_DIR"
    
    # Create config.toml
    cat > "$DATA_DIR/config.toml" << EOF
# NexaStream Testnet Configuration

[chain]
chain_id = $CHAIN_ID
network = "$NETWORK"
genesis = "$DATA_DIR/genesis.json"

[p2p]
listen_address = "/ip4/0.0.0.0/tcp/$P2P_PORT"
max_peers = 50
persistent_peers = ""
private_nodes = []

[rpc]
enabled = true
listen_address = "0.0.0.0:$RPC_PORT"
cors = ["*"]
api = ["eth", "web3", "net", "txpool"]

[ws]
enabled = true
listen_address = "0.0.0.0:$WS_PORT"
origins = ["*"]

[telemetry]
enabled = true
prometheus = true
listen_address = "0.0.0.0:$METRICS_PORT"

[mining]
enabled = true
miner_address = "$validator_key"
threads = 4

[log]
level = "info"
format = "json"
EOF

    # Copy genesis
    cp "$(dirname "$0")/genesis.json" "$DATA_DIR/genesis.json"
    
    log "Node initialized at $DATA_DIR"
}

# Start node
start_node() {
    log "Starting NexaStream Testnet Node..."
    
    # Build node (if needed)
    if [ ! -f "./build/nexachain" ]; then
        build_node
    fi
    
    # Start node in background
    nohup ./build/nexachain start \
        --config "$DATA_DIR/config.toml" \
        --data-dir "$DATA_DIR" \
        --node-name "$NODE_NAME" \
        > "$DATA_DIR/node.log" 2>&1 &
    
    local pid=$!
    echo $pid > "$DATA_DIR/node.pid"
    
    log "Node started (PID: $pid)"
    log "Logs: $DATA_DIR/node.log"
    log "RPC: http://localhost:$RPC_PORT"
    log "WS: ws://localhost:$WS_PORT"
    log "Metrics: http://localhost:$METRICS_PORT"
}

# Stop node
stop_node() {
    if [ -f "$DATA_DIR/node.pid" ]; then
        local pid=$(cat "$DATA_DIR/node.pid")
        log "Stopping node (PID: $pid)..."
        kill $pid 2>/dev/null || true
        rm "$DATA_DIR/node.pid"
        log "Node stopped"
    else
        warn "Node not running"
    fi
}

# Build node
build_node() {
    log "Building NexaStream Node..."
    
    # Create build directory
    mkdir -p build
    
    # Check if Go project exists
    if [ -d "../nexachain" ]; then
        cd ../nexachain
        go build -o ../build/nexachain ./cmd/nexachain
        cd - > /dev/null
    else
        warn "NexaChain source not found. Creating mock binary..."
        cat > build/nexachain << 'MOCK'
#!/bin/bash
echo "Mock NexaStream Node"
echo "In production, this would be the actual NexaChain binary"
while true; do sleep 1; done
MOCK
        chmod +x build/nexachain
    fi
    
    log "Build complete"
}

# Generate key
generate_key() {
    log "Generating validator key..."
    
    if [ -f "../nexachain/cmd/generate_key.go" ]; then
        cd ../nexachain
        go run ./cmd/generate_key.go --output "$DATA_DIR/validator.json"
        cd - > /dev/null
    else
        # Mock key generation
        cat > "$DATA_DIR/validator.json" << EOF
{
  "address": "$(openssl rand -hex 20)",
  "pubkey": "$(openssl rand -hex 33)",
  "privkey": "$(openssl rand -hex 32)",
  "created": "$(date -Iseconds)"
}
EOF
    fi
    
    log "Key generated: $DATA_DIR/validator.json"
}

# Show status
show_status() {
    log "NexaStream Testnet Status"
    echo ""
    echo "Configuration:"
    echo "  Network: $NETWORK"
    echo "  Chain ID: $CHAIN_ID"
    echo "  Data Dir: $DATA_DIR"
    echo "  Node Name: $NODE_NAME"
    echo ""
    
    if [ -f "$DATA_DIR/node.pid" ]; then
        local pid=$(cat "$DATA_DIR/node.pid")
        if ps -p $pid > /dev/null; then
            echo "Status: RUNNING (PID: $pid)"
            echo ""
            echo "Endpoints:"
            echo "  RPC: http://localhost:$RPC_PORT"
            echo "  WS: ws://localhost:$WS_PORT"
            echo "  Metrics: http://localhost:$METRICS_PORT"
        else
            echo "Status: STOPPED (stale PID file)"
        fi
    else
        echo "Status: STOPPED"
    fi
    
    if [ -f "$DATA_DIR/node.log" ]; then
        echo ""
        echo "Recent logs:"
        tail -10 "$DATA_DIR/node.log"
    fi
}

# Show help
show_help() {
    echo "NexaStream Testnet Deployment Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  init <validator_key>   Initialize node"
    echo "  build                  Build NexaChain binary"
    echo "  start                  Start the node"
    echo "  stop                   Stop the node"
    echo "  restart                Restart the node"
    echo "  status                 Show node status"
    echo "  logs [n]               Show logs (default: 20 lines)"
    echo "  key                    Generate validator key"
    echo "  help                   Show this help"
    echo ""
    echo "Environment Variables:"
    echo "  DATA_DIR       Data directory (default: /data/nexachain)"
    echo "  NODE_NAME      Node name (default: nexastream-node)"
    echo ""
    echo "Examples:"
    echo "  $0 init 0xVal1dAt0r..."
    echo "  $0 start"
    echo "  $0 logs 50"
}

# Main
case "${1:-help}" in
    init)
        check_prerequisites
        init_node "$2"
        ;;
    build)
        check_prerequisites
        build_node
        ;;
    start)
        start_node
        ;;
    stop)
        stop_node
        ;;
    restart)
        stop_node
        sleep 2
        start_node
        ;;
    status)
        show_status
        ;;
    logs)
        if [ -f "$DATA_DIR/node.log" ]; then
            tail -${2:-20} "$DATA_DIR/node.log"
        else
            echo "No logs found"
        fi
        ;;
    key)
        check_prerequisites
        generate_key
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
