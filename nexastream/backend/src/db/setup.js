/**
 * NexaStream Database Setup Script
 * Run: node src/db/setup.js
 */

const { sequelize, testConnection, syncModels } = require('./sequelize');
const { User, Channel, Video, Subscription, Comment, Transaction, NFT, Notification } = require('../models');

async function setup() {
  console.log('🚀 NexaStream Database Setup\n');

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Please check your database configuration in .env');
    process.exit(1);
  }

  // Sync all models
  console.log('\n📊 Syncing models...');
  await syncModels(true);

  // Create demo data
  console.log('\n👤 Creating demo users...');
  const user1 = await User.create({
    username: 'demouser',
    email: 'demo@nexastream.org',
    password: '$2a$10$demo', // Will be hashed on real registration
    displayName: 'Demo User',
    walletAddress: '0x' + Math.random().toString(16).slice(2, 42),
    role: 'creator'
  });

  const user2 = await User.create({
    username: 'creator1',
    email: 'creator@nexastream.org',
    password: '$2a$10$demo',
    displayName: 'Crypto Creator',
    walletAddress: '0x' + Math.random().toString(16).slice(2, 42),
    role: 'creator'
  });

  // Create channels
  console.log('📺 Creating demo channels...');
  const channel1 = await Channel.create({
    userId: user1.id,
    username: 'demouser',
    displayName: 'Demo Channel',
    description: 'Welcome to the NexaStream demo channel!',
    subscribers: 1250,
    totalViews: 50000,
    totalVideos: 25,
    isVerified: true
  });

  const channel2 = await Channel.create({
    userId: user2.id,
    username: 'creator1',
    displayName: 'Crypto Master',
    description: 'Your source for blockchain tutorials!',
    subscribers: 25000,
    totalViews: 1500000,
    totalVideos: 150,
    isVerified: true
  });

  // Create videos
  console.log('🎬 Creating demo videos...');
  const videos = [
    { title: 'Introduction to Blockchain', category: 'Crypto', views: 50000 },
    { title: 'DeFi Tutorial for Beginners', category: 'DeFi', views: 35000 },
    { title: 'NFT Minting Guide', category: 'NFT', views: 28000 },
    { title: 'Smart Contract Security', category: 'Security', views: 22000 },
    { title: 'Layer 2 Solutions Explained', category: 'Crypto', views: 18000 },
    { title: 'Web3 Development Setup', category: 'Tutorial', views: 45000 },
    { title: 'Yield Farming Strategies', category: 'DeFi', views: 15000 },
    { title: 'Crypto Market Analysis', category: 'Analysis', views: 60000 }
  ];

  for (const v of videos) {
    await Video.create({
      channelId: channel2.id,
      title: v.title,
      description: `Learn more about ${v.title} in this comprehensive guide.`,
      thumbnail: `https://picsum.photos/seed/${Math.random()}/640/360`,
      views: v.views,
      likes: Math.floor(v.views * 0.05),
      category: v.category,
      status: 'published',
      visibility: 'public'
    });
  }

  // Create transactions
  console.log('💰 Creating demo transactions...');
  await Transaction.create({
    userId: user2.id,
    type: 'reward',
    amount: 150.50,
    currency: 'NEXA',
    status: 'completed'
  });

  await Transaction.create({
    userId: user2.id,
    type: 'tip',
    amount: 10.00,
    currency: 'NEXA',
    status: 'completed'
  });

  console.log('\n✅ Database setup complete!');
  console.log(`   Users: 2`);
  console.log(`   Channels: 2`);
  console.log(`   Videos: ${videos.length}`);
  console.log(`   Transactions: 2`);

  process.exit(0);
}

setup().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
