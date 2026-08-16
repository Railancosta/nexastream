const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Video, Channel, User, Transaction, NFT, Subscription } = require('../../models');
const { auth } = require('../../middleware');

// PLATFORM STATS
router.get('/platform', async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalVideos = await Video.count({ where: { status: 'published' } });
    const totalChannels = await Channel.count();
    const totalViews = await Video.sum('views') || 0;
    const totalEarnings = await Transaction.sum('amount', { where: { type: { [Op.in]: ['reward', 'tip'] } } }) || 0;
    const liveStreams = await Video.count({ where: { isLive: true } });
    
    res.json({
      totalUsers, totalVideos, totalChannels,
      totalViews: parseInt(totalViews),
      totalEarnings: parseFloat(totalEarnings),
      liveStreams,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// CHANNEL ANALYTICS
router.get('/channel/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id);
    if (!channel || channel.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const videos = await Video.findAll({
      where: { channelId: channel.id, status: 'published' },
      attributes: ['id', 'title', 'views', 'likes', 'comments', 'createdAt', 'duration', 'engagement', 'avgWatchTime']
    });
    
    const totalWatchTime = videos.reduce((sum, v) => sum + (v.avgWatchTime || 0) * v.views, 0);
    const avgEngagement = videos.length > 0 ? videos.reduce((sum, v) => sum + v.engagement, 0) / videos.length : 0;
    
    const viewsData = await Video.findAll({
      where: { channelId: channel.id },
      attributes: ['views', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 30
    });
    
    const subscriberHistory = await Subscription.findAll({
      where: { channelId: channel.id },
      attributes: ['createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 30
    });
    
    res.json({
      channel,
      videos,
      summary: {
        totalVideos: videos.length,
        totalViews: channel.totalViews,
        totalSubscribers: channel.subscribers,
        avgEngagement,
        totalWatchTime
      },
      viewsHistory: viewsData,
      subscriberHistory
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// VIDEO ANALYTICS
router.get('/video/:id', auth, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id, {
      include: [{ model: Channel }]
    });
    
    if (!video || video.channel.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get views by day
    const viewsHistory = await Video.findByPk(req.params.id, {
      attributes: ['views', 'uniqueViews', 'createdAt']
    });
    
    // Traffic sources (mock)
    const trafficSources = [
      { source: 'YouTube Search', views: Math.floor(video.views * 0.35) },
      { source: 'External', views: Math.floor(video.views * 0.25) },
      { source: 'Browse Features', views: Math.floor(video.views * 0.20) },
      { source: 'Direct', views: Math.floor(video.views * 0.15) },
      { source: 'Other', views: Math.floor(video.views * 0.05) }
    ];
    
    // Demographics (mock)
    const demographics = {
      countries: [
        { country: 'United States', views: Math.floor(video.views * 0.40) },
        { country: 'Brazil', views: Math.floor(video.views * 0.15) },
        { country: 'India', views: Math.floor(video.views * 0.12) },
        { country: 'United Kingdom', views: Math.floor(video.views * 0.08) },
        { country: 'Other', views: Math.floor(video.views * 0.25) }
      ],
      ageGroups: [
        { age: '18-24', percentage: 35 },
        { age: '25-34', percentage: 40 },
        { age: '35-44', percentage: 15 },
        { age: '45+', percentage: 10 }
      ]
    };
    
    res.json({
      video,
      summary: {
        views: video.views,
        uniqueViews: video.uniqueViews,
        likes: video.likes,
        comments: video.comments,
        shares: video.shares,
        avgWatchTime: video.avgWatchTime,
        retentionRate: video.retentionRate,
        cpm: video.cpm,
        estimatedEarnings: video.rewardEarned
      },
      trafficSources,
      demographics
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// REALTIME STATS
router.get('/realtime', async (req, res) => {
  try {
    const activeUsers = Math.floor(Math.random() * 5000) + 1000;
    const liveViewers = await Video.sum('views', { where: { isLive: true } }) || 0;
    const activeStreams = await Video.count({ where: { isLive: true } });
    
    res.json({
      activeUsers,
      liveViewers,
      activeStreams,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// EARNINGS REPORT
router.get('/earnings', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let startDate = new Date();
    
    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    else startDate = new Date(0);
    
    const transactions = await Transaction.findAll({
      where: {
        userId: req.user.userId,
        createdAt: { [Op.gte]: startDate }
      },
      order: [['createdAt', 'DESC']]
    });
    
    const byType = {};
    transactions.forEach(tx => {
      if (!byType[tx.type]) byType[tx.type] = 0;
      byType[tx.type] += parseFloat(tx.amount);
    });
    
    const total = Object.values(byType).reduce((sum, val) => sum + val, 0);
    
    res.json({
      transactions,
      summary: byType,
      total: parseFloat(total.toFixed(8)),
      period,
      startDate,
      endDate: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// TRENDING
router.get('/trending', async (req, res) => {
  try {
    const { category, period = '24h' } = req.query;
    
    const where = { status: 'published' };
    if (category) where.category = category;
    
    const trending = await Video.findAll({
      where,
      order: [['views', 'DESC']],
      limit: 20,
      include: [{ model: Channel, as: 'channel' }]
    });
    
    res.json({ trending });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
