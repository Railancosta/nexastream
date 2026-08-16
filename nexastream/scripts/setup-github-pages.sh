#!/bin/bash
# Script para configurar GitHub Pages via GitHub API
# Uso: GITHUB_TOKEN=xxx ./setup-github-pages.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Configurando GitHub Pages para NexaStream${NC}\n"

# Verificar se tem token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ GITHUB_TOKEN não está configurado!${NC}"
    echo "Configure com: export GITHUB_TOKEN=seu_token_aqui"
    exit 1
fi

REPO="Railancosta/nexastream"
API_URL="https://api.github.com"

echo -e "${YELLOW}📋 Configurando GitHub Pages...${NC}"

# Habilitar GitHub Pages (branch main, root)
echo -e "\n${YELLOW}1. Habilitando GitHub Pages (branch: main, path: /)${NC}"

RESPONSE=$(curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -H "Content-Type: application/json" \
    "$API_URL/repos/$REPO/pages" \
    -d '{
        "build_type": "workflow",
        "source": {
            "branch": "main",
            "path": "/"
        }
    }')

# Verificar resposta
if echo "$RESPONSE" | grep -q "html_url"; then
    echo -e "${GREEN}✅ GitHub Pages habilitado com sucesso!${NC}"
    echo "$RESPONSE" | grep -o '"html_url":"[^"]*"' | cut -d'"' -f4
elif echo "$RESPONSE" | grep -q "already"; then
    echo -e "${YELLOW}⚠️ GitHub Pages já está configurado${NC}"
else
    echo -e "${RED}❌ Erro ao configurar GitHub Pages${NC}"
    echo "$RESPONSE"
fi

echo -e "\n${GREEN}✅ Configuração concluída!${NC}"
echo -e "\n📌 Seu site estará disponível em:"
echo -e "   https://Railancosta.github.io/nexastream"
echo -e "\n⏱️ O deploy pode levar de 1-5 minutos."
