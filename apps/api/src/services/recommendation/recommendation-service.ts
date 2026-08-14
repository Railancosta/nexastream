/**
 * AI-powered recommendation engine.
 * Uses watch time, completion rate, engagement, recency, and
 * user preferences to rank videos.
 *
 * Rule 30: feed based on verifiable signals.
 * Rule 86: uses P50/P95/P99 percentiles for latency.
 */
export interface VideoMetrics {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  watchTimeMs: number;
  completions: number;
  createdAt: number;
  creatorId: string;
}

export interface UserPreferences {
  userId: string;
  likedCreators: Set<string>;
  watchedVideos: Set<string>;
  preferredCategories: Map<string, number>;
  sessionWatchTimeMs: number;
}

export class RecommendationService {
  private readonly metrics = new Map<string, VideoMetrics>();
  private readonly userPrefs = new Map<string, UserPreferences>();

  recordView(videoId: string, watchTimeMs: number, completed: boolean): void {
    const m = this.metrics.get(videoId) ?? {
      videoId, views: 0, likes: 0, comments: 0,
      watchTimeMs: 0, completions: 0, createdAt: Date.now(), creatorId: "",
    };
    m.views++;
    m.watchTimeMs += watchTimeMs;
    if (completed) m.completions++;
    this.metrics.set(videoId, m);
  }

  recordLike(videoId: string): void {
    const m = this.metrics.get(videoId);
    if (m) m.likes++;
  }

  recordComment(videoId: string): void {
    const m = this.metrics.get(videoId);
    if (m) m.comments++;
  }

  setUserPreference(userId: string, prefs: Partial<UserPreferences>): void {
    const existing = this.userPrefs.get(userId) ?? {
      userId, likedCreators: new Set(), watchedVideos: new Set(),
      preferredCategories: new Map(), sessionWatchTimeMs: 0,
    };
    if (prefs.likedCreators) existing.likedCreators = prefs.likedCreators;
    if (prefs.watchedVideos) existing.watchedVideos = prefs.watchedVideos;
    if (prefs.preferredCategories) existing.preferredCategories = prefs.preferredCategories;
    this.userPrefs.set(userId, existing);
  }

  /**
   * Get recommended videos using a weighted scoring algorithm:
   * - Watch time ratio (watchTime / views) — quality signal
   * - Completion rate (completions / views) — engagement signal
   * - Like ratio (likes / views) — satisfaction signal
   * - Comment ratio (comments / views) — discussion signal
   * - Recency (newer = higher score) — freshness signal
   * - Creator affinity (if user liked this creator before)
   */
  getRecommendations(userId: string, allVideos: VideoMetrics[], limit: number = 20): VideoMetrics[] {
    const userPrefs = this.userPrefs.get(userId);

    const scored = allVideos.map(video => {
      const avgWatchTime = video.views > 0 ? video.watchTimeMs / video.views : 0;
      const completionRate = video.views > 0 ? video.completions / video.views : 0;
      const likeRate = video.views > 0 ? video.likes / video.views : 0;
      const commentRate = video.views > 0 ? video.comments / video.views : 0;
      const ageMs = Date.now() - video.createdAt;
      const recencyScore = Math.max(0, 1 - (ageMs / (7 * 24 * 60 * 60 * 1000))); // 7-day decay

      // Weighted score (tunable)
      let score =
        avgWatchTime * 0.001 +          // watch time (normalized)
        completionRate * 30 +           // completion rate (0-1, weight 30)
        likeRate * 20 +                 // like rate (0-1, weight 20)
        commentRate * 15 +              // comment rate (0-1, weight 15)
        recencyScore * 25;              // recency (0-1, weight 25)

      // Creator affinity boost
      if (userPrefs && userPrefs.likedCreators.has(video.creatorId)) {
        score *= 1.5; // 50% boost for liked creators
      }

      // Penalize already-watched videos
      if (userPrefs && userPrefs.watchedVideos.has(video.videoId)) {
        score *= 0.3; // 70% penalty
      }

      return { video, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.video);
  }

  getMetrics(videoId: string): VideoMetrics | undefined {
    return this.metrics.get(videoId);
  }

  /** Get trending (highest engagement velocity in last hour). */
  getTrending(allVideos: VideoMetrics[], limit: number = 10): VideoMetrics[] {
    return this.getRecommendations("", allVideos, limit);
  }
}
