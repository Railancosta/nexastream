const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Video, Channel, User, Comment, WatchHistory, Subscription } = require('../../models');
const { auth, optionalAuth } = require('../../middleware');
const config = require('../../config');

// GET ALL VIDEOS
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, sort = 'recent', page = 1, limit = 20, search, channelId, duration, isLive } = req.query;
    
    const where = { status: 'published' };
    if (category) where.category = category;
    if (channelId) where.channelId = channelId;
    if (isLive === 'true') where.isLive = true;
    if (search) where.title = { [Op.iLike]: `%${search}%` };
    
    const order = sort === 'views' ? [['views', 'DESC']] : sort === 'likes' ? [['likes', 'DESC']] : [['createdAt', 'DESC']];
    
    const { rows: videos, count } = await Video.findAndCountAll({
      where, order,
      include: [{ model: Channel, as: 'channel', attributes: ['id', 'username', 'displayName', 'avatar', 'isVerified', 'subscribers'] }],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({ videos, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// GET TRENDING VIDEOS
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const videos = await Video.findAll({
      where: { status: 'published', isLive: false },
      order: [['views', 'DESC'], ['likes', 'DESC']],
      limit: 20,
      include: [{ model: Channel, as: 'channel', attributes: ['id', 'username', 'displayName', 'avatar'] }]
    });
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET LIVE VIDEOS
router.get('/live', optionalAuth, async (req, res) => {
  try {
    const videos = await Video.findAll({
      where: { isLive: true, status: 'published' },
      include: [{ model: Channel, as: 'channel' }]
    });
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET SHORT VIDEOS
router.get('/shorts', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const videos = await Video.findAll({
      where: { isShort: true, status: 'published' },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      include: [{ model: Channel, as: 'channel' }]
    });
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET SINGLE VIDEO
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id, {
      include: [
        { model: Channel, as: 'channel', attributes: ['id', 'username', 'displayName', 'avatar', 'subscribers', 'isVerified'] },
        { model: User, as: 'user', attributes: ['id', 'username'] }
      ]
    });
    
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    // Increment view
    await video.increment('views');
    
    // Record watch history if authenticated
    if (req.user) {
      await WatchHistory.create({
        userId: req.user.userId, videoId: video.id, channelId: video.channelId
      });
    }
    
    res.json({ video });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// CREATE VIDEO
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, tags, visibility, thumbnail, videoUrl, duration } = req.body;
    
    const channel = await Channel.findOne({ where: { userId: req.user.userId } });
    if (!channel) return res.status(400).json({ error: 'Create a channel first' });
    
    const video = await Video.create({
      channelId: channel.id, title, description, category, tags,
      visibility: visibility || 'public', thumbnail, videoUrl, duration,
      status: videoUrl ? 'processing' : 'uploading'
    });
    
    await channel.increment('totalVideos');
    
    res.status(201).json({ success: true, video });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// UPDATE VIDEO
router.put('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id, { include: [{ model: Channel }] });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.channel.userId !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });
    
    const { title, description, category, tags, visibility, thumbnail } = req.body;
    await video.update({ title, description, category, tags, visibility, thumbnail });
    
    res.json({ success: true, video });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// DELETE VIDEO
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id, { include: [{ model: Channel }] });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.channel.userId !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });
    
    await video.update({ status: 'deleted' });
    await video.channel.decrement('totalVideos');
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// LIKE VIDEO
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    await video.increment('likes');
    res.json({ success: true, likes: video.likes + 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like' });
  }
});

// GET COMMENTS
router.get('/:id/comments', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { rows: comments, count } = await Comment.findAndCountAll({
      where: { videoId: req.params.id, parentId: null, status: 'active' },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }]
    });
    res.json({ comments, total: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// ADD COMMENT
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    const video = await Video.findByPk(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    const comment = await Comment.create({
      videoId: req.params.id, userId: req.user.userId, channelId: video.channelId,
      content, parentId
    });
    
    await video.increment('comments');
    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET CATEGORIES
router.get('/meta/categories', async (req, res) => {
  const categories = [
    { id: 'crypto', name: 'Cryptocurrency', icon: '₿' },
    { id: 'defi', name: 'DeFi', icon: '💰' },
    { id: 'nft', name: 'NFT', icon: '🎨' },
    { id: 'tutorial', name: 'Tutorials', icon: '📚' },
    { id: 'gaming', name: 'Gaming', icon: '🎮' },
    { id: 'music', name: 'Music', icon: '🎵' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
    { id: 'news', name: 'News', icon: '📰' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'tech', name: 'Technology', icon: '💻' }
  ];
  res.json({ categories });
});

// GET RECOMMENDATIONS
router.get('/:id/recommendations', optionalAuth, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    const videos = await Video.findAll({
      where: {
        id: { [Op.ne]: req.params.id },
        category: video.category,
        status: 'published'
      },
      limit: 10,
      include: [{ model: Channel, as: 'channel' }]
    });
    
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
