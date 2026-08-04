const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const router = express.Router();

router.post('/:channelId', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
    const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ? AND channel_id = ?').get(decoded.userId, req.params.channelId);
    if (existing) {
      db.prepare('DELETE FROM subscriptions WHERE user_id = ? AND channel_id = ?').run(decoded.userId, req.params.channelId);
      db.prepare('UPDATE channels SET subscriber_count = subscriber_count - 1 WHERE id = ?').run(req.params.channelId);
      return res.json({ subscribed: false });
    }
    const id = uuidv4();
    db.prepare('INSERT INTO subscriptions (id, user_id, channel_id) VALUES (?, ?, ?)').run(id, decoded.userId, req.params.channelId);
    db.prepare('UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?').run(req.params.channelId);
    res.json({ subscribed: true });
  } catch (error) { res.status(500).json({ error: 'Failed to subscribe' }); }
});

router.get('/check/:channelId', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.json({ subscribed: false });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
    const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ? AND channel_id = ?').get(decoded.userId, req.params.channelId);
    res.json({ subscribed: !!existing });
  } catch (error) { res.json({ subscribed: false }); }
});

module.exports = router;
