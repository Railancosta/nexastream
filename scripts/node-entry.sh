#!/usr/bin/env bash
# Boot de todos os serviços (Item 35-38)
cd "$(dirname "$0")/.."
echo "🚀 NexaStream — iniciando todos os serviços..."
node services/auth/index.js &
node services/videos/index.js &
node services/recommendations/index.js &
node services/live/index.js &
node services/moderation/index.js &
node services/analytics/index.js &
node contracts/dao.js &
node contracts/nft.js &
node blockchain/node/index.js &
node blockchain/wallet/index.js &
echo "✅ 10 serviços em background. Rode scripts/health-check.sh para validar."
