#!/bin/bash
# =============================================================================
# NEXASTREAM - Deploy Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="$HOME/nexastream"

log() { echo -e "${GREEN}[DEPLOY]${NC} $(date +'%H:%M:%S') $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Deploy blockchain
deploy_blockchain() {
    log "Deploying NexaChain..."
    
    cd "$REPO_DIR/nexachain"
    
    # Build
    go build -o "$REPO_DIR/build/nexachain" ./cmd/nexachain
    
    # Copy to system PATH (requires sudo)
    # sudo cp "$REPO_DIR/build/nexachain" /usr/local/bin/
    
    log "Blockchain deployed!"
}

# Deploy backend
deploy_backend() {
    log "Deploying Backend..."
    
    cd "$REPO_DIR/backend"
    
    # Install dependencies
    npm install --production
    
    log "Backend deployed!"
}

# Deploy frontend
deploy_frontend() {
    log "Deploying Frontend..."
    
    cd "$REPO_DIR/frontend"
    
    # Build for production
    npm run build
    
    # Export static files
    npm run export || true
    
    log "Frontend deployed to $REPO_DIR/frontend/out"
}

# Deploy with Docker
deploy_docker() {
    log "Deploying with Docker..."
    
    cd "$REPO_DIR"
    
    # Build images
    docker-compose build
    
    # Start services
    docker-compose up -d
    
    log "Docker deployment complete!"
}

# Deploy to production server
deploy_prod() {
    local server="${1:-}"
    
    if [ -z "$server" ]; then
        error "Please specify server (user@host)"
        exit 1
    fi
    
    log "Deploying to production server: $server"
    
    # rsync files
    rsync -avz --delete \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='build' \
        "$REPO_DIR/" "$server:/opt/nexastream/"
    
    # Restart services
    ssh "$server" "cd /opt/nexastream && docker-compose down && docker-compose up -d"
    
    log "Production deployment complete!"
}

# Main
main() {
    echo "========================================"
    echo " NEXASTREAM DEPLOY"
    echo "========================================"
    
    case "${1:-all}" in
        blockchain)
            deploy_blockchain
            ;;
        backend)
            deploy_backend
            ;;
        frontend)
            deploy_frontend
            ;;
        docker)
            deploy_docker
            ;;
        prod)
            deploy_prod "$2"
            ;;
        all)
            deploy_blockchain
            deploy_backend
            deploy_frontend
            log "All components deployed!"
            ;;
        *)
            echo "Usage: $0 {blockchain|backend|frontend|docker|prod <server>|all}"
            exit 1
            ;;
    esac
}

main "$@"
