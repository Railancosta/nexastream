import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/nexastream.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

export function initDB() {
  db = new Database(dbPath);
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      bio TEXT,
      wallet_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Channels table
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      handle TEXT UNIQUE NOT NULL,
      description TEXT,
      avatar_url TEXT,
      banner_url TEXT,
      subscribers INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      total_views INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Videos table
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      video_url TEXT,
      duration INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      dislikes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'processing',
      category TEXT,
      tags TEXT,
      reward_amount REAL DEFAULT 0,
      ipfs_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    );

    -- Comments table
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      parent_id TEXT,
      content TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (video_id) REFERENCES videos(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id)
    );

    -- Subscriptions table
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      subscriber_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(subscriber_id, channel_id),
      FOREIGN KEY (subscriber_id) REFERENCES users(id),
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    );

    -- Watch history
    CREATE TABLE IF NOT EXISTS watch_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      watch_time INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (video_id) REFERENCES videos(id)
    );

    -- Likes table
    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, video_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (video_id) REFERENCES videos(id)
    );

    -- Wallet transactions
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'NEXA',
      status TEXT DEFAULT 'pending',
      tx_hash TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Rewards table
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (video_id) REFERENCES videos(id)
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Live streams
    CREATE TABLE IF NOT EXISTS live_streams (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      stream_key TEXT UNIQUE,
      status TEXT DEFAULT 'offline',
      viewers INTEGER DEFAULT 0,
      started_at TEXT,
      ended_at TEXT,
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    );
  `);

  // Seed initial data
  seedData();
  
  console.log('✅ Database initialized');
  return db;
}

function seedData() {
  // Check if data exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  if (userCount.count === 0) {
    console.log('📦 Seeding initial data...');
    
    // Create demo users
    const users = [
      { id: uuidv4(), email: 'crypto@nexastream.org', username: 'CryptoAcademy', display_name: 'Crypto Academy', bio: 'Learn blockchain and earn crypto!', verified: 1 },
      { id: uuidv4(), email: 'defi@nexastream.org', username: 'DeFiMaster', display_name: 'DeFi Masters', bio: 'Your gateway to decentralized finance', verified: 1 },
      { id: uuidv4(), email: 'nft@nexastream.org', username: 'NFTWorld', display_name: 'NFT World', bio: 'Exploring the NFT ecosystem', verified: 1 },
      { id: uuidv4(), email: 'web3@nexastream.org', username: 'Web3Edu', display_name: 'Web3 Education', bio: 'Building the decentralized future', verified: 1 },
    ];
    
    users.forEach(user => {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, username, display_name, bio, wallet_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(user.id, user.email, 'demo123', user.username, user.display_name, user.bio, '0x' + user.id.slice(0, 40));
    });
    
    // Create channels
    const channels = users.map((user, i) => ({
      id: uuidv4(),
      user_id: user.id,
      name: user.display_name,
      handle: user.username.toLowerCase(),
      description: user.bio,
      verified: user.verified,
      subscribers: Math.floor(Math.random() * 1000000) + 10000,
      total_views: Math.floor(Math.random() * 50000000) + 100000
    }));
    
    channels.forEach(channel => {
      db.prepare(`
        INSERT INTO channels (id, user_id, name, handle, description, verified, subscribers, total_views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(channel.id, channel.user_id, channel.name, channel.handle, channel.description, channel.verified, channel.subscribers, channel.total_views);
    });
    
    // Create demo videos
    const videoTitles = [
      { title: 'Bitcoin Halving 2024: What You Need to Know', category: 'Crypto' },
      { title: 'How to Build Your First DeFi App', category: 'DeFi' },
      { title: 'NFT Minting Tutorial for Beginners', category: 'NFT' },
      { title: 'Web3 Development Setup Guide', category: 'Education' },
      { title: 'Top 10 Crypto Gains This Week', category: 'Trending' },
      { title: 'Layer 2 Solutions Explained Simply', category: 'Crypto' },
      { title: 'Staking Rewards: Maximize Your Returns', category: 'DeFi' },
      { title: 'The Future of Gaming on Blockchain', category: 'Gaming' },
      { title: 'Smart Contract Security Best Practices', category: 'Security' },
      { title: 'Building a DAO from Scratch', category: 'Governance' },
      { title: 'Crypto Market Analysis Live', category: 'Live' },
      { title: 'Yield Farming Strategies That Work', category: 'DeFi' },
    ];
    
    channels.forEach((channel, ci) => {
      videoTitles.slice(0, 3 + ci).forEach((video, vi) => {
        const videoId = uuidv4();
        db.prepare(`
          INSERT INTO videos (id, channel_id, title, description, thumbnail_url, video_url, duration, views, likes, status, category, reward_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          videoId,
          channel.id,
          video.title,
          `Learn more about ${video.title.toLowerCase()} in this comprehensive guide.`,
          `https://picsum.photos/seed/${videoId}/640/360`,
          `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`,
          Math.floor(Math.random() * 1800) + 60,
          Math.floor(Math.random() * 1000000) + 1000,
          Math.floor(Math.random() * 50000) + 100,
          'published',
          video.category,
          Math.floor(Math.random() * 100) + 10
        );
      });
    });
    
    console.log('✅ Initial data seeded');
  }
}

// Database helper functions
export function getDB() {
  return db;
}

export function getStats() {
  try {
    const stats = {
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      totalVideos: db.prepare('SELECT COUNT(*) as count FROM videos').get().count,
      totalViews: db.prepare('SELECT SUM(views) as total FROM videos').get().total || 0,
      totalChannels: db.prepare('SELECT COUNT(*) as count FROM channels').get().count,
      totalRewards: db.prepare('SELECT SUM(amount) as total FROM rewards').get().total || 0,
      onlineUsers: Math.floor(Math.random() * 5000) + 1000,
      liveStreams: db.prepare("SELECT COUNT(*) as count FROM live_streams WHERE status = 'live'").get().count,
      tokenPrice: 0.0234,
      tokenPriceChange: 12.5,
      totalValueLocked: 12500000,
      networkStatus: 'operational'
    };
    return stats;
  } catch (e) {
    return {
      totalUsers: 0,
      totalVideos: 0,
      totalViews: 0,
      totalChannels: 0,
      totalRewards: 0,
      onlineUsers: 0,
      liveStreams: 0,
      tokenPrice: 0.0234,
      tokenPriceChange: 12.5,
      totalValueLocked: 0,
      networkStatus: 'initializing'
    };
  }
}

export default { initDB, getDB, getStats };
