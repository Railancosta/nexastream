#!/bin/bash
# =============================================================================
# NEXASTREAM - Build Script
# =============================================================================
# Builds all components of the NexaStream platform
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO_DIR="$HOME/nexastream"
BUILD_DIR="$REPO_DIR/build"
LOG_FILE="$REPO_DIR/build.log"

# Functions
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }

# Ensure we're in the repo directory
cd "$REPO_DIR" 2>/dev/null || { error "Repository not found at $REPO_DIR"; exit 1; }

# Create build directory
mkdir -p "$BUILD_DIR"

# Build NexaChain (Go blockchain)
build_nexachain() {
    log "Building NexaChain (Go blockchain)..."
    
    cd "$REPO_DIR/nexachain"
    
    # Build the main binary
    go build -o "$BUILD_DIR/nexachain" ./cmd/nexachain 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log "NexaChain built successfully!"
    else
        error "Failed to build NexaChain"
        return 1
    fi
    
    # Build CLI tool
    log "Building NexaChain CLI..."
    go build -o "$BUILD_DIR/nexacli" ./cmd/cli 2>&1 | tee -a "$LOG_FILE" || true
}

# Build Backend (Node.js)
build_backend() {
    log "Building Backend..."
    
    cd "$REPO_DIR/backend"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install 2>&1 | tee -a "$LOG_FILE"
    fi
    
    # Build TypeScript
    if [ -f "tsconfig.json" ]; then
        npx tsc 2>&1 | tee -a "$LOG_FILE" || true
    fi
    
    log "Backend ready!"
}

# Build Frontend (Next.js)
build_frontend() {
    log "Building Frontend..."
    
    cd "$REPO_DIR/frontend"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install 2>&1 | tee -a "$LOG_FILE"
    fi
    
    # Build Next.js
    npm run build 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log "Frontend built successfully!"
    else
        error "Failed to build frontend"
        return 1
    fi
}

# Build Docker images
build_docker() {
    log "Building Docker images..."
    
    # Build blockchain Docker image
    docker build -t nexastream/blockchain:latest -f "$REPO_DIR/docker/Dockerfile.blockchain" "$REPO_DIR" 2>&1 | tee -a "$LOG_FILE" || true
    
    # Build backend Docker image
    docker build -t nexastream/backend:latest -f "$REPO_DIR/backend/Dockerfile" "$REPO_DIR/backend" 2>&1 | tee -a "$LOG_FILE" || true
    
    # Build frontend Docker image
    docker build -t nexastream/frontend:latest -f "$REPO_DIR/frontend/Dockerfile" "$REPO_DIR/frontend" 2>&1 | tee -a "$LOG_FILE" || true
    
    log "Docker images built!"
}

# Main build function
main() {
    echo "========================================"
    echo " NEXASTREAM BUILD"
    echo "========================================"
    
    local build_blockchain=true
    local build_backend=true
    local build_frontend=true
    local build_docker_images=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --blockchain-only)
                build_backend=false
                build_frontend=false
                build_docker_images=false
                shift
                ;;
            --backend-only)
                build_blockchain=false
                build_frontend=false
                build_docker_images=false
                shift
                ;;
            --frontend-only)
                build_blockchain=false
                build_backend=false
                build_docker_images=false
                shift
                ;;
            --docker)
                build_docker_images=true
                shift
                ;;
            --all)
                build_blockchain=true
                build_backend=true
                build_frontend=true
                build_docker_images=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    echo "Build started at $(date)" > "$LOG_FILE"
    
    if [ "$build_blockchain" = true ]; then
        build_nexachain
    fi
    
    if [ "$build_backend" = true ]; then
        build_backend
    fi
    
    if [ "$build_frontend" = true ]; then
        build_frontend
    fi
    
    if [ "$build_docker_images" = true ]; then
        build_docker
    fi
    
    echo ""
    echo "========================================"
    echo " BUILD COMPLETE!"
    echo "========================================"
    echo ""
    log "Build artifacts in: $BUILD_DIR"
    ls -la "$BUILD_DIR"
}

main "$@"
