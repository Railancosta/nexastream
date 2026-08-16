const express = require('express');
const db = require('../config/database');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { q, type = 'videos', page = 1, limit = 20 } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });
    const offset = (page - 1) * limit;
    const searchTerm = `%${q}%`;
    if (type === 'videos' || type === 'all') {
      const videos = db.prepare(`SELECT v.*, c.name as channel_name, c.handle as channel_handle FROM videos v JOIN channels c ON v.channel_id = c.id WHERE (v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?) AND v.status = 'published' ORDER BY v.views DESC LIMIT ? OFFSET ?`).all(searchTerm, searchTerm, searchTerm, parseInt(limit), offset);
      return res.json({ videos, type: 'videos', empty: videos.length === 0 });
    }
    if (type === 'channels') {
      const channels = db.prepare(`SELECT c.*, u.display_name FROM channels c JOIN users u ON c.user_id = u.id WHERE c.name LIKE ? OR c.handle LIKE ? ORDER BY c.subscriber_count DESC LIMIT ? OFFSET ?`).all(searchTerm, searchTerm, parseInt(limit), offset);
      return res.json({ channels, type: 'channels', empty: channels.length === 0 });
    }
    res.json({ results: [], empty: true });
  } catch (error) { res.status(500).json({ error: 'Search failed' }); }
});

module.exports = router;
