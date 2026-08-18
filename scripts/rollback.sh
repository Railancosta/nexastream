#!/usr/bin/env bash
# Item 28: rollback por tag
set -e
TAG=${1:-$(git tag --sort=-v:refname | sed -n 2p)}
[ -z "$TAG" ] && echo "sem tag anterior" && exit 1
git checkout "$TAG"
echo "rollback para $TAG feito. Reinicie o nodo: docker compose down && docker compose up -d --build"
