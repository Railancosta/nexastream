#!/bin/bash
# =============================================================================
# NEXASTREAM - Backend Server Script
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_DIR="$HOME/nexastream"
LOG_FILE="$REPO_DIR/logs/backend.log"
PID_FILE="$REPO_DIR/pids/backend.pid"

load_env() {
    if [ -f "$REPO_DIR/.env" ]; then
        export $(grep -v '^#' "$REPO_DIR/.env" | xargs)
    fi
}

log() { echo -e "${GREEN}[BACKEND]${NC} $(date +'%H:%M:%S') $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Start backend server
start() {
    info "Starting NexaStream Backend..."
    
    load_env
    
    cd "$REPO_DIR/backend"
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            error "Backend already running on PID $OLD_PID"
            exit 1
        fi
    fi
    
    # Start server
    PORT="${PORT:-3001}" node src/server.js \
        2>&1 | tee -a "$LOG_FILE" &
    
    echo $! > "$PID_FILE"
    log "Backend started on port ${PORT:-3001} (PID: $(cat $PID_FILE))"
}

# Stop backend server
stop() {
    info "Stopping NexaStream Backend..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            rm "$PID_FILE"
            log "Backend stopped"
        else
            rm "$PID_FILE"
            info "Backend was not running"
        fi
    else
        pkill -f "node src/server.js" || true
        info "Backend stopped"
    fi
}

# Restart backend
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
            log "Backend running on PID $PID"
            curl -s "http://localhost:${PORT:-3001}/api/v1/health" 2>/dev/null || true
        else
            error "Backend not running (stale PID file)"
        fi
    else
        if pgrep -f "node src/server.js" > /dev/null; then
            log "Backend running (PID unknown)"
        else
            error "Backend not running"
        fi
    fi
}

# Show logs
logs() {
    tail -100 "$LOG_FILE"
}

# Main
main() {
    mkdir -p "$REPO_DIR/logs"
    
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
        *)
            echo "Usage: $0 {start|stop|restart|status|logs}"
            exit 1
            ;;
    esac
}

main "$@"
