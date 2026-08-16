const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const router = express.Router();

// Track video view (YouTube/TikTok style)
router.post('/view', (req, res) => {
  try {
    const { video_id, watch_duration, completion_rate, device_type, referrer } = req.body;
    
    if (!video_id) return res.status(400).json({ error: 'video_id required' });
    
    const viewId = uuidv4();
    const now = new Date().toISOString();
    
    // Record view
    db.prepare(`
      INSERT INTO video_views (id, video_id, watch_duration, completion_rate, device_type, referrer, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(viewId, video_id, watch_duration || 0, completion_rate || 0, device_type, referrer, now);
    
    // Update video stats
    db.prepare(`
      UPDATE videos 
      SET views = views + 1,
          avg_watch_time = (
            SELECT COALESCE(AVG(watch_duration), 0) 
            FROM video_views 
            WHERE video_id = ?
          )
      WHERE id = ?
    `).run(video_id, video_id);
    
    res.json({ success: true, view_id: viewId });
  } catch (error) {
    console.error('View tracking error:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// Track engagement (likes, comments, shares, saves)
router.post('/engage', (req, res) => {
  try {
    const { video_id, type, user_id } = req.body;
    
    if (!video_id || !type) return res.status(400).json({ error: 'video_id and type required' });
    
    const validTypes = ['like', 'unlike', 'share', 'save', 'unsave', 'comment'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid engagement type' });
    }
    
    // Record engagement
    db.prepare(`
      INSERT INTO video_engagements (id, video_id, user_id, type, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), video_id, user_id, type);
    
    // Update video counts
    if (type === 'like') {
      db.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').run(video_id);
    } else if (type === 'unlike') {
      db.prepare('UPDATE videos SET likes = MAX(0, likes - 1) WHERE id = ?').run(video_id);
    } else if (type === 'share') {
      db.prepare('UPDATE videos SET shares = shares + 1 WHERE id = ?').run(video_id);
    } else if (type === 'save') {
      db.prepare('UPDATE videos SET saves = saves + 1 WHERE id = ?').run(video_id);
    } else if (type === 'unsave') {
      db.prepare('UPDATE videos SET saves = MAX(0, saves - 1) WHERE id = ?').run(video_id);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Engagement tracking error:', error);
    res.status(500).json({ error: 'Failed to track engagement' });
  }
});

// Get video analytics (for creators)
router.get('/video/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, require('./config').JWT_SECRET);
    
    // Verify ownership
    const video = db.prepare(`
      SELECT v.*, c.user_id 
      FROM videos v 
      JOIN channels c ON v.channel_id = c.id 
      WHERE v.id = ?
    `).get(videoId);
    
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.user_id !== decoded.userId) return res.status(403).json({ error: 'Forbidden' });
    
    // Get view stats
    const viewStats = db.prepare(`
      SELECT 
        COUNT(*) as total_views,
        AVG(watch_duration) as avg_watch_time,
        AVG(completion_rate) as avg_completion_rate,
        COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_views,
        COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_views
      FROM video_views WHERE video_id = ?
    `).get(videoId);
    
    // Get engagement stats
    const engagementStats = db.prepare(`
      SELECT 
        type,
        COUNT(*) as count
      FROM video_engagements 
      WHERE video_id = ?
      GROUP BY type
    `).all(videoId);
    
    // Get views over time (last 7 days)
    const viewsOverTime = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as views
      FROM video_views 
      WHERE video_id = ? 
        AND created_at > datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(videoId);
    
    res.json({
      video_id: videoId,
      views: viewStats,
      engagement: engagementStats,
      views_over_time: viewsOverTime
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Update user interest profile (for personalization)
router.post('/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, require('./config').JWT_SECRET);
    
    const { watched_categories, watched_creators, engagement_patterns } = req.body;
    
    // Upsert user profile
    db.prepare(`
      INSERT INTO user_interest_profiles (user_id, favorite_categories, favorite_creators, engagement_patterns, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        favorite_categories = COALESCE(excluded.favorite_categories, favorite_categories),
        favorite_creators = COALESCE(excluded.favorite_creators, favorite_creators),
        engagement_patterns = COALESCE(excluded.engagement_patterns, engagement_patterns),
        updated_at = datetime('now')
    `).run(
      decoded.userId,
      JSON.stringify(watched_categories || []),
      JSON.stringify(watched_creators || []),
      JSON.stringify(engagement_patterns || {})
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get creator relationship stats
router.get('/creator/:channelId', (req, res) => {
  try {
    const { channelId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, require('./config').JWT_SECRET);
    
    const stats = db.prepare(`
      SELECT * FROM creator_relationships 
      WHERE user_id = ? AND channel_id = ?
    `).get(decoded.userId, channelId);
    
    res.json({ 
      relationship: stats || { interaction_count: 0 },
      is_subscribed: stats?.is_subscribed || false
    });
  } catch (error) {
    console.error('Creator stats error:', error);
    res.status(500).json({ error: 'Failed to get creator stats' });
  }
});

module.exports = router;
