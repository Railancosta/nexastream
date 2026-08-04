/**
 * Database Initialization Script
 * NexaStream v3.0 - With Advanced Algorithms
 */

const db = require('../config/database');

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('📊 Initializing database...');

      // Users table
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT,
          bio TEXT,
          avatar_url TEXT,
          wallet_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_verified INTEGER DEFAULT 0,
          is_admin INTEGER DEFAULT 0,
          subscriber_count INTEGER DEFAULT 0,
          total_views INTEGER DEFAULT 0,
          total_earnings REAL DEFAULT 0
        )
      `);

      // Channels table
      db.exec(`
        CREATE TABLE IF NOT EXISTS channels (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          handle TEXT UNIQUE NOT NULL,
          description TEXT,
          avatar_url TEXT,
          banner_url TEXT,
          subscriber_count INTEGER DEFAULT 0,
          total_views INTEGER DEFAULT 0,
          total_videos INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_monetized INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Videos table
      db.exec(`
        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          channel_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          video_url TEXT NOT NULL,
          thumbnail_url TEXT,
          duration INTEGER DEFAULT 0,
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          dislikes INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          shares INTEGER DEFAULT 0,
          saves INTEGER DEFAULT 0,
          category TEXT DEFAULT 'general',
          tags TEXT,
          status TEXT DEFAULT 'published',
          is_premium INTEGER DEFAULT 0,
          is_featured INTEGER DEFAULT 0,
          price REAL DEFAULT 0,
          reward_amount REAL DEFAULT 0,
          avg_watch_time REAL DEFAULT 0,
          views_last_24h INTEGER DEFAULT 0,
          watch_time INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          published_at DATETIME,
          FOREIGN KEY (channel_id) REFERENCES channels(id)
        )
      `);

      // Comments table
      db.exec(`
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          video_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          parent_id TEXT,
          content TEXT NOT NULL,
          likes INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (video_id) REFERENCES videos(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (parent_id) REFERENCES comments(id)
        )
      `);

      // Subscriptions table
      db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, channel_id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (channel_id) REFERENCES channels(id)
        )
      `);

      // Likes table
      db.exec(`
        CREATE TABLE IF NOT EXISTS likes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          video_id TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, video_id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (video_id) REFERENCES videos(id)
        )
      `);

      // Watch history table
      db.exec(`
        CREATE TABLE IF NOT EXISTS watch_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          video_id TEXT NOT NULL,
          watch_duration INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (video_id) REFERENCES videos(id)
        )
      `);

      // Video views table (for analytics - TikTok/YouTube style)
      db.exec(`
        CREATE TABLE IF NOT EXISTS video_views (
          id TEXT PRIMARY KEY,
          video_id TEXT NOT NULL,
          viewer_id TEXT,
          watch_duration INTEGER DEFAULT 0,
          completion_rate REAL DEFAULT 0,
          device_type TEXT,
          referrer TEXT,
          country TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (video_id) REFERENCES videos(id)
        )
      `);

      // Video engagements table (likes, shares, saves)
      db.exec(`
        CREATE TABLE IF NOT EXISTS video_engagements (
          id TEXT PRIMARY KEY,
          video_id TEXT NOT NULL,
          user_id TEXT,
          type TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (video_id) REFERENCES videos(id)
        )
      `);

      // User interest profiles (for personalization)
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_interest_profiles (
          user_id TEXT PRIMARY KEY,
          favorite_categories TEXT,
          favorite_creators TEXT,
          recently_watched TEXT,
          engagement_patterns TEXT,
          watch_history_categories TEXT,
          watch_history_creators TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Creator relationships (Instagram-style)
      db.exec(`
        CREATE TABLE IF NOT EXISTS creator_relationships (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          interaction_count INTEGER DEFAULT 0,
          last_interaction DATETIME,
          is_subscribed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, channel_id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (channel_id) REFERENCES channels(id)
        )
      `);

      // Notifications table
      db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT,
          data TEXT,
          read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Sessions table
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          user_agent TEXT,
          ip_address TEXT,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Indexes for better performance (scaled for millions of users)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_videos_likes ON videos(likes DESC)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_videos_score ON videos(likes + comments_count * 2 + shares * 3)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_video_views_video ON video_views(video_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_video_engagements_video ON video_engagements(video_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON subscriptions(channel_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_creator_relationships_user ON creator_relationships(user_id)`);

      console.log('✅ Database tables created successfully');
      resolve();
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      reject(error);
    }
  });
};

module.exports = initDatabase;
