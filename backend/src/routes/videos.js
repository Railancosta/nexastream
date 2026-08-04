/**
 * Video Routes
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../config/database');

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/videos'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.mov', '.avi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get trending videos
router.get('/trending', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const videos = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar,
             (v.views + v.likes * 2 + v.comments_count * 3) as trending_score
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published'
      ORDER BY trending_score DESC, v.views DESC
      LIMIT ?
    `).all(parseInt(limit));
    
    res.json({ videos });
  } catch (error) {
    console.error('Get trending error:', error);
    res.status(500).json({ error: 'Failed to get trending videos' });
  }
});

// Get recent videos
router.get('/recent', (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    const videos = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published'
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), offset);
    
    res.json({ videos });
  } catch (error) {
    console.error('Get recent error:', error);
    res.status(500).json({ error: 'Failed to get recent videos' });
  }
});

// Get video by ID
router.get('/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar,
             c.subscriber_count as channel_subscribers, c.user_id as channel_owner
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.id = ?
    `).get(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Increment view count
    db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(videoId);
    
    res.json({ video });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Failed to get video' });
  }
});

// Upload video (requires auth)
router.post('/upload', upload.single('video'), (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
    
    const channel = db.prepare('SELECT * FROM channels WHERE user_id = ?').get(decoded.userId);
    if (!channel) return res.status(400).json({ error: 'No channel found' });
    
    const { title, description, category, tags } = req.body;
    const videoId = uuidv4();
    
    db.prepare(`
      INSERT INTO videos (id, channel_id, title, description, video_url, category, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      videoId,
      channel.id,
      title || 'Untitled',
      description || '',
      `/uploads/videos/${req.file.filename}`,
      category || 'general',
      tags || ''
    );
    
    // Update channel video count
    db.prepare('UPDATE channels SET total_videos = total_videos + 1 WHERE id = ?').run(channel.id);
    
    res.status(201).json({ 
      message: 'Video uploaded successfully',
      video: { id: videoId, title, video_url: `/uploads/videos/${req.file.filename}` }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Record view
router.post('/:videoId/view', (req, res) => {
  try {
    const { videoId } = req.params;
    const { duration = 0 } = req.body;
    
    db.prepare(`
      INSERT INTO video_views (id, video_id, watch_duration, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(uuidv4(), videoId, duration);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Record view error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

module.exports = router;
