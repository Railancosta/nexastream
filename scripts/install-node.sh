#!/usr/bin/env bash
# NexaStream - instalador de nodo comunitario (Item 58)
set -e
TAG=${1:-v0.1-testnet}
command -v git  >/dev/null || { echo "ERRO: instale git";  exit 1; }
command -v node >/dev/null || { echo "ERRO: instale node >= 22"; exit 1; }
command -v ffmpeg >/dev/null || echo "AVISO: sem ffmpeg (transcoding limitado)"
rm -rf nexastream-node
git clone --depth 1 --branch "$TAG" https://github.com/Railancosta/nexastream nexastream-node
cd nexastream-node
if command -v docker >/dev/null 2>&1; then
  docker compose up -d --build
  docker exec nexastream-node bash scripts/health-check.sh
else
  echo "Sem Docker: modo processo (recomendado em maquina dedicada use Docker)"
  bash scripts/node-entry.sh
fi
