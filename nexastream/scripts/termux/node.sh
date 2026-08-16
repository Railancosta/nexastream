#!/bin/bash
# =============================================================================
# NEXASTREAM - Blockchain Node Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="$HOME/nexastream"
BUILD_DIR="$REPO_DIR/build"
DATA_DIR="$REPO_DIR/data"
LOG_FILE="$REPO_DIR/logs/node.log"

# Load environment
load_env() {
    if [ -f "$REPO_DIR/.env" ]; then
        export $(grep -v '^#' "$REPO_DIR/.env" | xargs)
    fi
}

log() { echo -e "${GREEN}[NODE]${NC} $(date +'%H:%M:%S') $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Create directories
setup() {
    mkdir -p "$DATA_DIR"
    mkdir -p "$REPO_DIR/logs"
    load_env
}

# Start blockchain node
start_node() {
    log "Starting NexaChain node..."
    
    cd "$REPO_DIR/nexachain"
    
    # Check if binary exists
    if [ ! -f "$BUILD_DIR/nexachain" ]; then
        info "Building NexaChain first..."
        cd "$REPO_DIR"
        bash scripts/termux/build.sh --blockchain-only
    fi
    
    # Start the node
    "$BUILD_DIR/nexachain" \
        --data-dir "$DATA_DIR" \
        --port "${BLOCKCHAIN_PORT:-30303}" \
        --rpc-port "${BLOCKCHAIN_RPC_PORT:-8545}" \
        --network-id "${BLOCKCHAIN_NETWORK_ID:-1337}" \
        2>&1 | tee -a "$LOG_FILE"
}

# Initialize new node
init_node() {
    info "Initializing new node..."
    
    cd "$REPO_DIR/nexachain"
    
    "$BUILD_DIR/nexachain" init --data-dir "$DATA_DIR" 2>&1
}

# Generate wallet
generate_wallet() {
    info "Generating wallet..."
    
    "$BUILD_DIR/nexachain" wallet new 2>&1
}

# Show status
show_status() {
    info "Node status:"
    curl -s "http://localhost:${BLOCKCHAIN_RPC_PORT:-8545}/api/v1/health" 2>/dev/null || echo "Node not running"
}

# Main
main() {
    echo "========================================"
    echo " NEXACHAIN NODE"
    echo "========================================"
    
    setup
    
    case "${1:-start}" in
        start)
            start_node
            ;;
        init)
            init_node
            ;;
        wallet)
            generate_wallet
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 {start|init|wallet|status}"
            exit 1
            ;;
    esac
}

main "$@"
