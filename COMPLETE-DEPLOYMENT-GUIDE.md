# 🚀 NexaStream Complete Deployment Guide

## ✅ Code Already Pushed to GitHub

**PR Created**: https://github.com/Railancosta/nexastream/pull/1

Branch: `feature/production-deployment`

---

## 📋 Step 1: DNS Configuration for nexastream.org

### Option A: GoDaddy DNS Configuration

1. **Login to GoDaddy**: https://dns.godaddy.com
2. **Select Domain**: `nexastream.org`
3. **Add DNS Records**:

#### For Vercel Frontend:
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | cname.vercel-dns.com | 1 hour |
| A | @ | 76.76.21.21 | 1 hour |

#### For API Backend (Railway/Render):
Add these after deploying backend:
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | api | your-backend.railway.app | 1 hour |

### Option B: Cloudflare DNS Configuration

1. **Login to Cloudflare**: https://dash.cloudflare.com
2. **Add Site**: `nexastream.org`
3. **Update Nameservers** at your registrar
4. **Add Records**:

```
Type: A
Name: @
Content: 76.76.21.21
Proxy: DNS Only

Type: CNAME
Name: www
Content: cname.vercel-dns.com
Proxy: DNS Only

Type: CNAME
Name: api
Content: your-backend.railway.app
Proxy: DNS Only
```

5. **Enable SSL**: SSL/TLS → Mode: Full

---

## 🗄️ Step 2: PostgreSQL Database Setup

### Option A: Supabase (Recommended - Free Tier)

1. **Create Account**: https://supabase.com
2. **Create New Project**: "NexaStream"
3. **Get Connection String** from Settings → Connection String
4. **Database URL Format**:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

5. **Add to Backend Environment**:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.XXXX.supabase.co:5432/postgres
   ```

### Option B: Neon (Serverless PostgreSQL)

1. **Create Account**: https://neon.tech
2. **Create Project**: "NexaStream"
3. **Get Connection String**
4. **Update Environment**:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx-xxx-123456.us-east-2.aws.neon.tech/nexastream
   ```

### Option C: Railway PostgreSQL

1. **Create Project** in Railway
2. **Add PostgreSQL** → Provision
3. **Get Connection String** from Variables tab
4. **Update Environment**:
   ```env
   DATABASE_URL=postgres://default:password@host:5432/nexastream
   ```

---

## ⛓️ Step 3: Deploy Smart Contracts

### Prerequisites
```bash
# Install dependencies
cd contracts
npm install

# Create .env file
cat > .env << EOF
PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
REPORT_GAS=true
EOF
```

### Deploy to Low-Gas Networks (Recommended)

The project is configured for multiple low-cost networks:

#### Zora Network (~$0.001 gas)
```bash
npx hardhat run scripts/deploy.js --network zora
```

#### Base (~$0.001 gas)
```bash
npx hardhat run scripts/deploy.js --network base
```

#### Gnosis Chain (~$0.001 gas)
```bash
npx hardhat run scripts/deploy.js --network gnosis
```

#### Celo (~$0.001 gas)
```bash
npx hardhat run scripts/deploy.js --network celo
```

### Deploy to Ethereum Mainnet

⚠️ **Warning**: Mainnet deployment costs gas (~$100-500)

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

### Deploy to Testnets (Free)

#### Sepolia Testnet
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

#### Zora Testnet
```bash
npx hardhat run scripts/deploy.js --network zoraTestnet
```

### After Deployment

The deploy script will save addresses to `deployment-addresses.json`:

```json
{
  "network": "zora",
  "chainId": "7777777",
  "contracts": {
    "NexaNFT": "0x...",
    "NFTMarketplace": "0x...",
    "NexaToken": "0x...",
    "TimelockController": "0x...",
    "NexaDAO": "0x...",
    "CreatorVerification": "0x..."
  }
}
```

---

## 🌐 Step 4: Deploy Backend (Railway)

### 1. Connect GitHub
1. Go to: https://railway.app
2. Login with GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Select `Railancosta/nexastream`
5. Set Root Directory: `backend`

### 2. Configure Build
```
Build Command: npm install
Start Command: npm start
```

### 3. Add Environment Variables
```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://nexastream.org
JWT_SECRET=generate-a-secure-random-string-here
DATABASE_URL=your_postgresql_connection_string
```

### 4. Get Backend URL
After deployment, you'll see:
```
https://nexastream-backend.railway.app
```

---

## 🎯 Step 5: Deploy Frontend (Vercel)

### 1. Connect GitHub
1. Go to: https://vercel.com
2. Import `Railancosta/nexastream`
3. Set Root Directory: `frontend`

### 2. Configure Build
```
Framework: Next.js (detected automatically)
Build Command: npm run build
Output Directory: .next
```

### 3. Add Environment Variables
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_DOMAIN=nexastream.org
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_PLATFORM_OWNER=0xYourWalletAddress
NEXT_PUBLIC_USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

### 4. Configure Domain
1. Go to **Settings** → **Domains**
2. Add `nexastream.org`
3. Add `www.nexastream.org`

---

## 📊 Step 6: Update DNS Records

After getting your deployment URLs, update DNS:

### For Frontend (Vercel):
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### For Backend (Railway):
```
Type: CNAME
Name: api
Value: your-backend.railway.app
```

---

## ✅ Verification Checklist

After deployment, verify these URLs:

- [ ] https://nexastream.org - Frontend
- [ ] https://www.nexastream.org - WWW redirect
- [ ] https://api.nexastream.org/api/health - Backend health
- [ ] https://api.nexastream.org/api/videos - API endpoint
- [ ] https://explorer.zora.energy - Blockchain explorer (if using Zora)

---

## 🔧 Troubleshooting

### SSL/HTTPS Issues
- Wait 24-48 hours for DNS propagation
- In Cloudflare, set SSL mode to "Full"

### API Not Connecting
- Verify CORS settings in backend
- Check `FRONTEND_URL` environment variable
- Ensure `NEXT_PUBLIC_API_URL` is correct

### Database Connection Failed
- Check connection string format
- Verify password doesn't contain special characters (URL encode if needed)
- Check connection pool limits

### Smart Contract Deployment Failed
- Verify private key is valid (with 0x prefix)
- Ensure sufficient gas/token balance
- Check RPC URL is accessible

---

## 📚 Smart Contract Documentation

### NST Token (NexaStream Token)
- **Standard**: ERC-20
- **Max Supply**: 55,000,000 NST
- **Features**: Burnable, Pausable, Roles-based access

### NSTStaking
- Stake NST to earn rewards
- Configurable APY
- Auto-compounding

### NSTRewards
- Distribute rewards to creators
- Based on engagement metrics
- Transparent on-chain distribution

### NSTDAO
- On-chain governance
- Proposal creation and voting
- Timelock execution

### NexaNFT
- Mint video NFTs
- ERC-721 standard
- Royalty support

### NFTMarketplace
- Buy/sell NFTs
- Auction support
- 10% creator royalties

---

## 🔗 Useful Links

| Resource | URL |
|----------|-----|
| GitHub Repo | https://github.com/Railancosta/nexastream |
| PR | https://github.com/Railancosta/nexastream/pull/1 |
| Vercel | https://vercel.com |
| Railway | https://railway.app |
| Supabase | https://supabase.com |
| Zora Explorer | https://explorer.zora.energy |
| Base Explorer | https://basescan.org |
| Gnosis Explorer | https://gnosisscan.io |

---

**Built with ❤️ for the decentralized future**
**NexaStream v2.0**
