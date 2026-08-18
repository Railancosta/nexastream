#!/usr/bin/env bash
# Item 28/42: health verification do nodo
FAIL=0
check() { curl -sf -m 5 "http://localhost:$2$3" >/dev/null && echo "PASS $1" || { echo "FAIL $1"; FAIL=1; }; }
check core      3002 /api/health
check content   3004 /api/content/dedup
check chain     3008 /api/chain
check explorer  3009 /api/explorer
check monitor   3010 /api/metrics
check social    3011 /api/social/health
check reco      3012 /api/reco/feed
check live      3013 /api/live/streams
check moderation 3014 /api/mod/queue
check dao       3015 /api/dao/proposals
check nft       3016 /api/nft/market
check kpi       3017 /api/kpi
check analytics 3018 /api/analytics/totals
exit $FAIL
