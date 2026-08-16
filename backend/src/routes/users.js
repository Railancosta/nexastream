/**
 * User Routes
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

// Get user profile
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = db.prepare(`
      SELECT id, username, display_name, bio, avatar_url, is_verified, 
             subscriber_count, total_views, created_at
      FROM users WHERE id = ?
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const channel = db.prepare('SELECT * FROM channels WHERE user_id = ?').get(userId);
    
    res.json({ user: { ...user, channel } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/me', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, require('./config').JWT_SECRET);
    const { display_name, bio, avatar_url } = req.body;
    
    db.prepare(`
      UPDATE users SET display_name = COALESCE(?, display_name),
                      bio = COALESCE(?, bio),
                      avatar_url = COALESCE(?, avatar_url),
                      updated_at = datetime('now')
      WHERE id = ?
    `).run(display_name, bio, avatar_url, decoded.userId);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user videos
router.get('/:userId/videos', (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const videos = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE c.user_id = ? AND v.status = 'published'
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, parseInt(limit), offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE c.user_id = ? AND v.status = 'published'
    `).get(userId);
    
    res.json({ videos, total: total.count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get user videos error:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
});

module.exports = router;
