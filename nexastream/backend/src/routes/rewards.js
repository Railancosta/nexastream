import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/database.js';

const router = Router();

// Get rewards info
router.get('/info', (req, res) => {
  res.json({
    token: {
      name: 'NexaStream Token',
      symbol: 'NEXA',
      decimals: 18,
      totalSupply: '1000000000',
      price: 0.0234,
      priceChange: 12.5
    },
    rewards: {
      videoUpload: 10,
      watchTime: 0.01, // per minute
      like: 1,
      comment: 2,
      share: 5,
      referral: 50
    },
    distribution: {
      creators: 50,
      platform: 30,
      staking: 20
    }
  });
});

// Get user rewards
router.get('/balance', (req, res) => {
  try {
    // Mock wallet balance
    res.json({
      balance: 1542.5,
      pending: 230.0,
      totalEarned: 8500.0,
      token: 'NEXA'
    });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Get reward history
router.get('/history', (req, res) => {
  try {
    const db = getDB();
    
    const rewards = [
      { id: uuidv4(), type: 'video_upload', amount: 10, description: 'New video: Bitcoin Tutorial', timestamp: new Date().toISOString() },
      { id: uuidv4(), type: 'watch_time', amount: 2.5, description: 'Watch time rewards', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: uuidv4(), type: 'engagement', amount: 5, description: 'Likes received', timestamp: new Date(Date.now() - 172800000).toISOString() },
      { id: uuidv4(), type: 'referral', amount: 50, description: 'New subscriber bonus', timestamp: new Date(Date.now() - 259200000).toISOString() },
      { id: uuidv4(), type: 'comment', amount: 2, description: 'Comment engagement', timestamp: new Date(Date.now() - 345600000).toISOString() },
    ];
    
    res.json({ rewards });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Claim rewards
router.post('/claim', (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Mock claim transaction
    const txHash = '0x' + uuidv4().replace(/-/g, '');
    
    res.json({
      success: true,
      txHash,
      amount,
      token: 'NEXA',
      message: 'Rewards claimed successfully'
    });
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: 'Claim failed' });
  }
});

// Get staking info
router.get('/staking', (req, res) => {
  res.json({
    staking: {
      apy: 12.5,
      totalStaked: '50000000',
      minStake: 100,
      lockPeriod: '30 days'
    },
    userStake: {
      staked: 5000,
      earned: 62.5,
      unlockDate: new Date(Date.now() + 2592000000).toISOString()
    }
  });
});

// Stake tokens
router.post('/staking/stake', (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Minimum stake is 100 NEXA' });
    }
    
    const txHash = '0x' + uuidv4().replace(/-/g, '');
    
    res.json({
      success: true,
      txHash,
      amount,
      unlockDate: new Date(Date.now() + 2592000000).toISOString()
    });
  } catch (error) {
    console.error('Stake error:', error);
    res.status(500).json({ error: 'Stake failed' });
  }
});

export default router;
