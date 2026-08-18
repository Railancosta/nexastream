#!/data/data/com.termux/files/usr/bin/bash
# NexaStream — SIMULACRO DE EMERGENCIA (DR DRILL) — Itens 40/52/53
# Nao-destrutivo: originais vao para quarentena; restore vem do backup.
set -u
cd ~/nexastream
TS=$(date +%Y%m%d-%H%M%S)
LOG=run/dr-$TS.log
QUAR=run/quarantine-$TS
mkdir -p "$QUAR"
PASS=0; FAIL=0
t(){ if [ "$2" = "0" ]; then PASS=$((PASS+1)); echo "PASS $1" | tee -a "$LOG"; else FAIL=$((FAIL+1)); echo "FAIL $1" | tee -a "$LOG"; fi; }

echo "== FASE 0: baseline (servicos UP)" | tee "$LOG"
bash scripts/start-all.sh >/dev/null 2>&1
sleep 3
BASE_V=$(sqlite3 database/nexastream.db "SELECT COUNT(*) FROM videos;")
BASE_U=$(sqlite3 database/nexastream.db "SELECT COUNT(*) FROM users;")
BASE_B=$(sqlite3 database/nexastream.db "SELECT COUNT(*) FROM blocks;")
VID=$(sqlite3 database/nexastream.db "SELECT id FROM videos LIMIT 1;")
curl -sf --max-time 3 http://localhost:3002/api/health >/dev/null 2>&1; t "baseline core UP" $?
echo "baseline: videos=$BASE_V users=$BASE_U blocks=$BASE_B vid=$VID" | tee -a "$LOG"

echo "== FASE 1: backup (marca RPO)" | tee -a "$LOG"
bash scripts/backup.sh >/dev/null 2>&1; t "backup executado" $?
BK=$(ls -1t backups | head -1)

echo "== FASE 2: DESASTRE (kill total + perda dos DBs)" | tee -a "$LOG"
for f in run/*.pid; do [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null; done
sleep 1
mv database/nexastream.db database/social.db database/moderation.db "$QUAR"/ 2>/dev/null
curl -sf --max-time 2 http://localhost:3002/api/health >/dev/null 2>&1
[ $? -ne 0 ]; t "desastre confirmado: servicos DOWN + DBs perdidos" $?

echo "== FASE 3: RESTAURACAO (do backup $BK)" | tee -a "$LOG"
T0=$(date +%s)
cp "backups/$BK"/*.db database/ 2>/dev/null
bash scripts/start-all.sh >/dev/null 2>&1
UP=1
for i in $(seq 1 30); do
  curl -sf --max-time 2 http://localhost:3002/api/health >/dev/null 2>&1 && UP=0 && break
  sleep 1
done
t "core UP apos restore" $UP
T1=$(date +%s); RTO=$((T1-T0))

echo "== FASE 4: VERIFICACAO de integridade" | tee -a "$LOG"
NEW_V=$(sqlite3 database/nexastream.db "SELECT COUNT(*) FROM videos;")
NEW_U=$(sqlite3 database/nexastream.db "SELECT COUNT(*) FROM users;")
NEW_B=$(sqlite3 database/nexastream.db "SELECT COUNT(*) FROM blocks;")
[ "$NEW_V" = "$BASE_V" ] && [ "$NEW_U" = "$BASE_U" ] && [ "$NEW_B" = "$BASE_B" ]; t "contagens integrais (V/U/B)" $?
curl -sf --max-time 5 http://localhost:3008/api/chain/verify | grep -q '"valid":true'; t "chain valida apos restore" $?
[ -n "$VID" ] && curl -sf --max-time 5 "http://localhost:3004/api/content/verify/$VID" | grep -q '"integrity":true'; t "content integrity apos restore" $?

echo "== FASE 5: RELATORIO" | tee -a "$LOG"
RES=$([ $FAIL -eq 0 ] && echo APROVADO || echo REPROVADO)
{
  echo; echo "## DR Drill $TS"
  echo "- RTO medido: ${RTO}s (alvo <= 900s)"
  echo "- RPO: backup $BK (drill com perda ~0; producao = intervalo do ultimo backup)"
  echo "- PASS=$PASS FAIL=$FAIL → $RES"
} >> docs/DR_DRILL_LOG.md
echo "RESULTADO FINAL: PASS=$PASS FAIL=$FAIL RTO=${RTO}s → $RES"
[ $FAIL -eq 0 ]
