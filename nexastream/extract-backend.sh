#!/bin/bash
# Script para criar repositório separado para o backend

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE} NexaStream Backend - GitHub Setup  ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Diretório do backend
BACKEND_DIR="backend-standalone"

# Criar diretório
echo -e "\n${GREEN}📁 Criando diretório: $BACKEND_DIR${NC}"
mkdir -p $BACKEND_DIR

# Copiar arquivos do backend
echo -e "${GREEN}📦 Copiando arquivos do backend...${NC}"
cp -r backend/src $BACKEND_DIR/
cp backend/package.json $BACKEND_DIR/
cp backend/.env.example $BACKEND_DIR/
cp backend/Dockerfile $BACKEND_DIR/
cp backend/render.yaml $BACKEND_DIR/
cp backend/README.md $BACKEND_DIR/

mkdir -p $BACKEND_DIR/.github/workflows
cp backend/.github/workflows/deploy.yml $BACKEND_DIR/.github/workflows/

# Criar package.json standalone
cat > $BACKEND_DIR/package.json << 'EOF'
{
  "name": "nexastream-backend",
  "version": "2.0.0",
  "description": "NexaStream Backend API - Blockchain Video Platform",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "dotenv": "^16.4.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.1",
    "multer": "^1.4.5-lts.1",
    "socket.io": "^4.7.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
EOF

# Criar .gitignore
cat > $BACKEND_DIR/.gitignore << 'EOF'
node_modules/
.env
uploads/
*.log
.DS_Store
coverage/
dist/
EOF

# Inicializar git
cd $BACKEND_DIR
git init
git add .
git commit -m "Initial commit - NexaStream Backend API v2.0

Features:
- User Management (auth, profile, 2FA)
- Video Platform (CRUD, likes, comments)
- Channel System (subscriptions, stats)
- Payments (wallet, tips, subscriptions)
- Live Streaming (RTMP, chat)
- NFT Marketplace (mint, buy, sell)
- Analytics (platform, channel, video)
- Real-time (WebSocket)

200+ API Endpoints"

echo -e "\n${GREEN}✅ Backend extraído com sucesso!${NC}"
echo -e "${GREEN}📁 Diretório: $BACKEND_DIR${NC}"
echo -e "\n${BLUE}Próximos passos:${NC}"
echo "1. cd $BACKEND_DIR"
echo "2. Crie um novo repo no GitHub: nexastream-backend"
echo "3. git remote add origin https://github.com/SEU_USER/nexastream-backend.git"
echo "4. git push -u origin main"
echo "5. Deploy no Render: https://render.com"
