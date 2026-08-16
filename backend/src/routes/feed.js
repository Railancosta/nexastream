const express = require('express');
const db = require('../config/database');
const router = express.Router();

router.get('/home', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const videos = db.prepare(`SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar FROM videos v JOIN channels c ON v.channel_id = c.id WHERE v.status = 'published' ORDER BY v.created_at DESC LIMIT ? OFFSET ?`).all(parseInt(limit), offset);
    res.json({ videos, empty: videos.length === 0 });
  } catch (error) { res.status(500).json({ error: 'Failed to get feed' }); }
});

router.get('/trending', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const videos = db.prepare(`SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar, (v.views + v.likes * 3 + v.comments_count * 5) as trending_score FROM videos v JOIN channels c ON v.channel_id = c.id WHERE v.status = 'published' ORDER BY trending_score DESC LIMIT ?`).all(parseInt(limit));
    res.json({ videos, empty: videos.length === 0 });
  } catch (error) { res.status(500).json({ error: 'Failed to get trending' }); }
});

router.get('/subscriptions', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, require('./config').JWT_SECRET);
    const videos = db.prepare(`SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar FROM videos v JOIN channels c ON v.channel_id = c.id JOIN subscriptions s ON s.channel_id = c.id WHERE s.user_id = ? AND v.status = 'published' ORDER BY v.created_at DESC LIMIT 50`).all(decoded.userId);
    res.json({ videos, empty: videos.length === 0 });
  } catch (error) { res.status(500).json({ error: 'Failed to get subscriptions feed' }); }
});

module.exports = router;
