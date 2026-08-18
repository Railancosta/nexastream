#!/system/bin/sh
cd "$(dirname "$0")/../.." || exit 1
if sha256sum -c "audit/20260818-180523/evidence/checksums.sha256" 2>/dev/null | grep -v ': OK'; then
  echo "VERIFICACAO FALHOU"; exit 1
else
  echo "TODOS OS CHECKSUMS OK"
fi
