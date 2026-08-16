const express = require('express');
const router = express.Router();
const { Transaction, User, Channel } = require('../../models');
const { auth } = require('../../middleware');
const config = require('../../config');

// GET WALLET BALANCE
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    res.json({
      address: user.walletAddress,
      balance: user.balance || 0,
      pendingRewards: user.pendingRewards || 0,
      totalEarnings: user.totalEarnings || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// GET TRANSACTIONS
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const where = { userId: req.user.userId };
    if (type) where.type = type;
    
    const { rows: transactions, count } = await Transaction.findAndCountAll({
      where, order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({ transactions, total: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// DEPOSIT
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, txHash, fromAddress } = req.body;
    
    const tx = await Transaction.create({
      userId: req.user.userId, type: 'deposit', amount, currency: 'NEXA',
      status: 'completed', txHash, fromAddress
    });
    
    await req.user.update({ balance: (req.user.balance || 0) + parseFloat(amount) });
    
    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ error: 'Deposit failed' });
  }
});

// WITHDRAW
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { toAddress, amount } = req.body;
    
    if ((req.user.balance || 0) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create blockchain transaction
    const tx = await Transaction.create({
      userId: req.user.userId, type: 'withdrawal', amount, currency: 'NEXA',
      status: 'pending', toAddress, fromAddress: req.user.walletAddress
    });
    
    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

// TIP CREATOR
router.post('/tip', auth, async (req, res) => {
  try {
    const { channelId, amount, videoId } = req.body;
    
    if ((req.user.balance || 0) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    const channel = await Channel.findByPk(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    // Create tip transaction
    const tipTx = await Transaction.create({
      userId: req.user.userId, type: 'tip', amount, currency: 'NEXA',
      status: 'completed', metadata: { channelId, videoId }
    });
    
    // Deduct from sender, add to receiver
    await req.user.update({ balance: (req.user.balance || 0) - parseFloat(amount) });
    await channel.update({ totalEarnings: parseFloat(channel.totalEarnings) + parseFloat(amount) });
    
    res.json({ success: true, transaction: tipTx });
  } catch (error) {
    res.status(500).json({ error: 'Tip failed' });
  }
});

// SUBSCRIPTION PAYMENT
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { channelId, tier, billingCycle } = req.body;
    const channel = await Channel.findByPk(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    const prices = { 1: 4.99, 2: 9.99, 3: 24.99 };
    const price = prices[tier] || 4.99;
    
    // Check balance
    if ((req.user.balance || 0) < price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    const tx = await Transaction.create({
      userId: req.user.userId, type: 'subscription', amount: price, currency: 'USD',
      status: 'completed', metadata: { channelId, tier, billingCycle }
    });
    
    await req.user.update({ balance: (req.user.balance || 0) - price });
    await channel.update({ totalEarnings: parseFloat(channel.totalEarnings) + (price * 0.7) });
    
    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// PURCHASE NFT
router.post('/nft/purchase', auth, async (req, res) => {
  try {
    const { nftId, price } = req.body;
    
    if ((req.user.balance || 0) < parseFloat(price)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    const tx = await Transaction.create({
      userId: req.user.userId, type: 'purchase', amount: price, currency: 'NEXA',
      status: 'completed', metadata: { nftId }
    });
    
    await req.user.update({ balance: (req.user.balance || 0) - parseFloat(price) });
    
    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// REWARD STATS
router.get('/rewards/stats', async (req, res) => {
  try {
    const totalRewards = await Transaction.sum('amount', { where: { type: 'reward' } }) || 0;
    const totalTipped = await Transaction.sum('amount', { where: { type: 'tip' } }) || 0;
    
    res.json({
      totalRewardsDistributed: totalRewards,
      totalTipsSent: totalTipped,
      rewardPerView: config.REWARD_PER_VIEW,
      creatorShare: config.CREATOR_SHARE,
      platformShare: config.PLATFORM_SHARE
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// REWARD LEADERBOARD
router.get('/rewards/leaderboard', async (req, res) => {
  try {
    const channels = await Channel.findAll({
      order: [['totalEarnings', 'DESC']],
      limit: 20
    });
    
    const leaderboard = channels.map((c, i) => ({
      rank: i + 1, channelId: c.id, name: c.displayName,
      earnings: c.totalEarnings, subscribers: c.subscribers
    }));
    
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
