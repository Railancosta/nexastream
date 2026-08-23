# NexaStream — Deployment Guide

This document describes how to deploy the **v3.0 platform update** to production.
It covers the two pieces of the architecture:

1. **Frontend** — Next.js 16 static export → Cloudflare Pages (custom domain `nexastream.org`)
2. **Backend API** — Cloudflare Workers + D1 + R2 (`nexastream-api.railancosta.workers.dev`)

> ⚠️ **Credentials required.** Deployment needs GitHub (`GITHUB_TOKEN`/PAT) and
> Cloudflare (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) credentials. They are
> **not** available in the sandbox, so follow the steps below from your machine or
> via GitHub Actions (workflows are already configured in `.github/workflows/`).

---

## 1. Push code to GitHub

```bash
# From the repository root
git add -A
git commit -m "feat: platform v3.0 — categories, watchlist, favorites, search filters, related videos"
git push origin main
```

If prompted for credentials, use a **Personal Access Token (PAT)** with `repo`
scope instead of your password, or configure SSH:

```bash
git remote set-url origin git@github.com:Railancosta/nexastream.git
git push origin main
```

Pushing to `main` automatically triggers these GitHub Actions workflows:

| Workflow | What it does |
|---|---|
| `.github/workflows/deploy-cloudflare.yml` | Builds static export (`out/`) and deploys to Cloudflare Pages (`nexastream` project) |
| `.github/workflows/deploy-api.yml` | Deploys the Worker API, runs D1 schema + seed |
| `.github/workflows/ci.yml` | Runs backend syntax checks + frontend build |
| `.github/workflows/security.yml` | Security scan |

---

## 2. Deploy the backend Worker API (v3.0)

The Worker now exposes new endpoints. Deploy manually with:

```bash
cd workers/api
npm install
wrangler login                    # one-time
wrangler deploy                   # deploy Worker code
```

### 2.1 D1 schema migration (NEW TABLES)

The v3.0 API uses two new tables: `watchlist` and `favorites`. Apply the schema:

```bash
# Apply full schema (idempotent — CREATE TABLE IF NOT EXISTS)
wrangler d1 execute nexastream-db --remote --file=schema.sql

# Seed enriched demo data (20 videos across categories)
wrangler d1 execute nexastream-db --remote --file=seed.sql
```

Verify:

```bash
curl https://nexastream-api.railancosta.workers.dev/api/health
# → {"status":"ok","service":"nexastream-api","version":"3.0.0",...}
curl "https://nexastream-api.railancosta.workers.dev/api/categories"
# → {"categories":[...]}
```

---

## 3. Deploy the frontend to Cloudflare Pages

### Option A — GitHub Actions (recommended)

Push to `main` → `.github/workflows/deploy-cloudflare.yml` builds and deploys
automatically. Ensure these **secrets** are set in the repo:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Option B — Manual

```bash
# Repo root
npm ci
npx next build          # produces ./out (static export)
npx wrangler pages deploy ./out --project-name=nexastream
```

### Option C — Vercel (legacy workflow exists)

`.github/workflows/deploy-vercel.yml` deploys with server-side rendering if you
prefer Vercel over Cloudflare Pages.

---

## 4. Verify the live site

```bash
curl -I https://nexastream.org/                     # 200
curl https://nexastream.org/categories/             # new categories page
curl https://nexastream.org/watchlist/              # new library page
curl https://nexastream.org/video/?id=v1            # watch page
```

The frontend calls the Worker at `nexastream-api.railancosta.workers.dev` by
default (see `src/lib/api.ts`). To point a build at a different API, set
`NEXT_PUBLIC_API_URL` or use the `?api=` query override (stored in
`localStorage.ns_api`).

---

## 5. New API endpoints (v3.0)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories` | Category list with counts + labels/icons |
| GET | `/api/videos?category=&type=&sort=` | Filtered video list (recent/popular) |
| GET | `/api/videos/:id?viewer=` | Video detail + view increment + viewer state (liked/watchlisted/favorited) |
| GET | `/api/videos/:id/related` | Related videos (same category + popular fill) |
| GET | `/api/feed?tab=trending` | Trending feed tab |
| POST/DELETE | `/api/watchlist/:id` | Toggle watchlist (auth) |
| GET | `/api/watchlist` | List watchlist (auth) |
| POST/DELETE | `/api/favorites/:id` | Toggle favorites (auth) |
| GET | `/api/favorites` | List favorites (auth) |
| GET | `/api/history` | Watch history grouped by video (auth) |
| GET | `/api/search?q=&category=&type=&sort=` | Search with filters (title/desc/category/creator) |

---

## 6. Rollback

The repo includes `scripts/rollback.sh`. To roll back to the previous release:

```bash
bash scripts/rollback.sh
```

