#!/bin/bash
# =============================================================================
# NEXASTREAM - Update Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="$HOME/nexastream"
BACKUP_DIR="$REPO_DIR/backups"

log() { echo -e "${GREEN}[UPDATE]${NC} $(date +'%H:%M:%S') $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Create backup
backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # Backup .env
    if [ -f "$REPO_DIR/.env" ]; then
        cp "$REPO_DIR/.env" "$BACKUP_DIR/.env.$TIMESTAMP"
        log "Backed up .env"
    fi
    
    # Backup data
    if [ -d "$REPO_DIR/data" ]; then
        tar -czf "$BACKUP_DIR/data.$TIMESTAMP.tar.gz" -C "$REPO_DIR" data
        log "Backed up data"
    fi
    
    log "Backup created: $BACKUP_DIR"
}

# Pull latest changes
pull() {
    log "Pulling latest changes..."
    
    cd "$REPO_DIR"
    git fetch origin
    git pull origin main
}

# Update dependencies
update_deps() {
    log "Updating dependencies..."
    
    # Update Go modules
    if [ -d "$REPO_DIR/nexachain" ]; then
        cd "$REPO_DIR/nexachain"
        go mod tidy
    fi
    
    # Update npm packages
    if [ -f "$REPO_DIR/backend/package.json" ]; then
        cd "$REPO_DIR/backend"
        npm update
    fi
    
    if [ -f "$REPO_DIR/frontend/package.json" ]; then
        cd "$REPO_DIR/frontend"
        npm update
    fi
}

# Rebuild
rebuild() {
    log "Rebuilding..."
    
    cd "$REPO_DIR"
    bash scripts/termux/build.sh
}

# Restart services
restart() {
    log "Restarting services..."
    
    # Stop services
    bash scripts/termux/backend.sh stop 2>/dev/null || true
    bash scripts/termux/frontend.sh stop 2>/dev/null || true
    bash scripts/termux/node.sh stop 2>/dev/null || true
    
    # Start services
    bash scripts/termux/node.sh start &
    sleep 3
    bash scripts/termux/backend.sh start &
    sleep 2
    bash scripts/termux/frontend.sh start &
    
    log "Services restarted"
}

# Rollback
rollback() {
    log "Rolling back..."
    
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found"
        exit 1
    fi
    
    info "Restoring from: $LATEST_BACKUP"
    
    # Restore .env
    if [ -f "$BACKUP_DIR/.env" ]; then
        cp "$BACKUP_DIR/.env" "$REPO_DIR/.env"
    fi
    
    # Restore data
    if [ -f "$BACKUP_DIR/data" ]; then
        tar -xzf "$BACKUP_DIR/data" -C "$REPO_DIR"
    fi
    
    log "Rollback complete!"
}

# Update all
update_all() {
    echo "========================================"
    echo " NEXASTREAM UPDATE"
    echo "========================================"
    echo ""
    
    backup
    pull
    update_deps
    rebuild
    restart
    
    echo ""
    log "Update complete!"
}

# Main
main() {
    case "${1:-all}" in
        backup)
            backup
            ;;
        pull)
            pull
            ;;
        deps)
            update_deps
            ;;
        build)
            rebuild
            ;;
        restart)
            restart
            ;;
        rollback)
            rollback
            ;;
        all)
            update_all
            ;;
        *)
            echo "Usage: $0 {backup|pull|deps|build|restart|rollback|all}"
            exit 1
            ;;
    esac
}

main "$@"
