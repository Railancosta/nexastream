#!/usr/bin/env bash
# Boot de todos os serviços (Items 28, 35-38)
cd "$(dirname "$0")/.."
echo "🚀 NexaStream — iniciando todos os serviços..."

# Core services (zero-dep)
node services/core/server.js &
node services/search/server.js &

# Backend services
node services/auth/server.js &
node services/videos/server.js &
node services/content/server.js &
node services/social/server.js &
node services/reco/server.js &
node services/moderation/server.cjs &
node services/monitor/server.js &
node services/live/server.cjs &
node services/kpi/server.cjs &
node services/analytics/server.cjs &
node services/explorer/package.json 2>/dev/null || node services/chain/explorer.js &
node services/chain/server.js &

# Blockchain & P2P
node blockchain/node/index.js &
node blockchain/wallet/index.js &

# Wait for all background jobs
wait
echo "✅ Todos os serviços iniciados. Rode scripts/health-check.sh para validar."
