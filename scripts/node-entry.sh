#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
mkdir -p run
for d in core content chain explorer monitor social reco live moderation dao nft kpi analytics; do
  [ -f "services/$d/server.js" ] || continue
  nohup node "services/$d/server.js" >"run/$d.log" 2>&1 &
  echo $! >"run/$d.pid"
  echo "up: $d"
done
sleep 3
bash scripts/health-check.sh || echo "ALERTA: servico nao saudavel (Item 27)"
tail -f /dev/null
