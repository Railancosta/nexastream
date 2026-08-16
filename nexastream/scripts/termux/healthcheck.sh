#!/bin/bash
# =============================================================================
# NEXASTREAM - Health Check Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="$HOME/nexastream"

load_env() {
    if [ -f "$REPO_DIR/.env" ]; then
        export $(grep -v '^#' "$REPO_DIR/.env" | xargs)
    fi
}

check() { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

# Check blockchain node
check_blockchain() {
    info "Checking Blockchain Node..."
    
    load_env
    
    if curl -sf "http://localhost:${BLOCKCHAIN_RPC_PORT:-8545}/api/v1/health" > /dev/null 2>&1; then
        check "Blockchain node is running"
        
        # Get stats
        STATS=$(curl -s "http://localhost:${BLOCKCHAIN_RPC_PORT:-8545}/api/v1/chain/stats")
        HEIGHT=$(echo "$STATS" | grep -o '"block_height":[0-9]*' | cut -d: -f2)
        check "Block height: ${HEIGHT:-unknown}"
    else
        fail "Blockchain node is not running"
    fi
}

# Check backend API
check_backend() {
    info "Checking Backend API..."
    
    load_env
    
    if curl -sf "http://localhost:${PORT:-3001}/api/v1/health" > /dev/null 2>&1; then
        check "Backend API is running"
    else
        fail "Backend API is not running"
    fi
}

# Check frontend
check_frontend() {
    info "Checking Frontend..."
    
    load_env
    
    if curl -sf "http://localhost:${FRONTEND_PORT:-3000}" > /dev/null 2>&1; then
        check "Frontend is running"
    else
        warn "Frontend is not running"
    fi
}

# Check database
check_database() {
    info "Checking Database..."
    
    # Check Redis
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping > /dev/null 2>&1; then
            check "Redis is running"
        else
            warn "Redis is not running"
        fi
    fi
}

# Check storage
check_storage() {
    info "Checking Storage..."
    
    if [ -d "$REPO_DIR/storage" ]; then
        check "Storage directory exists"
        
        # Check disk space
        AVAILABLE=$(df -h "$REPO_DIR/storage" | tail -1 | awk '{print $4}')
        info "Available storage: $AVAILABLE"
    else
        warn "Storage directory not found"
    fi
}

# Check processes
check_processes() {
    info "Checking Processes..."
    
    if pgrep -f "nexachain" > /dev/null; then
        check "NexaChain process is running"
    else
        warn "NexaChain process is not running"
    fi
    
    if pgrep -f "node.*server.js" > /dev/null; then
        check "Backend process is running"
    else
        warn "Backend process is not running"
    fi
    
    if pgrep -f "next" > /dev/null; then
        check "Frontend process is running"
    else
        warn "Frontend process is not running"
    fi
}

# Full health check
health_check() {
    echo "========================================"
    echo " NEXASTREAM HEALTH CHECK"
    echo "========================================"
    echo ""
    
    check_blockchain
    check_backend
    check_frontend
    check_database
    check_storage
    check_processes
    
    echo ""
    echo "========================================"
    echo " Health check complete"
    echo "========================================"
}

# System info
system_info() {
    echo "========================================"
    echo " SYSTEM INFORMATION"
    echo "========================================"
    echo ""
    
    info "Platform: $(uname -s) $(uname -m)"
    info "Shell: $SHELL"
    info "Node: $(node --version 2>/dev/null || echo 'not installed')"
    info "npm: $(npm --version 2>/dev/null || echo 'not installed')"
    info "Go: $(go version 2>/dev/null || echo 'not installed')"
    info "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2}')"
    info "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
    
    echo ""
}

# Main
main() {
    case "${1:-health}" in
        health)
            health_check
            ;;
        info)
            system_info
            ;;
        all)
            system_info
            health_check
            ;;
        blockchain)
            check_blockchain
            ;;
        backend)
            check_backend
            ;;
        frontend)
            check_frontend
            ;;
        *)
            echo "Usage: $0 {health|info|all|blockchain|backend|frontend}"
            ;;
    esac
}

main "$@"
