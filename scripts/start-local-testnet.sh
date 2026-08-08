#!/bin/bash
# NexaStream Local Testnet Script
# Starts multiple nodes locally to test multi-node functionality

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     NexaStream Local Testnet                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    exit 1
fi

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    docker-compose -f "$PROJECT_DIR/docker/docker-compose.zero-cloud.yml" down 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT

# Start the testnet
echo -e "${GREEN}Starting NexaStream Local Testnet...${NC}"
echo ""

# Pull required images first
echo "Pulling required Docker images..."
docker pull postgres:15-alpine 2>/dev/null || true
docker pull ipfs/kubo:v0.24.0 2>/dev/null || true
docker pull prom/prometheus:v2.47.0 2>/dev/null || true
docker pull grafana/grafana:10.1.0 2>/dev/null || true
docker pull nginx:alpine 2>/dev/null || true

# Build NexaChain image
echo ""
echo "Building NexaChain node image..."
docker build -t nexastream/nexachain:latest "$PROJECT_DIR/nexachain" 2>/dev/null || true

# Start Docker Compose
echo ""
echo "Starting Docker Compose stack..."
cd "$PROJECT_DIR"

# Start services
docker-compose -f docker/docker-compose.zero-cloud.yml up -d

# Wait for services to start
echo ""
echo -e "${YELLOW}Waiting for services to initialize...${NC}"

# Wait for PostgreSQL
echo -n "  ├── PostgreSQL... "
for i in {1..30}; do
    if docker exec nexastream-postgres pg_isready -U nexastream &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
        break
    fi
    sleep 1
done

# Wait for IPFS
echo -n "  ├── IPFS Bootstrap... "
for i in {1..30}; do
    if curl -s http://localhost:5001/api/v0/version &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
        break
    fi
    sleep 1
done

# Wait for NexaChain
echo -n "  ├── NexaChain Bootstrap... "
for i in {1..30}; do
    if curl -s http://localhost:26657/status &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
        break
    fi
    sleep 1
done

# Check all services
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              SERVICES STATUS                             ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"

# Check each service
check_service() {
    local name=$1
    local port=$2
    local url=$3
    
    if curl -s "$url" &>/dev/null; then
        echo -e "${GREEN}  ├── $name: Running (port $port)${NC}"
    else
        echo -e "${YELLOW}  ├── $name: Starting... (port $port)${NC}"
    fi
}

check_service "PostgreSQL" "5432" "http://localhost:5432"
check_service "IPFS API" "5001" "http://localhost:5001/api/v0/version"
check_service "IPFS Gateway" "8080" "http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfXbsLZ446MHuo"
check_service "NexaChain RPC" "26657" "http://localhost:26657/status"
check_service "NexaChain P2P" "30303" ""
check_service "Frontend" "3000" "http://localhost:3000"
check_service "Prometheus" "9090" "http://localhost:9090"
check_service "Grafana" "3031" "http://localhost:3031"

echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"

# Get blockchain info
echo ""
echo "Blockchain Status:"
echo "----------------"

# Try to get chain ID
CHAIN_ID=$(curl -s http://localhost:26657/status 2>/dev/null | grep -o '"chain_id":[0-9]*' | head -1 | cut -d':' -f2 || echo "N/A")
echo "  Chain ID: $CHAIN_ID"

# Try to get block height
BLOCK_HEIGHT=$(curl -s http://localhost:26657/status 2>/dev/null | grep -o '"latest_block_height":[0-9]*' | head -1 | cut -d':' -f2 || echo "0")
echo "  Block Height: $BLOCK_HEIGHT"

# Try to get peer count
PEERS=$(curl -s http://localhost:26657/net_info 2>/dev/null | grep -o '"n_peers":[0-9]*' | head -1 | cut -d':' -f2 || echo "0")
echo "  Connected Peers: $PEERS"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ACCESS INFORMATION                          ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  NexaChain RPC:  http://localhost:26657                  ║${NC}"
echo -e "${GREEN}║  IPFS Gateway:  http://localhost:8080                    ║${NC}"
echo -e "${GREEN}║  Frontend:      http://localhost:3000                    ║${NC}"
echo -e "${GREEN}║  Prometheus:   http://localhost:9090                   ║${NC}"
echo -e "${GREEN}║  Grafana:       http://localhost:3031                   ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${GREEN}✅ Local testnet is running!${NC}"
echo ""
echo "To stop: docker-compose -f docker/docker-compose.zero-cloud.yml down"
echo "To view logs: docker-compose -f docker/docker-compose.zero-cloud.yml logs -f"
echo ""
echo "Next steps:"
echo "  1. Wait for block production to start"
echo "  2. Check http://localhost:26657/status for block height"
echo "  3. Upload a test video through the frontend"
echo "  4. Monitor peer connections at http://localhost:9090"
echo ""

# Keep running
echo "Press Ctrl+C to stop..."
tail -f /dev/null 2>/dev/null || sleep infinity
