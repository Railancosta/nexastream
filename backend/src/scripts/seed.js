const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function seed() {
  console.log('🌱 Seeding database...');
  
  // Create demo users
  const users = [
    { username: 'cryptomaster', email: 'crypto@demo.com', display_name: 'Crypto Master', bio: 'Your #1 source for crypto news' },
    { username: 'techguru', email: 'tech@demo.com', display_name: 'Tech Guru', bio: 'Latest tech reviews and tutorials' },
    { username: 'defi_king', email: 'defi@demo.com', display_name: 'DeFi King', bio: 'DeFi tutorials and yield farming tips' },
    { username: 'nft_artist', email: 'nft@demo.com', display_name: 'NFT Artist', bio: 'Creating digital art and NFTs' },
    { username: 'web3dev', email: 'dev@demo.com', display_name: 'Web3 Dev', bio: 'Smart contract developer' },
  ];

  for (const userData of users) {
    const userId = uuidv4();
    const password_hash = await bcrypt.hash('demo123', 10);
    
    try {
      db.prepare(`
        INSERT INTO users (id, email, username, password_hash, display_name, bio, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(userId, userData.email, userData.username, password_hash, userData.display_name, userData.bio);
      
      // Create channel
      const channelId = uuidv4();
      db.prepare(`
        INSERT INTO channels (id, user_id, name, handle, description, subscriber_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(channelId, userId, userData.display_name, userData.username, userData.bio, Math.floor(Math.random() * 50000) + 1000);
      
      console.log(`✓ Created user: ${userData.username}`);
    } catch (e) {
      if (!e.message.includes('UNIQUE')) console.log(`User ${userData.username} exists`);
    }
  }
  
  // Get all channels
  const channels = db.prepare('SELECT id, user_id, name FROM channels').all();
  
  // Create sample videos
  const videoData = [
    { title: 'Bitcoin Halving 2024: Complete Guide', category: 'crypto', views: 125000 },
    { title: 'Build Your First DeFi App', category: 'defi', views: 89000 },
    { title: 'NFT Minting Tutorial', category: 'nft', views: 67000 },
    { title: 'Web3 Development Setup', category: 'technology', views: 54000 },
    { title: 'Top 10 Crypto Gains This Week', category: 'crypto', views: 156000 },
    { title: 'Layer 2 Solutions Explained', category: 'technology', views: 43000 },
    { title: 'Staking Rewards: Maximize Returns', category: 'defi', views: 38000 },
    { title: 'Blockchain Gaming Future', category: 'gaming', views: 29000 },
    { title: 'Ethereum vs Solana', category: 'crypto', views: 78000 },
    { title: 'Smart Contract Security Tips', category: 'technology', views: 45000 },
  ];
  
  for (const data of videoData) {
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const videoId = uuidv4();
    
    try {
      db.prepare(`
        INSERT INTO videos (id, channel_id, title, description, video_url, thumbnail_url, duration, views, likes, category, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now', '-' || ? || ' days'))
      `).run(
        videoId,
        channel.id,
        data.title,
        `Learn more about ${data.title.toLowerCase()}`,
        `/uploads/videos/sample.mp4`,
        `https://picsum.photos/seed/${videoId}/640/360`,
        Math.floor(Math.random() * 1800) + 60,
        data.views,
        Math.floor(data.views * 0.05),
        data.category,
        Math.floor(Math.random() * 30)
      );
      
      db.prepare('UPDATE channels SET total_videos = total_videos + 1, total_views = total_views + ? WHERE id = ?').run(data.views, channel.id);
      
      console.log(`✓ Created video: ${data.title}`);
    } catch (e) {
      console.log(`Video error: ${e.message}`);
    }
  }
  
  console.log('✅ Seeding complete!');
  console.log('\nDemo accounts:');
  console.log('  Email: crypto@demo.com');
  console.log('  Password: demo123');
}

seed();
