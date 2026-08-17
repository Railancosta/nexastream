#!/data/data/com.termux/files/usr/bin/bash
# NexaStream DR - RPO alvo 24h, retencao 7 copias
set -e
ROOT=~/nexastream
BK=$ROOT/backups/$(date +%Y%m%d-%H%M%S)
mkdir -p "$BK"
for db in nexastream social moderation; do
  f=$ROOT/database/$db.db
  [ -f "$f" ] && sqlite3 "$f" ".backup '$BK/$db.db'" && echo "backup ok: $db"
done
cp -r "$ROOT/storage/manifests" "$BK/" 2>/dev/null || true
cd $ROOT/backups && ls -1t | tail -n +8 | xargs -r rm -rf
echo "BACKUP OK: $BK"
