-- Usuários
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Canais
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  handle TEXT UNIQUE,
  description TEXT,
  subscriber_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Vídeos
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_path TEXT,
  thumbnail_path TEXT,
  duration INTEGER,
  status TEXT DEFAULT 'processing',
  visibility TEXT DEFAULT 'public',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

-- Busca full-text
CREATE VIRTUAL TABLE IF NOT EXISTS videos_search USING fts5(
  title, description, content='videos'
);

-- Sessões
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
