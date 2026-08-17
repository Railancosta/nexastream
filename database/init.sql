CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, username TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, owner_id TEXT, name TEXT, handle TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, channel_id TEXT, title TEXT, description TEXT, video_path TEXT, thumbnail_path TEXT, duration INTEGER, status TEXT, views INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