Or redeploy the previous commit:

```bash
git checkout <previous-tag-or-sha>
# rebuild + redeploy following steps 2–3
```

---

## 7. R2 Upload Support (v3.1)

The v3.1 update adds **real video uploads backed by Cloudflare R2**. Browsers
upload directly to R2 (presigned S3 URLs) or through the Worker proxy; the
Worker registers the object in D1 and serves it back with HTTP Range support.

### 7.1 Create the R2 bucket

```bash
cd workers/api
wrangler r2 bucket create nexastream-videos
```

The bucket binding `BUCKET` is already declared in `workers/api/wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "nexastream-videos"
```

### 7.2 Create an S3 API token (for presigned direct uploads)

Presigned uploads need an **S3 API token** (NOT the regular Cloudflare API
token). Create one in the dashboard: **R2 → Manage R2 API Tokens → Create API
Token** (permission: Object Read & Write, scope: `nexastream-videos`).

Then store the credentials as Worker secrets (never commit them):

```bash
cd workers/api
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

Set the non-secret config in `workers/api/wrangler.toml`:

```toml
[vars]
R2_ACCOUNT_ID = "your-cloudflare-account-id"
R2_BUCKET_NAME = "nexastream-videos"
R2_S3_ENDPOINT = "https://<account-id>.r2.cloudflarestorage.com"
R2_S3_REGION = "auto"
# MAX_UPLOAD_SIZE = "4294967296"   # default 4 GiB
```

> **Proxy fallback**: if `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` are not set,
> the API falls back to **proxy mode** — the Worker receives the file bytes via
> `PUT /api/upload/proxy` and stores them through the `BUCKET` binding. This
> works for files up to the Worker request limit (~100 MB); use presigned
> uploads for large files.

### 7.3 Configure R2 bucket CORS (required for browser uploads)

The S3 endpoint rejects browser requests without matching CORS. Apply this
policy (adjust `AllowedOrigins` to your domain):

```bash
wrangler r2 bucket cors set nexastream-videos --rules '[{"AllowedOrigins":["https://nexastream.org","http://localhost:3000"],"AllowedMethods":["GET","HEAD","PUT","POST","DELETE"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag","Content-Length","Content-Range"],"MaxAgeSeconds":3600}]'
```

(You can also set CORS from the dashboard: R2 bucket → Settings → CORS.)

### 7.4 Apply the D1 schema migration

```bash
wrangler d1 execute nexastream-db --remote --file=schema.sql
```

This adds the `pending_uploads` table and the `r2_key`, `file_size`,
`mime_type`, `thumb_r2_key` columns to `videos`. The Worker also runs an
idempotent `ensureUploadSchema()` migration automatically on first upload.

### 7.5 Deploy the Worker

```bash
cd workers/api
npm install
wrangler deploy
```

### 7.6 Verify the upload flow

```bash
# 1. Health
curl https://nexastream-api.railancosta.workers.dev/api/health

# 2. Register a user (or login)
curl -X POST https://nexastream-api.railancosta.workers.dev/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"uploader1","email":"uploader1@example.com","password":"secret123"}'

# 3. Presign (proxy mode unless S3 creds configured)
curl -X POST https://nexastream-api.railancosta.workers.dev/api/upload/presign \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Teste R2","category":"tech","file_size":12345,"mime_type":"video/mp4"}'

# 4. Upload bytes (proxy mode)
curl -X PUT "https://nexastream-api.railancosta.workers.dev/api/upload/proxy?upload_id=<ID>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: video/mp4' \
  --data-binary @sample.mp4

# 5. Complete (registers in D1)
curl -X POST https://nexastream-api.railancosta.workers.dev/api/upload/complete \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"upload_id":"<ID>","title":"Teste R2","category":"tech"}'

# 6. The video now appears in the feed and is playable with Range:
curl -sI "https://nexastream-api.railancosta.workers.dev/api/videos/stream/uploads/<user>/<key>" \
  -H "Range: bytes=0-1023"
```

### 7.7 New API endpoints (v3.1)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload/presign` | Auth. Returns R2 keys + presigned URL or proxy mode |
| PUT | `/api/upload/proxy` | Auth. Worker-relay upload of video/thumbnail bytes |
| POST | `/api/upload/multipart/init` | Auth. Start S3 multipart upload (large files) |
| POST | `/api/upload/multipart/part-url` | Auth. Presigned URL for one part |
| POST | `/api/upload/multipart/complete` | Auth. Complete S3 multipart upload |
| POST | `/api/upload/complete` | Auth. Register uploaded object in D1 |
| GET/HEAD | `/api/videos/stream/:r2Key` | Stream video with HTTP Range support |
| GET/HEAD | `/api/videos/thumb/:r2Key` | Stream thumbnail image |