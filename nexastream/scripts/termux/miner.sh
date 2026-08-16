#!/bin/bash
# =============================================================================
# NEXASTREAM - Miner Script
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

load_env() {
    if [ -f "$REPO_DIR/.env" ]; then
        export $(grep -v '^#' "$REPO_DIR/.env" | xargs)
    fi
}

log() { echo -e "${GREEN}[MINER]${NC} $(date +'%H:%M:%S') $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

setup() {
    mkdir -p "$DATA_DIR/miner"
    mkdir -p "$REPO_DIR/logs"
    load_env
}

# Start mining
start_mining() {
    log "Starting PoW mining..."
    
    cd "$REPO_DIR/nexachain"
    
    "$BUILD_DIR/nexachain" mine \
        --data-dir "$DATA_DIR" \
        --wallet-address "${WALLET_ADDRESS:-}" \
        --threads "${MINING_THREADS:-4}" \
        2>&1 | tee -a "$REPO_DIR/logs/miner.log"
}

# Stop mining
stop_mining() {
    info "Stopping miner..."
    pkill -f "nexachain mine" || true
    log "Miner stopped"
}

# Mining status
status() {
    info "Mining status:"
    
    if pgrep -f "nexachain mine" > /dev/null; then
        echo "Status: RUNNING"
        echo "Process: $(pgrep -f 'nexachain mine')"
        
        # Get mining stats
        curl -s "http://localhost:${BLOCKCHAIN_RPC_PORT:-8545}/api/v1/mining/stats" 2>/dev/null || echo "Unable to get stats"
    else
        echo "Status: STOPPED"
    fi
}

# Set up mining reward address
set_reward_address() {
    local address="$1"
    if [ -z "$address" ]; then
        error "Please provide a wallet address"
        exit 1
    fi
    
    info "Setting reward address to: $address"
    
    mkdir -p "$DATA_DIR/miner"
    echo "$address" > "$DATA_DIR/miner/reward_address"
    
    log "Reward address set!"
}

# Main
main() {
    echo "========================================"
    echo " NEXACHAIN MINER"
    echo "========================================"
    echo ""
    echo "Mining Information:"
    echo "  - Algorithm: Hybrid PoW/PoS"
    echo "  - PoW Reward: 10 NST per block"
    echo "  - PoS Reward: 2 NST per validated block"
    echo "  - Target Block Time: 3 seconds"
    echo ""
    
    setup
    
    case "${1:-start}" in
        start)
            start_mining
            ;;
        stop)
            stop_mining
            ;;
        status)
            status
            ;;
        set-address)
            set_reward_address "$2"
            ;;
        *)
            echo "Usage: $0 {start|stop|status|set-address <address>}"
            exit 1
            ;;
    esac
}

main "$@"
