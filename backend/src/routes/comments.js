const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const router = express.Router();

router.get('/video/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const comments = db.prepare(`SELECT c.*, u.username, u.display_name, u.avatar_url FROM comments c JOIN users u ON c.user_id = u.id WHERE c.video_id = ? AND c.parent_id IS NULL ORDER BY c.created_at DESC`).all(videoId);
    res.json({ comments });
  } catch (error) { res.status(500).json({ error: 'Failed to get comments' }); }
});

router.post('/video/:videoId', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, require('./config').JWT_SECRET);
    const { content, parent_id } = req.body;
    const id = uuidv4();
    db.prepare(`INSERT INTO comments (id, video_id, user_id, content, parent_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`).run(id, req.params.videoId, decoded.userId, content, parent_id || null);
    db.prepare('UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?').run(req.params.videoId);
    res.status(201).json({ comment: { id, content } });
  } catch (error) { res.status(500).json({ error: 'Failed to create comment' }); }
});

module.exports = router;
