#!/bin/bash

# NexaStream - Production Deploy Script
# Deploy to Vercel + Railway

echo "=========================================="
echo "  NexaStream Deploy Script"
echo "=========================================="
echo ""

# Deploy Backend to Railway
echo "🚀 Deploying Backend to Railway..."
echo "1. Push code to GitHub"
echo "2. Go to https://railway.app"
echo "3. Create new project from GitHub"
echo "4. Set environment variables:"
echo "   - PORT=3001"
echo "   - NODE_ENV=production"
echo "   - FRONTEND_URL=https://nexastream.org"
echo ""

# Deploy Frontend to Vercel
echo "🚀 Deploying Frontend to Vercel..."
cd frontend

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

if command -v vercel &> /dev/null; then
    echo "Deploying to Vercel..."
    vercel --prod
else
    echo "Installing Vercel CLI..."
    npm install -g vercel
    echo "Deploying..."
    vercel --prod
fi

echo ""
echo "=========================================="
echo "  Deployment Configuration"
echo "=========================================="
echo ""
echo "1. Configure DNS in GoDaddy:"
echo "   CNAME www -> cname.vercel-dns.com"
echo "   A @ -> 76.76.21.21"
echo ""
echo "2. Add domain in Vercel Dashboard"
echo ""
echo "3. Set NEXT_PUBLIC_API_URL to your Railway URL"
echo ""
echo "See DEPLOY-NEXASTREAM-ORG.md for full instructions"
