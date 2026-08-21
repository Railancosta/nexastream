-- NexaStream D1 Database Schema
-- Cloudflare D1 (SQLite) — 5GB free tier

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  channel_name TEXT,
  nst_balance INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  channel_name TEXT,
  user_id TEXT,
  video_path TEXT,
  thumbnail_path TEXT,
  magnet_uri TEXT,
  info_hash TEXT,
  duration INTEGER DEFAULT 0,
  size INTEGER DEFAULT 0,
  is_short INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ready',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (video_id) REFERENCES videos(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  subscriber_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (subscriber_id, channel_id),
  FOREIGN KEY (subscriber_id) REFERENCES users(id),
  FOREIGN KEY (channel_id) REFERENCES users(id)
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, video_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Bandwidth reports for P2P incentives
CREATE TABLE IF NOT EXISTS bandwidth_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL,
  peer_id TEXT NOT NULL,
  bytes_uploaded INTEGER DEFAULT 0,
  bytes_downloaded INTEGER DEFAULT 0,
  timestamp INTEGER,
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Moderation table
CREATE TABLE IF NOT EXISTS moderation (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  moderator_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- NST Transactions
CREATE TABLE IF NOT EXISTS nst_transactions (
  id TEXT PRIMARY KEY,
  from_user_id TEXT,
  to_user_id TEXT,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_shorts ON videos(is_short);
CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_video ON bandwidth_reports(video_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_peer ON bandwidth_reports(peer_id);
