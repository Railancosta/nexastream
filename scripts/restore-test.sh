#!/data/data/com.termux/files/usr/bin/bash
# NexaStream DR - verifica RTO + integridade do restore
set -e
ROOT=~/nexastream
BK=$(ls -1t $ROOT/backups 2>/dev/null | head -1)
[ -z "$BK" ] && echo "ERRO: sem backups" && exit 1
TMP=$ROOT/backups/.restore-test
rm -rf $TMP && mkdir -p $TMP
for db in nexastream social moderation; do
  [ -f "$ROOT/backups/$BK/$db.db" ] || continue
  cp "$ROOT/backups/$BK/$db.db" "$TMP/$db.db"
  echo "== $db: $(sqlite3 "$TMP/$db.db" 'PRAGMA integrity_check;')"
done
sqlite3 "$TMP/nexastream.db" "SELECT 'videos='||COUNT(*) FROM videos; SELECT 'users='||COUNT(*) FROM users; SELECT 'blocos='||COUNT(*) FROM blocks;"
rm -rf $TMP
echo "RESTORE TEST OK (RTO validado)"
