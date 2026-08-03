import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/database.js';

const router = Router();

// Get all videos (feed)
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, category, sort = 'recent' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDB();
    
    let query = `
      SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar, c.verified as channel_verified
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published'
    `;
    
    const params = [];
    
    if (category) {
      query += ' AND v.category = ?';
      params.push(category);
    }
    
    if (sort === 'popular') {
      query += ' ORDER BY v.views DESC';
    } else if (sort === 'trending') {
      query += ' ORDER BY (v.likes * 2 + v.views) DESC';
    } else {
      query += ' ORDER BY v.created_at DESC';
    }
    
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const videos = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM videos WHERE status = ?';
    const countParams = ['published'];
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    const total = db.prepare(countQuery).get(...countParams).count;
    
    res.json({
      videos: videos.map(formatVideo),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
});

// Get trending videos
router.get('/trending', (req, res) => {
  try {
    const db = getDB();
    const videos = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar, c.verified as channel_verified
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published'
      ORDER BY (v.views * 0.3 + v.likes * 2) DESC
      LIMIT 12
    `).all();
    
    res.json({ videos: videos.map(formatVideo) });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to get trending' });
  }
});

// Get video by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    const video = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar, c.verified as channel_verified, c.subscribers as channel_subscribers
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.id = ?
    `).get(id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Increment view count
    db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(id);
    
    // Get related videos
    const related = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.id != ? AND v.category = ? AND v.status = 'published'
      LIMIT 6
    `).all(id, video.category);
    
    res.json({
      video: formatVideo(video),
      related: related.map(formatVideo)
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Failed to get video' });
  }
});

// Search videos
router.get('/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDB();
    
    const searchTerm = `%${query}%`;
    
    const videos = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle, c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published' AND (v.title LIKE ? OR v.description LIKE ?)
      ORDER BY v.views DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, parseInt(limit), offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM videos
      WHERE status = 'published' AND (title LIKE ? OR description LIKE ?)
    `).get(searchTerm, searchTerm).count;
    
    res.json({
      videos: videos.map(formatVideo),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get videos by channel
router.get('/channel/:channelId', (req, res) => {
  try {
    const { channelId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDB();
    
    const videos = db.prepare(`
      SELECT v.*, c.name as channel_name, c.handle as channel_handle
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.channel_id = ? AND v.status = 'published'
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(channelId, parseInt(limit), offset);
    
    res.json({ videos: videos.map(formatVideo) });
  } catch (error) {
    console.error('Channel videos error:', error);
    res.status(500).json({ error: 'Failed to get channel videos' });
  }
});

// Like video
router.post('/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    db.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').run(id);
    
    res.json({ message: 'Video liked', likes: db.prepare('SELECT likes FROM videos WHERE id = ?').get(id).likes });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Like failed' });
  }
});

// Get categories
router.get('/meta/categories', (req, res) => {
  const categories = [
    { id: 'all', name: 'All', icon: '🎬' },
    { id: 'crypto', name: 'Crypto', icon: '₿' },
    { id: 'defi', name: 'DeFi', icon: '💰' },
    { id: 'nft', name: 'NFT', icon: '🎨' },
    { id: 'gaming', name: 'Gaming', icon: '🎮' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎭' },
    { id: 'technology', name: 'Technology', icon: '💻' },
  ];
  res.json({ categories });
});

function formatVideo(v) {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    thumbnailUrl: v.thumbnail_url,
    videoUrl: v.video_url,
    duration: v.duration,
    views: v.views,
    likes: v.likes,
    category: v.category,
    rewardAmount: v.reward_amount,
    createdAt: v.created_at,
    channel: {
      id: v.channel_id,
      name: v.channel_name,
      handle: v.channel_handle,
      avatarUrl: v.channel_avatar,
      verified: v.channel_verified,
      subscribers: v.channel_subscribers
    }
  };
}

export default router;
