#!/usr/bin/env bash
set -euo pipefail

# Generate SHA-256 checksums for release artifacts (rule 191).
# Usage: bash scripts/release/generate-checksums.sh <artifact-dir>

DIR="${1:-./dist}"
OUTPUT="${DIR}/checksums.sha256"

echo "Generating SHA-256 checksums for: $DIR"
find "$DIR" -type f ! -name "checksums.sha256" | while read -r file; do
  hash=$(sha256sum "$file" | awk '{print $1}')
  relative=$(realpath --relative-to="$DIR" "$file")
  echo "$hash  $relative" >> "$OUTPUT"
done

echo "Checksums written to: $OUTPUT"
cat "$OUTPUT"
