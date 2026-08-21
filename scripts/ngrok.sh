#!/usr/bin/env bash
# NexaStream ngrok tunnel manager
# Exposes local services to the internet for webhook testing, external integrations, and mobile dev.
#
# Usage:
#   ./scripts/ngrok.sh              # Start web tunnel (frontend + API proxy)
#   ./scripts/ngrok.sh all          # Start all service tunnels
#   ./scripts/ngrok.sh core chain   # Start specific service tunnels
#   ./scripts/ngrok.sh status       # Show running tunnel URLs
#   ./scripts/ngrok.sh stop         # Stop all tunnels
#
# Requires: NGROK_AUTHTOKEN in environment or ~/.ngrok2/ngrok.yml

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NGROK_CONFIG="$PROJECT_DIR/ngrok.yml"

# All available tunnels and their ports
declare -A TUNNELS=(
  [web]=3000
  [core]=3002
  [content]=3004
  [search]=3006
  [chain]=3008
  [explorer]=3009
  [metrics]=3010
  [live]=3013
  [moderation]=3014
  [dao]=3015
  [nft]=3016
  [analytics]=3018
  [payments]=3019
  [p2p]=3020
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() { echo -e "${CYAN}[ngrok]${NC} $1"; }
ok() { echo -e "${GREEN}[ngrok]${NC} $1"; }
warn() { echo -e "${YELLOW}[ngrok]${NC} $1"; }
err() { echo -e "${RED}[ngrok]${NC} $1"; }

# Check if ngrok is installed
check_ngrok() {
  if ! command -v ngrok &> /dev/null; then
    err "ngrok not found. Install it:"
    echo "  npm install -g ngrok"
    echo "  # or"
    echo "  brew install ngrok (macOS)"
    exit 1
  fi
}

# Check auth token
check_auth() {
  if [ -z "${NGROK_AUTHTOKEN:-}" ]; then
    if [ -f "$HOME/.ngrok2/ngrok.yml" ] && grep -q "authtoken:" "$HOME/.ngrok2/ngrok.yml" 2>/dev/null; then
      ok "Using ngrok auth token from ~/.ngrok2/ngrok.yml"
    else
      err "NGROK_AUTHTOKEN not set and no ~/.ngrok2/ngrok.yml found"
      echo ""
      echo "  Get your token at: https://dashboard.ngrok.com/get-started/your-authtoken"
      echo "  Then run:"
      echo "    export NGROK_AUTHTOKEN=your_token_here"
      echo "    # or"
      echo "    ngrok config add-authtoken your_token_here"
      exit 1
    fi
  else
    ok "Using NGROK_AUTHTOKEN from environment"
  fi
}

# Check if a port is in use
port_in_use() {
  local port=$1
  if command -v lsof &> /dev/null; then
    lsof -i :"$port" &> /dev/null
  elif command -v ss &> /dev/null; then
    ss -tlnp | grep -q ":$port "
  else
    # Fallback: try to connect
    echo > /dev/tcp/localhost/"$port" 2>/dev/null
  fi
}

# Start a single tunnel
start_tunnel() {
  local name=$1
  local port=${TUNNELS[$name]:-}

  if [ -z "$port" ]; then
    err "Unknown tunnel: $name"
    return 1
  fi

  if port_in_use "$port"; then
    log "Starting tunnel: ${name} → localhost:${port}"
    ngrok http "$port" --log=stdout --log-format=json 2>&1 | while read -r line; do
      if echo "$line" | grep -q '"url"'; then
        local url=$(echo "$line" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$url" ]; then
          ok "  ${name}: ${url}"
        fi
      fi
    done &
    log "  Tunnel ${name} started in background (PID: $!)"
  else
    warn "Port $port not in use — skipping ${name} (start the service first)"
  fi
}

# Show status of all tunnels
show_status() {
  log "Checking ngrok tunnels..."
  if command -v curl &> /dev/null; then
    local api_data=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)
    if [ -n "$api_data" ] && echo "$api_data" | grep -q '"tunnels"'; then
      ok "Active ngrok tunnels:"
      echo "$api_data" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data.get('tunnels', []):
    name = t.get('name', 'unnamed')
    url = t.get('public_url', 'N/A')
    proto = t.get('proto', 'http')
    local = t.get('config', {}).get('addr', 'N/A')
    print(f'  {name}: {url} → {local}')
" 2>/dev/null || echo "  (could not parse tunnel data)"
    else
      warn "No ngrok tunnels found. Is ngrok running?"
      echo "  Start with: ./scripts/ngrok.sh"
    fi
  fi
}

# Stop all tunnels
stop_tunnels() {
  log "Stopping all ngrok processes..."
  pkill -f "ngrok http" 2>/dev/null && ok "All ngrok tunnels stopped" || warn "No ngrok processes found"
}

# Start web tunnel (default — frontend + API proxy)
start_web() {
  if port_in_use 3000; then
    log "Starting web tunnel: Next.js frontend (port 3000)"
    ngrok http 3000 --log=stdout --log-format=json 2>&1 | while read -r line; do
      if echo "$line" | grep -q '"url"'; then
        local url=$(echo "$line" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$url" ]; then
          ok "  Web: ${url}"
          echo ""
          echo "  This URL proxies all /api/* requests to your local services"
          echo "  via Next.js rewrites. Use this as your webhook callback URL."
          echo ""
          echo "  Ngrok inspection UI: http://localhost:4040"
        fi
      fi
    done
  else
    err "Port 3000 not in use. Start the Next.js dev server first:"
    echo "  npm run dev"
    exit 1
  fi
}

# Main
main() {
  check_ngrok
  check_auth

  case "${1:-}" in
    status)
      show_status
      ;;
    stop)
      stop_tunnels
      ;;
    all)
      log "Starting tunnels for all NexaStream services..."
      for name in "${!TUNNELS[@]}"; do
        start_tunnel "$name" &
      done
      wait
      echo ""
      ok "All tunnels started. Inspection UI: http://localhost:4040"
      ;;
    "")
      start_web
      ;;
    *)
      log "Starting tunnels for: $*"
      for name in "$@"; do
        start_tunnel "$name" &
      done
      wait
      echo ""
      ok "Tunnels started. Inspection UI: http://localhost:4040"
      ;;
  esac
}

main "$@"
