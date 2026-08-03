import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/database.js';

const router = Router();

// Get all channels
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'subscribers' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDB();
    
    let orderBy = 'c.subscribers DESC';
    if (sort === 'recent') orderBy = 'c.created_at DESC';
    if (sort === 'views') orderBy = 'c.total_views DESC';
    
    const channels = db.prepare(`
      SELECT c.*, u.email, u.display_name, u.avatar_url
      FROM channels c
      JOIN users u ON c.user_id = u.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), offset);
    
    res.json({
      channels: channels.map(formatChannel)
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

// Get channel by handle
router.get('/@:handle', (req, res) => {
  try {
    const { handle } = req.params;
    const db = getDB();
    
    const channel = db.prepare(`
      SELECT c.*, u.email, u.display_name, u.avatar_url, u.bio as user_bio
      FROM channels c
      JOIN users u ON c.user_id = u.id
      WHERE c.handle = ?
    `).get(handle);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Get recent videos
    const videos = db.prepare(`
      SELECT * FROM videos WHERE channel_id = ? AND status = 'published'
      ORDER BY created_at DESC LIMIT 20
    `).all(channel.id);
    
    res.json({
      channel: formatChannel(channel),
      videos: videos.map(formatVideo)
    });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
});

// Subscribe to channel
router.post('/:id/subscribe', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    // Increment subscriber count
    db.prepare('UPDATE channels SET subscribers = subscribers + 1 WHERE id = ?').run(id);
    
    res.json({ message: 'Subscribed', subscribers: db.prepare('SELECT subscribers FROM channels WHERE id = ?').get(id).subscribers });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Subscribe failed' });
  }
});

// Unsubscribe from channel
router.post('/:id/unsubscribe', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    db.prepare('UPDATE channels SET subscribers = MAX(0, subscribers - 1) WHERE id = ?').run(id);
    
    res.json({ message: 'Unsubscribed', subscribers: db.prepare('SELECT subscribers FROM channels WHERE id = ?').get(id).subscribers });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Unsubscribe failed' });
  }
});

function formatChannel(c) {
  return {
    id: c.id,
    name: c.name,
    handle: c.handle,
    description: c.description,
    avatarUrl: c.avatar_url,
    bannerUrl: c.banner_url,
    subscribers: c.subscribers,
    verified: c.verified,
    totalViews: c.total_views,
    createdAt: c.created_at
  };
}

function formatVideo(v) {
  return {
    id: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnail_url,
    duration: v.duration,
    views: v.views,
    likes: v.likes,
    createdAt: v.created_at
  };
}

export default router;
