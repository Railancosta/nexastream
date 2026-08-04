# NexaStream - Deployment Guide

## 🚀 Deploy NexaStream.org

### Step 1: Deploy Backend on Render

1. Go to: https://render.com
2. Click **New +** → **Web Service**
3. Connect to GitHub: `Railancosta/nexastream`
4. Configure:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Name | `nexastream-api` |
| Region | Oregon |
| Branch | main |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |

5. Add Environment Variables:

```
DATABASE_URL=postgresql://postgres:Duck121472%40%40@db.bslfsfquympulymbagde.supabase.co:5432/postgres
JWT_SECRET=8b711cc4-e22a-4abe-b20f-33a4c4c309d4
SUPABASE_URL=https://bslfsfquympulymbagde.supabase.co
PORT=3001
NODE_ENV=production
```

6. Click **Create Web Service**

---

### Step 2: Deploy Frontend on Cloudflare Pages

1. Go to: https://pages.cloudflare.com
2. Click **Create a project**
3. Connect to GitHub: `Railancosta/nexastream`
4. Configure:

| Setting | Value |
|---------|-------|
| Project name | `nexastream` |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `frontend/out` |

5. Click **Deploy**

---

### Step 3: Configure Custom Domain

#### On Cloudflare Pages:

1. Go to your project → **Settings**
2. Click **Custom domains**
3. Add `nexastream.org`
4. Cloudflare will auto-configure SSL

#### On Cloudflare DNS (if needed):

1. Go to: https://dash.cloudflare.com
2. Select domain: `nexastream.org`
3. Go to **DNS** → **Records**
4. Ensure these records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 185.199.108.153 | DNS Only |
| A | @ | 185.199.109.153 | DNS Only |
| A | @ | 185.199.110.153 | DNS Only |
| A | @ | 185.199.111.153 | DNS Only |
| CNAME | www | your-project.pages.dev | DNS Only |

---

### Step 4: Security Configuration

#### HTTPS/SSL (Automatic with Cloudflare)

Cloudflare provides free SSL with:
- ✅ TLS 1.3
- ✅ SHA-256 encryption
- ✅ Automatic HTTPS Rewrites
- ✅ Full encryption mode

#### Security Headers

Add these in Cloudflare **Rules** → **Configuration Rules**:

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

### Step 5: Update API URL

After backend deploy, get your Render URL:
```
https://nexastream-api.onrender.com
```

Update in frontend `.env`:
```
NEXT_PUBLIC_API_URL=https://nexastream-api.onrender.com/api
```

Rebuild and redeploy frontend.

---

## ✅ Expected Result

| URL | Status |
|-----|--------|
| https://nexastream.org | ✅ Online |
| https://nexastream.org/api/health | ✅ Backend OK |
| https://www.nexastream.org | ✅ Redirects |

---

## 🔐 Security Features

| Feature | Status |
|---------|--------|
| HTTPS | ✅ Cloudflare SSL |
| TLS Version | ✅ 1.3 |
| Encryption | ✅ SHA-256 |
| HSTS | ✅ Enabled |
| Security Headers | ✅ Configured |
| DDoS Protection | ✅ Cloudflare |
| WAF | ✅ Cloudflare |

---

## 📞 Quick Links

| Service | URL |
|---------|-----|
| Cloudflare Dashboard | https://dash.cloudflare.com |
| Cloudflare Pages | https://pages.cloudflare.com |
| Render Dashboard | https://render.com |
| Supabase | https://supabase.com |

---

## Troubleshooting

### DNS Not Propagating
- Wait 24-48 hours
- Check: https://dnschecker.org/#A/nexastream.org

### SSL Certificate Error
- Cloudflare SSL mode: **Full** or **Flexible**
- Wait 15 minutes after DNS change

### Backend 500 Error
- Check Render logs
- Verify DATABASE_URL
- Check environment variables
