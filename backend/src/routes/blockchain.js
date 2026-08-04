/**
 * Blockchain Routes
 * Ethereum integration for NexaStream
 */

const express = require('express');
const db = require('../config/database');
const ethereumService = require('../blockchain/ethereum');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get blockchain status
router.get('/status', async (req, res) => {
  try {
    const stats = await ethereumService.getNetworkStats();
    
    // Get local token stats from database
    const tokenStats = db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(total_earnings) as total_distributed
      FROM users
    `).get();
    
    res.json({
      blockchain: stats,
      platform: {
        network: 'NexaStream',
        totalUsers: tokenStats?.total_users || 0,
        totalDistributed: tokenStats?.total_distributed || 0,
        tokenSymbol: 'NEXA',
        status: 'operational'
      }
    });
  } catch (error) {
    console.error('Blockchain status error:', error);
    res.status(500).json({ error: 'Failed to get blockchain status' });
  }
});

// Generate new wallet for user
router.post('/wallet/generate', async (req, res) => {
  try {
    const wallet = ethereumService.generateWallet();
    
    res.json({
      address: wallet.address,
      message: 'Wallet generated. Store private key securely!'
    });
  } catch (error) {
    console.error('Wallet generation error:', error);
    res.status(500).json({ error: 'Failed to generate wallet' });
  }
});

// Get wallet balance
router.get('/wallet/:address/balance', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    
    const balance = await ethereumService.getBalance(address);
    
    res.json({
      address,
      balance: balance,
      symbol: 'ETH'
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Get gas price
router.get('/gas-price', async (req, res) => {
  try {
    const gasPrice = await ethereumService.getGasPrice();
    
    res.json({
      gasPrice: gasPrice,
      unit: 'Gwei',
      estimatedCosts: {
        simpleTransfer: `${(gasPrice * 21000 / 1e9).toFixed(6)} ETH`,
        contractDeploy: `${(gasPrice * 5000000 / 1e9).toFixed(4)} ETH`,
        contractCall: `${(gasPrice * 100000 / 1e9).toFixed(6)} ETH`
      }
    });
  } catch (error) {
    console.error('Gas price error:', error);
    res.status(500).json({ error: 'Failed to get gas price' });
  }
});

// Get user's rewards info
router.get('/rewards/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's video stats
    const videoStats = db.prepare(`
      SELECT 
        COUNT(*) as total_videos,
        SUM(views) as total_views,
        SUM(likes) as total_likes
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE c.user_id = ?
    `).get(userId);
    
    // Calculate pending rewards (simplified)
    const views = videoStats?.total_views || 0;
    const rewardRate = parseFloat(process.env.REWARD_PER_VIEW || '0.000001');
    const pendingRewards = views * rewardRate;
    
    res.json({
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        total_earnings: user.total_earnings || 0,
        pending_rewards: pendingRewards
      },
      stats: {
        totalVideos: videoStats?.total_videos || 0,
        totalViews: views,
        totalLikes: videoStats?.total_likes || 0
      },
      token: {
        symbol: 'NEXA',
        rewardPerView: rewardRate
      }
    });
  } catch (error) {
    console.error('Rewards error:', error);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

// Claim rewards (mock for now - real implementation needs wallet integration)
router.post('/rewards/:userId/claim', async (req, res) => {
  try {
    const { userId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
    
    if (decoded.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get video stats
    const videoStats = db.prepare(`
      SELECT SUM(views) as total_views
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE c.user_id = ?
    `).get(userId);
    
    const views = videoStats?.total_views || 0;
    const rewardRate = parseFloat(process.env.REWARD_PER_VIEW || '0.000001');
    const pendingRewards = views * rewardRate;
    
    // Update user's total earnings
    db.prepare(`
      UPDATE users SET total_earnings = total_earnings + ? WHERE id = ?
    `).run(pendingRewards, userId);
    
    res.json({
      success: true,
      claimed: pendingRewards,
      token: 'NEXA',
      message: 'Rewards claimed successfully!',
      transactionHash: `0x${uuidv4().replace(/-/g, '')}` // Mock tx hash
    });
  } catch (error) {
    console.error('Claim rewards error:', error);
    res.status(500).json({ error: 'Failed to claim rewards' });
  }
});

// Update user wallet address
router.put('/wallet', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
    
    const { wallet_address } = req.body;
    
    // Validate address format
    if (!wallet_address || !wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    
    db.prepare('UPDATE users SET wallet_address = ? WHERE id = ?').run(wallet_address, decoded.userId);
    
    res.json({
      success: true,
      wallet_address,
      message: 'Wallet address updated!'
    });
  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

module.exports = router;
