import { Video, Channel, User, Transaction, Alert, Boost, Ad } from '@/types';

// Demo Videos
export function getDemoVideos(): Video[] {
  return [
    {
      id: 'nx_demo_1',
      channelId: 'ch_1',
      title: 'Pro Gaming Tips that Actually Work in 2026',
      description: 'Advanced gaming strategies for competitive players',
      thumbnail: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=400&h=225&fit=crop',
      videoUrl: 'https://example.com/video1.mp4',
      duration: 485, // 8:05
      category: 'Gaming',
      tags: ['gaming', 'tips', 'esports'],
      views: 920000,
      likes: 76000,
      dislikes: 1200,
      comments: 3400,
      shares: 8900,
      status: 'published',
      isLive: false,
      isShort: true,
      isBoosted: true,
      boostAmount: 50,
      earnings: 461.00,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'nx_demo_2',
      channelId: 'ch_2',
      title: 'Painting Time-lapse: Ocean at Sunset — 4K',
      description: 'Watch me create this beautiful ocean sunset painting',
      thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=225&fit=crop',
      videoUrl: 'https://example.com/video2.mp4',
      duration: 2840, // 47:20
      category: 'Art',
      tags: ['art', 'painting', 'tutorial'],
      views: 680000,
      likes: 57000,
      dislikes: 800,
      comments: 2100,
      shares: 5600,
      status: 'published',
      isLive: false,
      isShort: false,
      isBoosted: false,
      earnings: 340.00,
      createdAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-14'),
    },
    {
      id: 'nx_demo_3',
      channelId: 'ch_3',
      title: 'The $NEXA Token Explained in 5 Minutes',
      description: 'Everything you need to know about NexaStream token',
      thumbnail: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=225&fit=crop',
      videoUrl: 'https://example.com/video3.mp4',
      duration: 312, // 5:12
      category: 'Crypto',
      tags: ['crypto', 'token', 'explained'],
      views: 310000,
      likes: 24100,
      dislikes: 500,
      comments: 1200,
      shares: 4500,
      status: 'published',
      isLive: false,
      isShort: true,
      isBoosted: true,
      boostAmount: 25,
      earnings: 179.00,
      createdAt: new Date('2024-01-13'),
      updatedAt: new Date('2024-01-13'),
    },
    {
      id: 'nx_demo_4',
      channelId: 'ch_4',
      title: 'How I Made $2,400 USDC in My First Week on NexaStream',
      description: 'Real earnings report from a new creator',
      thumbnail: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=225&fit=crop',
      videoUrl: 'https://example.com/video4.mp4',
      duration: 1456, // 24:16
      category: 'Tutorial',
      tags: ['earnings', 'guide', 'creator'],
      views: 184000,
      likes: 12800,
      dislikes: 300,
      comments: 890,
      shares: 2300,
      status: 'published',
      isLive: false,
      isShort: false,
      isBoosted: true,
      boostAmount: 100,
      earnings: 92.00,
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-12'),
    },
    {
      id: 'nx_demo_5',
      channelId: 'ch_5',
      title: 'Apostas podem destruir sua vida',
      description: 'Warning about gambling addiction',
      thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&h=225&fit=crop',
      videoUrl: 'https://example.com/video5.mp4',
      duration: 420,
      category: 'Education',
      tags: ['gambling', 'awareness'],
      views: 70,
      likes: 2,
      dislikes: 0,
      comments: 5,
      shares: 1,
      status: 'published',
      isLive: false,
      isShort: false,
      isBoosted: false,
      earnings: 1.00,
      createdAt: new Date('2024-01-11'),
      updatedAt: new Date('2024-01-11'),
    },
  ];
}

