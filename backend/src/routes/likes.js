const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const router = express.Router();

router.post('/:videoId', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
    const { type } = req.body;
    const existing = db.prepare('SELECT * FROM likes WHERE user_id = ? AND video_id = ?').get(decoded.userId, req.params.videoId);
    if (existing) {
      if (existing.type === type) {
        db.prepare('DELETE FROM likes WHERE user_id = ? AND video_id = ?').run(decoded.userId, req.params.videoId);
        if (type === 'like') db.prepare('UPDATE videos SET likes = likes - 1 WHERE id = ?').run(req.params.videoId);
        return res.json({ liked: false, type: null });
      }
      if (type === 'like') db.prepare('UPDATE videos SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = ?').run(req.params.videoId);
      else db.prepare('UPDATE videos SET likes = likes - 1, dislikes = dislikes + 1 WHERE id = ?').run(req.params.videoId);
      db.prepare('UPDATE likes SET type = ? WHERE user_id = ? AND video_id = ?').run(type, decoded.userId, req.params.videoId);
    } else {
      const id = uuidv4();
      db.prepare('INSERT INTO likes (id, user_id, video_id, type) VALUES (?, ?, ?, ?)').run(id, decoded.userId, req.params.videoId, type);
      if (type === 'like') db.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').run(req.params.videoId);
      else db.prepare('UPDATE videos SET dislikes = dislikes + 1 WHERE id = ?').run(req.params.videoId);
    }
    res.json({ liked: true, type });
  } catch (error) { res.status(500).json({ error: 'Failed to like' }); }
});

module.exports = router;
