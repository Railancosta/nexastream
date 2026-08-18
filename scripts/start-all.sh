#!/data/data/com.termux/files/usr/bin/bash
cd ~/nexastream
mkdir -p run
for s in core content chain explorer monitor social reco live moderation nft kpi nano bounty swap mainnet analytics nano; do
  [ -f run/$s.pid ] && kill $(cat run/$s.pid) 2>/dev/null
  nohup node services/$s/server.js >run/$s.log 2>&1 &
  echo $! > run/$s.pid
  echo "up: $s"
done