// Demo Channels
export function getDemoChannels(): Channel[] {
  return [
    {
      id: 'ch_1',
      ownerId: 'user_1',
      name: 'FPS_Elite',
      slug: 'fps-elite',
      description: 'Pro gaming tips and tricks',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      category: 'Gaming',
      subscriberCount: 45000,
      totalViews: 2500000,
      totalEarnings: 2400,
      isVerified: true,
      isActive: true,
      createdAt: new Date('2023-06-01'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'ch_2',
      ownerId: 'user_2',
      name: 'ArtWithElla',
      slug: 'art-with-ella',
      description: 'Digital art tutorials and time-lapses',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      category: 'Art',
      subscriberCount: 32000,
      totalViews: 1800000,
      totalEarnings: 1850,
      isVerified: true,
      isActive: true,
      createdAt: new Date('2023-07-15'),
      updatedAt: new Date('2024-01-14'),
    },
    {
      id: 'ch_3',
      ownerId: 'user_3',
      name: 'CryptoBreak',
      slug: 'crypto-break',
      description: 'Crypto news and educational content',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      category: 'Crypto',
      subscriberCount: 28000,
      totalViews: 1200000,
      totalEarnings: 1200,
      isVerified: true,
      isActive: true,
      createdAt: new Date('2023-08-01'),
      updatedAt: new Date('2024-01-13'),
    },
    {
      id: 'ch_4',
      ownerId: 'user_4',
      name: 'CreatorFirst',
      slug: 'creator-first',
      description: 'Tips for new content creators',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      category: 'Education',
      subscriberCount: 15000,
      totalViews: 650000,
      totalEarnings: 580,
      isVerified: false,
      isActive: true,
      createdAt: new Date('2023-09-01'),
      updatedAt: new Date('2024-01-12'),
    },
  ];
}

// Demo Users
export function getDemoUsers(): User[] {
  return [
    {
      id: 'user_platform',
      email: 'owner@nexastream.io',
      username: 'nexastream',
      displayName: 'NexaStream Platform',
      walletAddress: '0xa453B71A216a8A6608e79247B162df47B2770899',
      isVerified: true,
      isCreator: true,
      totalEarnings: 0,
      subscriberCount: 0,
      videoCount: 0,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    },
  ];
}

// Demo Transactions
export function getDemoTransactions(): Transaction[] {
  return [
    {
      id: 'tx_1',
      userId: 'user_1',
      type: 'earning',
      amount: 25.50,
      currency: 'USDC',
      status: 'confirmed',
      txHash: '0x1234...5678',
      metadata: { videoId: 'nx_demo_1', source: 'ad_revenue' },
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 'tx_2',
      userId: 'user_1',
      type: 'withdrawal',
      amount: 100.00,
      currency: 'USDC',
      status: 'confirmed',
      txHash: '0xabcd...efgh',
      toAddress: '0xa453B71A216a8A6608e79247B162df47B2770899',
      metadata: { method: 'direct_to_platform' },
      createdAt: new Date('2024-01-14'),
    },
  ];
}

// Demo Alerts
export function getDemoAlerts(): Alert[] {
  return [
    {
      id: 'alert_1',
      userId: 'user_demo',
      type: 'payment',
      title: 'Payment Received!',
      message: 'You received $25.50 USDC from ad revenue.',
      data: { amount: 25.50, txHash: '0x1234...5678' },
      read: false,
      createdAt: new Date(),
    },
    {
      id: 'alert_2',
      userId: 'user_demo',
      type: 'milestone',
      title: '10K Views Milestone!',
      message: 'Congratulations! Your video "My First Upload" just reached 10,000 views!',
      data: { videoId: 'nx_demo_5', views: 10000 },
      read: false,
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'alert_3',
      userId: 'user_demo',
      type: 'security',
      title: 'New Login Detected',
      message: 'A new login was detected from a new device. If this wasn\'t you, please secure your account.',
      data: { ip: '192.168.1.1', location: 'New York, US' },
      read: true,
      createdAt: new Date(Date.now() - 86400000),
    },
  ];
}

// Demo Boosts
export function getDemoBoosts(): Boost[] {
  return [
    {
      id: 'boost_1',
      videoId: 'nx_demo_1',
      userId: 'user_1',
      amount: 50,
      currency: 'USDC',
      duration: 7,
      targetAudience: { countries: ['US', 'UK', 'CA'] },
      status: 'active',
      impressions: 15000,
      clicks: 450,
      startedAt: new Date('2024-01-10'),
      endsAt: new Date('2024-01-17'),
    },
  ];
}

// Demo Ads
export function getDemoAds(): Ad[] {
  return [
    {
      id: 'ad_1',
      advertiserId: 'adv_1',
      type: 'pre-roll',
      targetUrl: 'https://example.com/product',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
      title: 'Web3 Gaming Gear',
      description: 'Level up your setup with pro gaming peripherals',
      budget: 1000,
      spent: 450,
      impressions: 50000,
      clicks: 1200,
      cpm: 9.00,
      ctr: 2.4,
      status: 'active',
      createdAt: new Date('2024-01-01'),
    },
  ];
}
