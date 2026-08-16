import { Router } from 'express';
import { getDB, getStats } from '../db/database.js';

const router = Router();

// Get platform stats
router.get('/', (req, res) => {
  try {
    const stats = getStats();
    
    res.json({
      ...stats,
      featuredCreators: [
        { name: 'Crypto Academy', handle: 'cryptoacademy', subscribers: '1.2M', earnings: '125,000' },
        { name: 'DeFi Masters', handle: 'defimaster', subscribers: '890K', earnings: '98,500' },
        { name: 'NFT World', handle: 'nftworld', subscribers: '650K', earnings: '72,000' },
        { name: 'Web3 Education', handle: 'web3edu', subscribers: '520K', earnings: '58,200' },
      ],
      trendingTopics: [
        { name: 'Bitcoin', posts: '12.5K', growth: '+15%' },
        { name: 'DeFi', posts: '8.2K', growth: '+23%' },
        { name: 'NFT Drop', posts: '6.8K', growth: '+45%' },
        { name: 'Web3', posts: '5.1K', growth: '+12%' },
        { name: 'Crypto News', posts: '4.3K', growth: '+8%' },
      ]
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get live streams
router.get('/live', (req, res) => {
  try {
    const db = getDB();
    
    const liveStreams = [
      {
        id: 'live1',
        title: 'Live: Q&A about Bitcoin halving 2024',
        channel: { name: 'Crypto Academy', avatar: null },
        viewers: 12453,
        thumbnail: 'https://picsum.photos/seed/live1/640/360'
      },
      {
        id: 'live2',
        title: 'Building on Solana: Smart Contracts',
        channel: { name: 'DeFi Masters', avatar: null },
        viewers: 8721,
        thumbnail: 'https://picsum.photos/seed/live2/640/360'
      },
      {
        id: 'live3',
        title: 'NFT Minting Live Event',
        channel: { name: 'NFT World', avatar: null },
        viewers: 5432,
        thumbnail: 'https://picsum.photos/seed/live3/640/360'
      }
    ];
    
    res.json({ liveStreams });
  } catch (error) {
    console.error('Live streams error:', error);
    res.status(500).json({ error: 'Failed to get live streams' });
  }
});

// Get network status
router.get('/network', (req, res) => {
  res.json({
    status: 'operational',
    blockHeight: 18500000,
    hashRate: '450 EH/s',
    avgBlockTime: '13s',
    validators: 21,
    totalStake: '50000000 NEXA',
    lastBlock: {
      hash: '0x' + 'a'.repeat(64),
      time: new Date().toISOString(),
      reward: 3.5
    }
  });
});

export default router;
