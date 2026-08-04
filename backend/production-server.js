/**
 * NexaStream Production Server
 * Serves both frontend (static) and backend (API)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_PORT = process.env.API_PORT || 3001;

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.twitch.tv"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from frontend/out
app.use(express.static(path.join(__dirname, '..', 'frontend', 'out')));

// API routes (mock for demo)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: '2.0.0',
    platform: 'NexaStream',
    network: 'NexaChain'
  });
});

app.get('/api/videos', (req, res) => {
  const mockVideos = [
    { id: '1', title: 'Bitcoin Halving 2024: Complete Guide', thumbnailUrl: 'https://picsum.photos/seed/v1/640/360', views: 125000, likes: 8500, category: 'crypto', rewardAmount: 25, duration: 1234, channel: { name: 'Crypto Academy', verified: true } },
    { id: '2', title: 'Build Your First DeFi App', thumbnailUrl: 'https://picsum.photos/seed/v2/640/360', views: 89000, likes: 6200, category: 'defi', rewardAmount: 30, duration: 2345, channel: { name: 'DeFi Masters', verified: true } },
    { id: '3', title: 'NFT Minting Tutorial for Beginners', thumbnailUrl: 'https://picsum.photos/seed/v3/640/360', views: 67000, likes: 4500, category: 'nft', rewardAmount: 20, duration: 1567, channel: { name: 'NFT World', verified: true } },
    { id: '4', title: 'Web3 Development Setup Guide', thumbnailUrl: 'https://picsum.photos/seed/v4/640/360', views: 54000, likes: 3800, category: 'education', rewardAmount: 15, duration: 1890, channel: { name: 'Web3 Education', verified: true } },
    { id: '5', title: 'Top 10 Crypto Gains This Week', thumbnailUrl: 'https://picsum.photos/seed/v5/640/360', views: 156000, likes: 12000, category: 'crypto', rewardAmount: 35, duration: 980, channel: { name: 'Crypto Academy', verified: true } },
    { id: '6', title: 'Layer 2 Solutions Explained', thumbnailUrl: 'https://picsum.photos/seed/v6/640/360', views: 43000, likes: 2900, category: 'technology', rewardAmount: 18, duration: 1456, channel: { name: 'Web3 Education', verified: true } },
    { id: '7', title: 'Staking Rewards: Maximize Returns', thumbnailUrl: 'https://picsum.photos/seed/v7/640/360', views: 38000, likes: 2600, category: 'defi', rewardAmount: 22, duration: 2134, channel: { name: 'DeFi Masters', verified: true } },
    { id: '8', title: 'The Future of Gaming on Blockchain', thumbnailUrl: 'https://picsum.photos/seed/v8/640/360', views: 29000, likes: 2100, category: 'gaming', rewardAmount: 12, duration: 1678, channel: { name: 'NFT World', verified: true } },
  ];
  res.json({ videos: mockVideos });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalVideos: 2847,
    totalViews: '12.5M',
    totalCreators: 1234,
    totalStaked: 45230,
    price: 0.0234,
    dailyRewards: 45230,
    tvl: '12.5M',
    networkSecurity: '99.9%'
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({
    topChannels: [
      { rank: 1, name: 'Crypto Academy', subscribers: '1.2M', earnings: 125000 },
      { rank: 2, name: 'DeFi Masters', subscribers: '890K', earnings: 98500 },
      { rank: 3, name: 'NFT World', subscribers: '650K', earnings: 72000 },
      { rank: 4, name: 'Web3 Education', subscribers: '520K', earnings: 58200 },
    ]
  });
});

// Blockchain stats endpoint
app.get('/api/chain/stats', (req, res) => {
  res.json({
    blockHeight: 18500000,
    totalTransactions: '45.2M',
    avgBlockTime: '3s',
    validators: 150,
    stakingAPY: '12.5%',
    totalStaked: '45.2M NST'
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'out', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 NexaStream Production Server v2.0                   ║
║                                                           ║
║   🌐 URL: http://0.0.0.0:${PORT}                          ║
║   📡 API: http://0.0.0.0:${PORT}/api                       ║
║                                                           ║
║   📊 Platform Stats:                                      ║
║   ├── Total Videos: 2,847                                ║
║   ├── Total Views: 12.5M                                 ║
║   ├── Creators: 1,234                                    ║
║   └── NST Staked: 45,230                                ║
║                                                           ║
║   🔗 NexaStream Chain:                                    ║
║   ├── Block Height: 18,500,000                           ║
║   ├── Validators: 150                                    ║
║   └── Staking APY: 12.5%                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
