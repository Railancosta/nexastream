#!/bin/bash
# =============================================================================
# NEXASTREAM - Frontend Server Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="$HOME/nexastream"
LOG_FILE="$REPO_DIR/logs/frontend.log"
PID_FILE="$REPO_DIR/pids/frontend.pid"

load_env() {
    if [ -f "$REPO_DIR/.env" ]; then
        export $(grep -v '^#' "$REPO_DIR/.env" | xargs)
    fi
}

log() { echo -e "${GREEN}[FRONTEND]${NC} $(date +'%H:%M:%S') $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Start frontend server
start() {
    info "Starting NexaStream Frontend..."
    
    load_env
    
    cd "$REPO_DIR/frontend"
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            error "Frontend already running on PID $OLD_PID"
            exit 1
        fi
    fi
    
    # Start Next.js dev server
    PORT="${FRONTEND_PORT:-3000}" npm run dev \
        2>&1 | tee -a "$LOG_FILE" &
    
    echo $! > "$PID_FILE"
    log "Frontend started on port ${FRONTEND_PORT:-3000} (PID: $(cat $PID_FILE))"
}

# Stop frontend server
stop() {
    info "Stopping NexaStream Frontend..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            rm "$PID_FILE"
            log "Frontend stopped"
        else
            rm "$PID_FILE"
            info "Frontend was not running"
        fi
    else
        pkill -f "next dev" || true
        pkill -f "next start" || true
        info "Frontend stopped"
    fi
}

# Restart frontend
restart() {
    stop
    sleep 2
    start
}

# Status check
status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log "Frontend running on PID $PID"
        else
            error "Frontend not running (stale PID file)"
        fi
    else
        if pgrep -f "next dev" > /dev/null; then
            log "Frontend running (PID unknown)"
        else
            error "Frontend not running"
        fi
    fi
}

# Show logs
logs() {
    tail -100 "$LOG_FILE"
}

# Build frontend
build() {
    info "Building NexaStream Frontend..."
    cd "$REPO_DIR/frontend"
    npm run build
}

# Main
main() {
    mkdir -p "$REPO_DIR/logs"
    mkdir -p "$REPO_DIR/pids"
    
    case "${1:-start}" in
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        status)
            status
            ;;
        logs)
            logs
            ;;
        build)
            build
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|logs|build}"
            exit 1
            ;;
    esac
}

main "$@"
