/**
 * Channel Routes
 */

const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get channel by handle
router.get('/@:handle', (req, res) => {
  try {
    const { handle } = req.params;
    
    const channel = db.prepare(`
      SELECT c.*, u.display_name, u.avatar_url as user_avatar, u.is_verified
      FROM channels c
      JOIN users u ON c.user_id = u.id
      WHERE c.handle = ?
    `).get(handle.toLowerCase());
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    res.json({ channel });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
});

// Get channel videos
router.get('/@:handle/videos', (req, res) => {
  try {
    const { handle } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const channel = db.prepare('SELECT id FROM channels WHERE handle = ?').get(handle.toLowerCase());
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    const videos = db.prepare(`
      SELECT * FROM videos
      WHERE channel_id = ? AND status = 'published'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(channel.id, parseInt(limit), offset);
    
    res.json({ videos });
  } catch (error) {
    console.error('Get channel videos error:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
});

module.exports = router;
