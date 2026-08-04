const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Livestream, Channel, Video, ChatMessage, User } = require('../../models');
const { auth, optionalAuth } = require('../../middleware');

// CREATE LIVESTREAM
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, category, scheduledAt, monetizationEnabled } = req.body;
    
    const channel = await Channel.findOne({ where: { userId: req.user.userId } });
    if (!channel) return res.status(400).json({ error: 'Create a channel first' });
    
    const streamKey = uuidv4();
    
    const stream = await Livestream.create({
      channelId: channel.id, title, description, category,
      streamKey, status: scheduledAt ? 'scheduled' : 'live',
      scheduledAt, monetizationEnabled, startedAt: scheduledAt ? null : new Date()
    });
    
    // Create video record
    const video = await Video.create({
      channelId: channel.id, title, isLive: true,
      videoUrl: `/live/${stream.id}`, status: 'published'
    });
    
    await stream.update({ videoId: video.id });
    
    res.status(201).json({
      success: true, stream,
      streamKey,
      streamUrl: `rtmp://stream.nexastream.org/live`,
      ingestServer: `rtmp://stream.nexastream.org/app`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// GET LIVESTREAM BY ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const stream = await Livestream.findByPk(req.params.id, {
      include: [{ model: Channel, as: 'channel' }]
    });
    
    if (!stream) return res.status(404).json({ error: 'Stream not found' });
    
    res.json({ stream });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// END LIVESTREAM
router.post('/:id/end', auth, async (req, res) => {
  try {
    const stream = await Livestream.findByPk(req.params.id, {
      include: [{ model: Channel }]
    });
    
    if (!stream) return res.status(404).json({ error: 'Stream not found' });
    if (stream.channel.userId !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });
    
    await stream.update({ status: 'ended', endedAt: new Date() });
    await Video.destroy({ where: { id: stream.videoId } });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// UPDATE STREAM STATS
router.post('/:id/stats', auth, async (req, res) => {
  try {
    const { viewers, likes } = req.body;
    const stream = await Livestream.findByPk(req.params.id);
    
    if (!stream) return res.status(404).json({ error: 'Stream not found' });
    
    await stream.update({
      viewers,
      peakViewers: Math.max(stream.peakViewers || 0, viewers || 0)
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET LIVE STREAMS
router.get('/', optionalAuth, async (req, res) => {
  try {
    const streams = await Livestream.findAll({
      where: { status: 'live' },
      include: [{ model: Channel, as: 'channel' }],
      order: [['viewers', 'DESC']]
    });
    
    res.json({ streams });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// SEND CHAT MESSAGE
router.post('/:id/chat', auth, async (req, res) => {
  try {
    const { content, type = 'message' } = req.body;
    const stream = await Livestream.findByPk(req.params.id);
    
    if (!stream) return res.status(404).json({ error: 'Stream not found' });
    
    const message = await ChatMessage.create({
      streamId: stream.id, userId: req.user.userId, content, type
    });
    
    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET CHAT MESSAGES
router.get('/:id/chat', async (req, res) => {
  try {
    const { since } = req.query;
    const where = { streamId: req.params.id, isDeleted: false };
    if (since) where.createdAt = { [Op.gt]: new Date(since) };
    
    const messages = await ChatMessage.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }],
      order: [['createdAt', 'ASC']],
      limit: 100
    });
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// MODERATE CHAT
router.post('/:id/chat/:messageId/moderate', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'delete', 'ban', 'timeout'
    const message = await ChatMessage.findByPk(req.params.messageId);
    
    if (!message) return res.status(404).json({ error: 'Message not found' });
    
    if (action === 'delete') {
      await message.update({ isDeleted: true });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// SCHEDULE STREAM
router.post('/schedule', auth, async (req, res) => {
  try {
    const { title, description, category, scheduledAt } = req.body;
    
    const channel = await Channel.findOne({ where: { userId: req.user.userId } });
    const stream = await Livestream.create({
      channelId: channel.id, title, description, category,
      scheduledAt, status: 'scheduled', streamKey: uuidv4()
    });
    
    res.status(201).json({ success: true, stream });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
