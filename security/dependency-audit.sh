#!/usr/bin/env bash
# Dependency audit (Item 30)
cd "$(dirname "$0")/.."
echo "🔍 Auditando dependências..."
find . -name 'package.json' -not -path '*/node_modules/*' | while read p; do
  echo "📦 $p"
  (cd "$(dirname "$p")" && npm audit --omit=dev 2>/dev/null || echo "  ⚠️  falhas conhecidas — revisar")
done
