/**
 * NexaStream Recommendation Engine
 * Combines the best algorithms from TikTok, YouTube, Instagram, Kwai, and Facebook
 * 
 * ALGORITHM SOURCES:
 * 
 * TIKTOK/KWAI:
 * - For You Page (FYP) algorithm
 * - Completion rate priority
 * - Fresh content boost
 * - Hashtag/sound engagement
 * 
 * YOUTUBE:
 * - Watch time optimization
 * - Click-through rate
 * - Trending algorithm
 * - Up Next recommendations
 * 
 * INSTAGRAM/FACEBOOK:
 * - Relationship score
 * - Engagement rate
 * - Social proof
 * - Interest graph
 */

const db = require('../config/database');

// Algorithm weights (can be tuned)
const WEIGHTS = {
  // TikTok-style engagement
  likeWeight: 1.0,
  commentWeight: 3.0,
  shareWeight: 5.0,
  saveWeight: 4.0,
  
  // YouTube-style watch time
  watchTimeWeight: 2.0,
  completionRateWeight: 3.0,
  
  // Freshness (TikTok boost new content)
  freshnessDecayDays: 7,
  freshnessBoost: 50,
  
  // Discovery
  discoveryBoost: 30,
  
  // User-video affinity
  categoryMatchWeight: 2.0,
  creatorAffinityWeight: 1.5,
};

class RecommendationEngine {
  
  /**
   * TIKTOK-STYLE: For You Page Algorithm
   * Combines engagement, completion rate, and freshness
   */
  calculateForYouScore(video, userId = null, userHistory = null) {
    const now = Date.now();
    const videoAge = now - new Date(video.created_at).getTime();
    const ageInDays = videoAge / (1000 * 60 * 60 * 24);
    
    // 1. ENGAGEMENT SCORE (TikTok priority)
    const engagementScore = (
      (video.likes || 0) * WEIGHTS.likeWeight +
      (video.comments_count || 0) * WEIGHTS.commentWeight +
      (video.shares || 0) * WEIGHTS.shareWeight +
      (video.saves || 0) * WEIGHTS.saveWeight
    );
    
    // 2. COMPLETION RATE (TikTok key metric)
    const views = video.views || 1;
    const completionRate = Math.min((video.likes || 0) / views * 10, 1);
    
    // 3. WATCH TIME SCORE (YouTube metric)
    const avgWatchTime = video.avg_watch_time || 0;
    const duration = video.duration || 1;
    const watchTimeScore = Math.min(avgWatchTime / duration, 1);
    
    // 4. FRESHNESS SCORE (TikTok boost new content)
    let freshnessScore = 0;
    if (ageInDays < WEIGHTS.freshnessDecayDays) {
      freshnessScore = WEIGHTS.freshnessBoost * (1 - ageInDays / WEIGHTS.freshnessDecayDays);
    }
    
    // 5. DISCOVERY SCORE (viral potential)
    const discoveryScore = video.is_featured ? WEIGHTS.discoveryBoost : 0;
    
    // 6. PERSONALIZATION (if user history available)
    let personalizationScore = 0;
    if (userHistory && userId) {
      // Category match
      if (userHistory.favorite_categories?.includes(video.category)) {
        personalizationScore += WEIGHTS.categoryMatchWeight * 10;
      }
      // Creator affinity
      if (userHistory.watched_creators?.includes(video.channel_id)) {
        personalizationScore += WEIGHTS.creatorAffinityWeight * 10;
      }
      // Avoid recently watched
      if (userHistory.recently_watched?.includes(video.id)) {
        personalizationScore -= 50;
      }
    }
    
    // COMBINED SCORE
    const finalScore = 
      Math.log1p(engagementScore) * 10 +
      completionRate * WEIGHTS.completionRateWeight * 20 +
      watchTimeScore * WEIGHTS.watchTimeWeight * 15 +
      freshnessScore +
      discoveryScore +
      personalizationScore;
    
    return Math.round(finalScore * 100) / 100;
  }
  
