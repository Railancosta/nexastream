const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Channel, Video, User, Subscription } = require('../../models');
const { auth, optionalAuth } = require('../../middleware');

// GET ALL CHANNELS
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, sort = 'subscribers', page = 1, limit = 20, search } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { displayName: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const order = sort === 'videos' ? [['totalVideos', 'DESC']] : sort === 'views' ? [['totalViews', 'DESC']] : [[sort === 'earnings' ? 'totalEarnings' : 'subscribers', 'DESC']];
    
    const { rows: channels, count } = await Channel.findAndCountAll({
      where, order,
      attributes: { exclude: ['walletAddress'] },
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({ channels, total: count, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// GET TRENDING CHANNELS
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const channels = await Channel.findAll({
      order: [['subscribers', 'DESC']],
      limit: 20,
      attributes: { exclude: ['walletAddress'] }
    });
    res.json({ channels });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET CHANNEL BY USERNAME
router.get('/@:username', optionalAuth, async (req, res) => {
  try {
    const channel = await Channel.findOne({
      where: { username: req.params.username },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'displayName', 'bio'] }
      ]
    });
    
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    const videos = await Video.findAll({
      where: { channelId: channel.id, status: 'published' },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    const isSubscribed = req.user ? await Subscription.findOne({ where: { userId: req.user.userId, channelId: channel.id } }) : null;
    
    res.json({ channel, videos, isSubscribed: !!isSubscribed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// GET CHANNEL VIDEOS
router.get('/:id/videos', optionalAuth, async (req, res) => {
  try {
    const { sort = 'recent', page = 1, limit = 20 } = req.query;
    const order = sort === 'views' ? [['views', 'DESC']] : sort === 'likes' ? [['likes', 'DESC']] : [['createdAt', 'DESC']];
    
    const { rows: videos, count } = await Video.findAndCountAll({
      where: { channelId: req.params.id, status: 'published' },
      order, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({ videos, total: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// CREATE/UPDATE CHANNEL
router.post('/', auth, async (req, res) => {
  try {
    const { username, displayName, description, category, avatar, banner, tags, socialLinks } = req.body;
    
    const existing = await Channel.findOne({ where: { userId: req.user.userId } });
    if (existing) {
      await existing.update({ displayName, description, category, avatar, banner, tags, socialLinks });
      return res.json({ success: true, channel: existing });
    }
    
    const channel = await Channel.create({
      userId: req.user.userId, username: username || req.user.username,
      displayName: displayName || req.user.displayName || req.user.username,
      description, category, avatar, banner, tags, socialLinks
    });
    
    res.status(201).json({ success: true, channel });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// UPDATE CHANNEL
router.put('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.userId !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });
    
    const { displayName, description, category, avatar, banner, tags, socialLinks, patreonTier, watermarkEnabled, monetizationEnabled } = req.body;
    await channel.update({ displayName, description, category, avatar, banner, tags, socialLinks, patreonTier, watermarkEnabled, monetizationEnabled });
    
    res.json({ success: true, channel });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// SUBSCRIBE TO CHANNEL
router.post('/:id/subscribe', auth, async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.userId === req.user.userId) return res.status(400).json({ error: 'Cannot subscribe to own channel' });
    
    const existing = await Subscription.findOne({ where: { userId: req.user.userId, channelId: channel.id } });
    
    if (existing) {
      await existing.destroy();
      await channel.decrement('subscribers');
      return res.json({ success: true, subscribed: false, subscribers: channel.subscribers - 1 });
    }
    
    await Subscription.create({ userId: req.user.userId, channelId: channel.id, status: 'active' });
    await channel.increment('subscribers');
    
    res.json({ success: true, subscribed: true, subscribers: channel.subscribers + 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// GET CHANNEL STATS
router.get('/:id/stats', optionalAuth, async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    const subscriberCount = await Subscription.count({ where: { channelId: channel.id, status: 'active' } });
    const videoCount = await Video.count({ where: { channelId: channel.id, status: 'published' } });
    
    res.json({
      subscribers: subscriberCount,
      totalVideos: videoCount,
      totalViews: channel.totalViews,
      totalEarnings: channel.totalEarnings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET CHANNEL COMMUNITY
router.get('/:id/community', optionalAuth, async (req, res) => {
  try {
    const { type = 'posts', page = 1, limit = 20 } = req.query;
    // Community posts, polls, etc.
    res.json({ posts: [], total: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
