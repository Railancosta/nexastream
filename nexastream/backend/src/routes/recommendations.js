const express = require('express');
const db = require('../config/database');
const recommendationEngine = require('../algorithms/recommendationEngine');
const router = express.Router();

// FOR YOU PAGE (TikTok/Kwai style)
// Main personalized feed
router.get('/for-you', (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
        userId = decoded.userId;
      } catch (e) {}
    }
    
    const videos = recommendationEngine.getForYouFeed(userId, parseInt(limit), parseInt(offset));
    
    res.json({ 
      videos,
      feed_type: 'for_you',
      empty: videos.length === 0
    });
  } catch (error) { 
    console.error('For You error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' }); 
  }
});

// TRENDING (YouTube style)
router.get('/trending', (req, res) => {
  try {
    const { limit = 20, offset = 0, category } = req.query;
    const videos = recommendationEngine.getTrendingFeed(
      parseInt(limit), 
      parseInt(offset),
      category
    );
    
    res.json({ 
      videos,
      feed_type: 'trending',
      empty: videos.length === 0
    });
  } catch (error) { 
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to get trending' }); 
  }
});

// VIRAL (Kwai discovery)
router.get('/viral', (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const videos = db.prepare(`
      SELECT v.*, 
             c.name as channel_name, 
             c.handle as channel_handle, 
             c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published'
      ORDER BY v.created_at DESC
      LIMIT 100
    `).all();
    
    // Score for viral potential
    const scoredVideos = videos.map(video => {
      const viralScore = recommendationEngine.calculateViralScore(video);
      return { ...video, viral_score: viralScore };
    });
    
    scoredVideos.sort((a, b) => b.viral_score - a.viral_score);
    const result = scoredVideos.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({ 
      videos: result,
      feed_type: 'viral',
      empty: result.length === 0
    });
  } catch (error) { 
    console.error('Viral error:', error);
    res.status(500).json({ error: 'Failed to get viral content' }); 
  }
});

// SUBSCRIPTIONS (Instagram style)
router.get('/subscriptions', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
    
    const { limit = 20, offset = 0 } = req.query;
    const videos = recommendationEngine.getSubscriptionFeed(
      decoded.userId,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({ 
      videos,
      feed_type: 'subscriptions',
      empty: videos.length === 0
    });
  } catch (error) { 
    console.error('Subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get subscriptions feed' }); 
  }
});

// RELATED VIDEOS (YouTube "Up Next")
router.get('/related/:videoId', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const { videoId } = req.params;
    
    const videos = recommendationEngine.getRelatedVideos(videoId, parseInt(limit));
    
    res.json({ 
      videos,
      feed_type: 'related',
      empty: videos.length === 0
    });
  } catch (error) { 
    console.error('Related error:', error);
    res.status(500).json({ error: 'Failed to get related videos' }); 
  }
});

// CATEGORY FEED
router.get('/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const videos = db.prepare(`
      SELECT v.*, 
             c.name as channel_name, 
             c.handle as channel_handle, 
             c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published' AND v.category = ?
      ORDER BY v.views DESC, v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(category, parseInt(limit), parseInt(offset));
    
    res.json({ 
      videos,
      category,
      feed_type: 'category',
      empty: videos.length === 0
    });
  } catch (error) { 
    console.error('Category error:', error);
    res.status(500).json({ error: 'Failed to get category feed' }); 
  }
});

// HYBRID FEED (Combines all algorithms)
router.get('/hybrid', (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key');
        userId = decoded.userId;
      } catch (e) {}
    }
    
    // Get videos
    const videos = db.prepare(`
      SELECT v.*, 
             c.name as channel_name, 
             c.handle as channel_handle, 
             c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published'
      ORDER BY v.created_at DESC
      LIMIT 100
    `).all();
    
    // Score with hybrid algorithm
    const scoredVideos = videos.map(video => ({
      ...video,
      for_you_score: recommendationEngine.calculateForYouScore(video, userId),
      trending_score: recommendationEngine.calculateTrendingScore(video),
      viral_score: recommendationEngine.calculateViralScore(video),
      hybrid_score: recommendationEngine.calculateHybridScore(video, userId)
    }));
    
    scoredVideos.sort((a, b) => b.hybrid_score - a.hybrid_score);
    const result = scoredVideos.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({ 
      videos: result,
      feed_type: 'hybrid',
      empty: result.length === 0
    });
  } catch (error) { 
    console.error('Hybrid error:', error);
    res.status(500).json({ error: 'Failed to get hybrid feed' }); 
  }
});

module.exports = router;