  /**
   * YOUTUBE-STYLE: Trending Algorithm
   * Based on views velocity, engagement rate, and recency
   */
  calculateTrendingScore(video) {
    const now = Date.now();
    const videoAge = now - new Date(video.created_at).getTime();
    const ageInHours = videoAge / (1000 * 60 * 60);
    
    // Views in last 24h (velocity)
    const recentViews = video.views_last_24h || Math.floor((video.views || 0) * 0.3);
    
    // Engagement rate
    const views = video.views || 1;
    const engagementRate = (
      (video.likes || 0) +
      (video.comments_count || 0) * 2 +
      (video.shares || 0) * 3
    ) / views;
    
    // Time decay (YouTube boost within first 48h)
    let timeDecay = 1;
    if (ageInHours < 48) {
      timeDecay = 1 + (48 - ageInHours) / 48;
    } else {
      timeDecay = Math.max(0.1, 1 - (ageInHours - 48) / 672); // Decay over 28 days
    }
    
    // Views velocity score
    const velocityScore = Math.log1p(recentViews) * 5;
    
    // Combined trending score
    const trendingScore = (
      velocityScore +
      engagementRate * 100 +
      timeDecay * 20
    );
    
    return Math.round(trendingScore * 100) / 100;
  }
  
  /**
   * INSTAGRAM-STYLE: Subscription Feed
   * Prioritizes creators user interacts with most
   */
  calculateSubscriptionScore(video, userId) {
    // Get user's relationship with this creator
    const relationship = db.prepare(`
      SELECT 
        interaction_count,
        last_interaction,
        is_subscribed
      FROM creator_relationships 
      WHERE user_id = ? AND channel_id = ?
    `).get(userId, video.channel_id);
    
    if (!relationship || !relationship.is_subscribed) {
      return -1; // Not subscribed
    }
    
    // Relationship strength score
    const relationshipScore = Math.min((relationship.interaction_count || 0) * 2, 50);
    
    // Recency boost (recent interactions = stronger)
    const lastInteraction = relationship.last_interaction 
      ? (Date.now() - new Date(relationship.last_interaction).getTime()) / (1000 * 60 * 60)
      : 999;
    const recencyScore = Math.max(0, 30 - lastInteraction);
    
    // Video freshness
    const videoAge = (Date.now() - new Date(video.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 20 - videoAge);
    
    // Combine
    const subscriptionScore = relationshipScore + recencyScore + freshnessScore;
    
    return Math.round(subscriptionScore * 100) / 100;
  }
  
  /**
   * KWAI-STYLE: Viral Discovery
   * Finds content with explosive growth
   */
  calculateViralScore(video) {
    // Viral indicators
    const views = video.views || 0;
    const likes = video.likes || 0;
    const shares = video.shares || 0;
    
    // Share ratio (high = viral potential)
    const shareRatio = views > 0 ? shares / views : 0;
    
    // Like ratio
    const likeRatio = views > 0 ? likes / views : 0;
    
    // Growth velocity (views per hour)
    const videoAge = Math.max(1, (Date.now() - new Date(video.created_at).getTime()) / (1000 * 60 * 60));
    const viewsPerHour = views / videoAge;
    
    // Viral score calculation
    const viralScore = (
      Math.log1p(shareRatio * 1000) * 30 +
      Math.log1p(likeRatio * 100) * 20 +
      Math.log1p(viewsPerHour) * 10
    );
    
    return Math.round(viralScore * 100) / 100;
  }
  
  /**
   * FACEBOOK-STYLE: Interest Graph
   * Matches content to user interests
   */
  calculateInterestScore(video, userId) {
    if (!userId) return 0;
    
    // Get user interest profile
    const userProfile = db.prepare(`
      SELECT watch_history, favorite_categories, favorite_creators, engagement_patterns
      FROM user_interest_profiles WHERE user_id = ?
    `).get(userId);
    
    if (!userProfile) return 0;
    
    let interestScore = 0;
    
    // Category match
    const categories = JSON.parse(userProfile.favorite_categories || '[]');
    if (categories.includes(video.category)) {
      interestScore += 25;
    }
    
    // Creator affinity
    const creators = JSON.parse(userProfile.favorite_creators || '[]');
    if (creators.includes(video.channel_id)) {
      interestScore += 30;
    }
    
    // Engagement pattern match (early morning, evening, etc.)
    const patterns = JSON.parse(userProfile.engagement_patterns || '{}');
    const currentHour = new Date().getHours();
    if (patterns[currentHour]) {
      interestScore += patterns[currentHour] * 5;
    }
    
    return interestScore;
  }
  
  /**
   * HYBRID: Combined recommendation
   * Blends all algorithms based on context
   */
  calculateHybridScore(video, userId = null, options = {}) {
    const {
      forYouWeight = 0.4,
      trendingWeight = 0.2,
      subscriptionWeight = 0.2,
      viralWeight = 0.1,
      interestWeight = 0.1
    } = options;
    
    // Calculate individual scores
    const forYouScore = this.calculateForYouScore(video, userId);
    const trendingScore = this.calculateTrendingScore(video);
    const subscriptionScore = userId ? this.calculateSubscriptionScore(video, userId) : 0;
    const viralScore = this.calculateViralScore(video);
    const interestScore = this.calculateInterestScore(video, userId);
    
    // Normalize subscription score
    const normalizedSubscription = subscriptionScore < 0 ? 0 : Math.min(subscriptionScore, 100);
    
    // Weighted combination
    const hybridScore = (
      forYouScore * forYouWeight +
      trendingScore * trendingWeight +
      normalizedSubscription * subscriptionWeight +
      viralScore * viralWeight +
      interestScore * interestWeight
    );
    
    return Math.round(hybridScore * 100) / 100;
  }
  
  /**
   * Get personalized feed for user
   */
  getForYouFeed(userId = null, limit = 20, offset = 0) {
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
    
    // Get user history if available
    let userHistory = null;
    if (userId) {
      userHistory = db.prepare(`
        SELECT favorite_categories, watched_creators, recently_watched
        FROM user_interest_profiles WHERE user_id = ?
      `).get(userId);
    }
    
    // Score and sort videos
    const scoredVideos = videos.map(video => ({
      ...video,
      score: this.calculateForYouScore(video, userId, userHistory)
    }));
    
    scoredVideos.sort((a, b) => b.score - a.score);
    
    return scoredVideos.slice(offset, offset + limit);
  }
  
  /**
   * Get trending feed
   */
  getTrendingFeed(limit = 20, offset = 0, category = null) {
    let query = `
      SELECT v.*, 
             c.name as channel_name, 
             c.handle as channel_handle, 
             c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.status = 'published'
    `;
    
    const params = [];
    
    if (category) {
      query += ` AND v.category = ?`;
      params.push(category);
    }
    
    query += ` ORDER BY v.created_at DESC LIMIT 100`;
    
    const videos = db.prepare(query).all(...params);
    
    // Score and sort
    const scoredVideos = videos.map(video => ({
      ...video,
      trending_score: this.calculateTrendingScore(video),
      viral_score: this.calculateViralScore(video)
    }));
    
    scoredVideos.sort((a, b) => b.trending_score - a.trending_score);
    
    return scoredVideos.slice(offset, offset + limit);
  }
  
  /**
   * Get subscription feed
   */
  getSubscriptionFeed(userId, limit = 20, offset = 0) {
    const videos = db.prepare(`
      SELECT v.*, 
             c.name as channel_name, 
             c.handle as channel_handle, 
             c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      JOIN subscriptions s ON s.channel_id = c.id
      WHERE s.user_id = ? AND v.status = 'published'
      ORDER BY v.created_at DESC
      LIMIT 100
    `).all(userId);
    
    // Score and sort
    const scoredVideos = videos.map(video => ({
      ...video,
      subscription_score: this.calculateSubscriptionScore(video, userId)
    }));
    
    scoredVideos.sort((a, b) => b.subscription_score - a.subscription_score);
    
    return scoredVideos.slice(offset, offset + limit);
  }
  
  /**
   * Get related videos (for "Up Next" style recommendations)
   */
  getRelatedVideos(videoId, limit = 10) {
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
    
    if (!video) return [];
    
    const related = db.prepare(`
      SELECT v.*, 
             c.name as channel_name, 
             c.handle as channel_handle, 
             c.avatar_url as channel_avatar
      FROM videos v
      JOIN channels c ON v.channel_id = c.id
      WHERE v.id != ? 
        AND v.status = 'published'
        AND (v.category = ? OR v.channel_id = ?)
      ORDER BY v.created_at DESC
      LIMIT 50
    `).all(videoId, video.category, video.channel_id);
    
    // Score based on category match and engagement
    const scoredRelated = related.map(v => ({
      ...v,
      related_score: (
        (v.category === video.category ? 30 : 0) +
        (v.channel_id === video.channel_id ? 20 : 0) +
        Math.log1p(v.views) +
        Math.log1p(v.likes) * 2
      )
    }));
    
    scoredRelated.sort((a, b) => b.related_score - a.related_score);
    
    return scoredRelated.slice(0, limit);
  }
}

module.exports = new RecommendationEngine();
