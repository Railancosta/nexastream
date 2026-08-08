#!/bin/bash
# =============================================================================
# NEXASTREAM - Validator Script
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

log() { echo -e "${GREEN}[VALIDATOR]${NC} $(date +'%H:%M:%S') $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

setup() {
    mkdir -p "$DATA_DIR/validator"
    load_env
}

# Stake NST to become a validator
stake() {
    local amount="${1:-1000}"  # Default 1000 NST
    info "Staking $amount NST..."
    
    cd "$REPO_DIR/nexachain"
    
    "$BUILD_DIR/nexachain" stake --amount "$amount" 2>&1
}

# Unstake NST
unstake() {
    local amount="${1:-1000}"
    info "Unstaking $amount NST..."
    
    cd "$REPO_DIR/nexachain"
    
    "$BUILD_DIR/nexachain" unstake --amount "$amount" 2>&1
}

# Start validator node
start_validator() {
    log "Starting validator node..."
    
    cd "$REPO_DIR/nexachain"
    
    "$BUILD_DIR/nexachain" validator \
        --data-dir "$DATA_DIR" \
        --port "${BLOCKCHAIN_PORT:-30303}" \
        --rpc-port "${BLOCKCHAIN_RPC_PORT:-8545}" \
        2>&1 | tee -a "$REPO_DIR/logs/validator.log"
}

# Check validator status
status() {
    info "Validator status:"
    curl -s "http://localhost:${BLOCKCHAIN_RPC_PORT:-8545}/api/v1/staking/stats" 2>/dev/null || echo "Validator not running"
}

# Get validator info
info_cmd() {
    info "Validator information:"
    curl -s "http://localhost:${BLOCKCHAIN_RPC_PORT:-8545}/api/v1/consensus" 2>/dev/null || echo "Validator not running"
}

# Main
main() {
    echo "========================================"
    echo " NEXACHAIN VALIDATOR"
    echo "========================================"
    echo ""
    echo "Validator Requirements:"
    echo "  - Minimum stake: 100 NST"
    echo "  - Online 24/7 recommended"
    echo "  - Stable internet connection"
    echo ""
    
    setup
    
    case "${1:-start}" in
        start)
            start_validator
            ;;
        stake)
            stake "${2:-1000}"
            ;;
        unstake)
            unstake "${2:-1000}"
            ;;
        status)
            status
            ;;
        info)
            info_cmd
            ;;
        *)
            echo "Usage: $0 {start|stake|unstake|status|info}"
            exit 1
            ;;
    esac
}

main "$@"
