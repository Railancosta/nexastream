const express = require('express');
const db = require('../config/database');
const router = express.Router();

router.get('/for-you', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const videos = db.prepare(`SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar, ((v.views * 1.0) + (v.likes * 5.0) + (v.comments_count * 10.0) + (CASE WHEN v.created_at > datetime('now', '-7 days') THEN 100 ELSE 0 END)) as recommendation_score FROM videos v JOIN channels c ON v.channel_id = c.id WHERE v.status = 'published' ORDER BY recommendation_score DESC LIMIT ?`).all(parseInt(limit));
    res.json({ videos, empty: videos.length === 0 });
  } catch (error) { res.status(500).json({ error: 'Failed to get recommendations' }); }
});

router.get('/trending', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const videos = db.prepare(`SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar, (v.views + v.likes * 2 + v.comments_count * 5) as trending_score FROM videos v JOIN channels c ON v.channel_id = c.id WHERE v.status = 'published' ORDER BY trending_score DESC LIMIT ?`).all(parseInt(limit));
    res.json({ videos, empty: videos.length === 0 });
  } catch (error) { res.status(500).json({ error: 'Failed to get trending' }); }
});

module.exports = router;
