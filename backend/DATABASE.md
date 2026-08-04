# NexaStream Database Setup

## PostgreSQL Database Guide

### Option 1: Render PostgreSQL (Recommended)

1. **Create PostgreSQL on Render**
   - Go to: https://render.com
   - Click **New +** → **PostgreSQL**
   - Configure:
     - Name: `nexastream-db`
     - Region: Oregon
     - Plan: Free
   - Click **Create Database**

2. **Get Connection String**
   - Copy the **Connection String** (looks like: `postgres://user:pass@host:5432/dbname`)

3. **Add to Render Web Service**
   - Go to your Web Service
   - **Environment** → **Add Environment Variable**
   - Add: `DATABASE_URL` = your connection string

---

### Option 2: Supabase (Free Tier)

1. **Create Supabase Project**
   - Go to: https://supabase.com
   - Sign up / Login
   - Create new project

2. **Get Connection Details**
   - Settings → Connection String
   - Copy **URI**

3. **Configure**
   ```
   DB_HOST = your-supabase-host.supabase.co
   DB_PORT = 5432
   DB_NAME = postgres
   DB_USER = postgres
   DB_PASSWORD = your-password
   ```

---

### Option 3: Railway

1. **Create Railway Project**
   - Go to: https://railway.app
   - New Project → Provision PostgreSQL

2. **Connect Database**
   - Get connection string from Variables tab
   - Add to your app

---

### Option 4: ElephantSQL (Free Tier)

1. **Create Account**
   - Go to: https://elephantsql.com
   - Create new instance
   - Choose "Turtle" plan (free)

2. **Get Details**
   - Copy the **URL** (connection string)

---

## Environment Variables

Create a `.env` file:

```env
# Database
DB_HOST=your-host
DB_PORT=5432
DB_NAME=nexastream
DB_USER=postgres
DB_PASSWORD=your-password
DATABASE_URL=postgres://user:pass@host:5432/dbname

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-key-minimum-32-characters

# Frontend URL
FRONTEND_URL=https://nexastream.org
```

---

## Run Database Setup

### Local Development

```bash
# Install dependencies
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials

# Run database setup
npm run db:setup
```

### On Render

The database setup runs automatically on first deploy if `DATABASE_URL` is configured.

---

## Database Schema

### Users Table
```sql
- id (UUID, PK)
- username (VARCHAR)
- email (VARCHAR, UNIQUE)
- password (VARCHAR)
- displayName (VARCHAR)
- walletAddress (VARCHAR)
- role (ENUM: user, creator, admin)
- createdAt, updatedAt
```

### Channels Table
```sql
- id (UUID, PK)
- userId (UUID, FK)
- username (VARCHAR, UNIQUE)
- displayName (VARCHAR)
- description (TEXT)
- subscribers (INT)
- totalViews (BIGINT)
- totalVideos (INT)
- totalEarnings (DECIMAL)
- isVerified (BOOLEAN)
- createdAt, updatedAt
```

### Videos Table
```sql
- id (UUID, PK)
- channelId (UUID, FK)
- title (VARCHAR)
- description (TEXT)
- thumbnail (VARCHAR)
- videoUrl (VARCHAR)
- views (BIGINT)
- likes (INT)
- category (VARCHAR)
- status (ENUM: uploading, processing, published)
- visibility (ENUM: public, private, unlisted)
- createdAt, updatedAt
```

### More Tables
- `subscriptions` - User subscriptions to channels
- `comments` - Video comments
- `transactions` - Wallet transactions
- `notifications` - User notifications
- `nfts` - NFT marketplace items
- `playlists` - User playlists
- `watch_history` - User watch history

---

## Useful Commands

```bash
# Sync models (create tables)
npm run db:sync

# Setup database with demo data
npm run db:setup

# Reset database (delete all data)
npm run db:sync -- --force
```

---

## Troubleshooting

### Connection Error
```
Unable to connect to PostgreSQL
```
- Check your `DATABASE_URL` is correct
- Verify database is running
- Check firewall settings

### SSL Error
```
SSL connection required
```
- Add `?sslmode=require` to connection string
- Or enable SSL in production

### Password Error
```
password authentication failed
```
- Double-check your password
- Ensure special characters are URL-encoded

---

## Support

For help, open an issue on GitHub.
