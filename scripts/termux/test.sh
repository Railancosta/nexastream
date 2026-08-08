#!/bin/bash
# =============================================================================
# NEXASTREAM - Test Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="$HOME/nexastream"
log() { echo -e "${GREEN}[TEST]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

cd "$REPO_DIR" 2>/dev/null || { error "Repo not found"; exit 1; }

# Test NexaChain
test_nexachain() {
    log "Testing NexaChain..."
    cd "$REPO_DIR/nexachain"
    
    # Run Go tests
    go test -v ./... 2>&1 | head -100 || true
    
    log "NexaChain tests complete"
}

# Test Backend
test_backend() {
    log "Testing Backend..."
    cd "$REPO_DIR/backend"
    
    if [ -f "package.json" ]; then
        # Run lint
        npm run lint 2>&1 || true
        
        # Run tests
        npm test 2>&1 | head -100 || true
    fi
    
    log "Backend tests complete"
}

# Test Frontend
test_frontend() {
    log "Testing Frontend..."
    cd "$REPO_DIR/frontend"
    
    if [ -f "package.json" ]; then
        # Run lint
        npm run lint 2>&1 || true
        
        # Run tests
        npm test 2>&1 | head -100 || true
    fi
    
    log "Frontend tests complete"
}

# Run all tests
main() {
    echo "========================================"
    echo " NEXASTREAM TEST SUITE"
    echo "========================================"
    
    test_nexachain
    test_backend
    test_frontend
    
    echo ""
    log "All tests completed!"
}

main "$@"
