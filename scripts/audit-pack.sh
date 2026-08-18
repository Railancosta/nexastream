#!/data/data/com.termux/files/usr/bin/bash
# NexaStream — Pacote de Auditoria Independente (Item 64)
set -u
cd ~/nexastream
TS=$(date +%Y%m%d-%H%M%S)
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
OUT=audit/$TS
mkdir -p "$OUT/evidence/test-results" "$OUT/evidence/configs" "$OUT/evidence/runtime" "$OUT/evidence/docs"

echo "== 1) manifest"
cat > "$OUT/manifest.json" << MF
{
  "project": "NexaStream",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$COMMIT",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)",
  "node": "$(node -v 2>/dev/null || echo unknown)",
  "ffmpeg": "$(ffmpeg -version 2>/dev/null | head -1 || echo unknown)",
  "platform": "$(uname -srm)",
  "scope": "evidence pack (testnet/local) para auditoria independente"
}
MF

echo "== 2) evidencia git"
git log --oneline -30 > "$OUT/evidence/git-log.txt" 2>/dev/null || true
git status --porcelain | head -50 > "$OUT/evidence/git-status.txt" 2>/dev/null || true

echo "== 3) checksums de fonte"
find . -type f \
  -not -path './.git/*' -not -path '*/node_modules/*' -not -path '*/.next/*' \
  -not -path '*/out/*' -not -path './backups/*' -not -path './audit/*' \
  -not -path './storage/*' -not -path './run/*' \
  -exec sha256sum {} + | sort > "$OUT/evidence/checksums.sha256"

echo "== 4) scan de segredos"
grep -rniE \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next \
  --exclude-dir=out --exclude-dir=backups --exclude-dir=audit \
  --exclude-dir=storage --exclude-dir=run \
  -e 'BEGIN [A-Z ]*PRIVATE KEY' -e 'PRIVKEY=0x[0-9a-fA-F]{16,}' \
  -e 'sk-[A-Za-z0-9]{20,}' -e 'xox[abps]-' \
  . > "$OUT/evidence/secrets-scan.txt" 2>/dev/null || true

echo "== 5) testes frescos"
node scripts/security-test.mjs > "$OUT/evidence/test-results/security.txt" 2>&1 || true
node scripts/wallet-test.mjs   > "$OUT/evidence/test-results/wallet.txt"   2>&1 || true
node scripts/scale-10k.mjs 1000 > "$OUT/evidence/test-results/scale-1k.txt" 2>&1 || true
bash scripts/dr-drill.sh        > "$OUT/evidence/test-results/dr-drill.txt" 2>&1 || true

echo "== 6) snapshots de runtime"
for ep in "3002 /api/health core" "3004 /api/content/dedup content" "3008 /api/chain/verify chain" "3010 /api/metrics monitor" "3014 /api/mod/queue moderation" "3017 /api/kpi kpi" "3019 /api/nano/status nano"; do
  set -- $ep
  curl -sf --max-time 3 "http://localhost:$1$2" > "$OUT/evidence/runtime/$3.json" 2>/dev/null || echo '{"status":"OFFLINE"}' > "$OUT/evidence/runtime/$3.json"
done

echo "== 7) docs de politica"
cp docs/*.md "$OUT/evidence/docs/" 2>/dev/null || true

echo "== 8) configs sanitizadas"
for d in services/*/; do n=$(basename "$d"); cp "$d/package.json" "$OUT/evidence/configs/$n.package.json" 2>/dev/null || true; done
cp apps/web/package.json "$OUT/evidence/configs/web.package.json" 2>/dev/null || true
cp .github/workflows/*.yml "$OUT/evidence/configs/" 2>/dev/null || true
cp .gitignore "$OUT/evidence/configs/" 2>/dev/null || true

echo "== 9) claims x evidencias"
cat > "$OUT/claims-evidence.json" << 'CE'
{
  "claims": [
    {"claim":"Auth rejeita credenciais invalidas e tokens forjados","evidence":"evidence/test-results/security.txt","test":"scripts/security-test.mjs"},
    {"claim":"Chain NST verifica integridade apos restore","evidence":"evidence/test-results/dr-drill.txt","test":"scripts/dr-drill.sh"},
    {"claim":"DR com RTO <= 900s e RPO ~0 no drill","evidence":"evidence/test-results/dr-drill.txt + docs/DR_DRILL_LOG.md","test":"scripts/dr-drill.sh"},
    {"claim":"API aguenta carga com 0 erros (1k no pack; 10k no historico)","evidence":"evidence/test-results/scale-1k.txt","test":"scripts/scale-10k.mjs"},
    {"claim":"Sem segredos reais no repo (placeholders exigem revisao humana)","evidence":"evidence/secrets-scan.txt","test":"grep patterns"},
    {"claim":"Mainnet NST NAO ativa (gate Item 40)","evidence":"evidence/docs (MAINNET/BRIDGE)","test":"politica"}
  ],
  "open_items_for_auditor": [
    "Revisar secrets-scan.txt (placeholder vs segredo real)",
    "Validar parametros PoW da testnet (reorg, Sybil, timestamp)",
    "Tentar bypass do anti-fraud (rate limits)",
    "Confirmar reproducibilidade via checksums.sha256"
  ]
}
CE

echo "== 10) escopo + verificacao"
cat > "$OUT/AUDIT_SCOPE.md" << AS
# Escopo de Auditoria Independente — NexaStream (testnet)
Gerado: $TS | Commit: $COMMIT

## Em escopo
- Codigo listado em evidence/checksums.sha256
- Servicos: core 3002, content 3004, chain 3008, monitor 3010, moderation 3014, kpi 3017, nano 3019 + web
- Testes frescos: security, wallet, scale-1k, dr-drill (evidence/test-results/)
- Politicas: threat model, DR, runbook, gate mainnet (evidence/docs/)

## Fora de escopo (declarado)
- Mainnet NST (NAO ATIVA — Item 40)
- Producao real (site estatico em GitHub Pages; backend testnet/local)
- node_modules (supply-chain audit separada)

## Como o auditor verifica
1. sh audit/$TS/verify.sh
2. Re-executar: node scripts/security-test.mjs | wallet-test.mjs | scale-10k.mjs | bash scripts/dr-drill.sh
3. Conferir claims-evidence.json contra as evidencias
AS
cat > "$OUT/verify.sh" << VS
#!/system/bin/sh
cd "\$(dirname "\$0")/../.." || exit 1
if sha256sum -c "audit/$TS/evidence/checksums.sha256" 2>/dev/null | grep -v ': OK'; then
  echo "VERIFICACAO FALHOU"; exit 1
else
  echo "TODOS OS CHECKSUMS OK"
fi
VS
chmod +x "$OUT/verify.sh"

echo "== 11) bundle"
tar -czf "audit/nexastream-audit-$TS.tar.gz" -C audit "$TS"
sha256sum "audit/nexastream-audit-$TS.tar.gz" | tee "$OUT/bundle.sha256"
rm -rf audit/latest && cp -r "$OUT" audit/latest
echo "PACOTE PRONTO: audit/$TS"
