#!/bin/bash
# NexaStream API — Deploy Script
# Run this to deploy the Cloudflare Workers API

set -e

echo "🚀 NexaStream API — Deploy to Cloudflare Workers"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in
echo "📋 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare..."
    wrangler login
fi

echo ""
echo "📦 Step 1: Create D1 Database..."
D1_OUTPUT=$(wrangler d1 create nexastream-db 2>&1)
echo "$D1_OUTPUT"

# Extract database_id from output
DB_ID=$(echo "$D1_OUTPUT" | grep -o '"database_id": "[^"]*"' | cut -d'"' -f4)
echo "✅ Database ID: $DB_ID"

# Update wrangler.toml with real database_id
sed -i "s/YOUR_D1_DATABASE_ID/$DB_ID/g" wrangler.toml

echo ""
echo "📦 Step 2: Create R2 Bucket..."
wrangler r2 bucket create nexastream-videos || true
echo "✅ R2 Bucket created"

echo ""
echo "📦 Step 3: Initialize Database Schema..."
wrangler d1 execute nexastream-db --remote --file=./schema.sql
echo "✅ Schema initialized"

echo ""
echo "📦 Step 4: Seed Sample Data..."
wrangler d1 execute nexastream-db --remote --file=./seed.sql
echo "✅ Data seeded"

echo ""
echo "🚀 Step 5: Deploy Worker..."
wrangler deploy
echo "✅ Worker deployed"

echo ""
echo "📋 Step 6: Generate JWT Secret..."
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "⚠️  Add this to wrangler.toml [vars] section:"
echo "JWT_SECRET = \"$JWT_SECRET\""
echo ""
echo "Then run: wrangler deploy"

echo ""
echo "✅ Deploy complete!"
echo ""
echo "🔗 API URL: https://nexastream-api.railancosta.workers.dev"
echo "🔗 Health: https://nexastream-api.railancosta.workers.dev/api/health"
echo ""
echo "📊 Next steps:"
echo "1. Update JWT_SECRET in wrangler.toml"
echo "2. Run 'wrangler deploy' again"
echo "3. Test: curl https://nexastream-api.railancosta.workers.dev/api/health"
