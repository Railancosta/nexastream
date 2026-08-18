#!/usr/bin/env bash
# Health check de todos os 13 serviços (Item 27)
EPS=(
  "auth:3001" "videos:3002" "chain:3008" "wallet:3009"
  "reco:3012" "live:3013" "mod:3014" "dao:3015" "nft:3016" "analytics:3018"
)
ok=0
for ep in "${EPS[@]}"; do
  name="${ep%:*}"; port="${ep#*:}"
  if curl -fsS "http://localhost:$port/api/health" >/dev/null 2>&1; then
    echo "$name ✅"
    ((ok++))
  else
    echo "$name ❌"
  fi
done
echo ""
echo "Saúde: $ok/${#EPS[@]}"
[ "$ok" = "${#EPS[@]}" ]
