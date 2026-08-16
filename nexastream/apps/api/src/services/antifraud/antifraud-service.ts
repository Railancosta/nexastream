import type { AnalyticsService } from "../analytics/analytics-service.js";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskAssessment {
  userId: string;
  score: number;
  level: RiskLevel;
  signals: string[];
  autoBan: boolean;
}

/**
 * Anti-fraud service (rule 34, 35, 101).
 * Never auto-ban on a single weak heuristic (rule 35). Use risk score.
 */
export class AntiFraudService {
  private readonly analytics: AnalyticsService;
  private readonly bannedUsers = new Set<string>();
  private readonly userActivity = new Map<string, number[]>();

  constructor(analytics: AnalyticsService) {
    this.analytics = analytics;
  }

  trackActivity(userId: string, timestamp = Date.now()): void {
    const arr = this.userActivity.get(userId) ?? [];
    arr.push(timestamp);
    if (arr.length > 1000) arr.shift();
    this.userActivity.set(userId, arr);
  }

  assessRisk(userId: string): RiskAssessment {
    const signals: string[] = [];
    let score = 0;
    const events = this.analytics.getEventsForUser(userId);
    const activity = this.userActivity.get(userId) ?? [];

    if (activity.length > 0) {
      const now = Date.now();
      const recent = activity.filter((t) => t > now - 60_000);
      if (recent.length > 100) { score += 30; signals.push("excessive velocity: 100+/min"); }
      else if (recent.length > 50) { score += 15; signals.push("high velocity: 50+/min"); }
    }

    const started = events.filter((e) => e.type === "video_started").length;
    const completed = events.filter((e) => e.type === "video_completed").length;
    if (started > 10 && completed === 0) { score += 25; signals.push("view farming: no completions"); }

    const likes = events.filter((e) => e.type === "like_added");
    if (likes.length > 50) {
      const now = Date.now();
      const recentLikes = likes.filter((e) => e.timestamp > now - 3600_000);
      if (recentLikes.length > 50) { score += 25; signals.push("like farming: 50+/hr"); }
    }

    if (activity.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < activity.length; i++) intervals.push(activity[i] - activity[i - 1]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval < 100 && activity.length > 20) { score += 20; signals.push("impossible activity: <100ms avg"); }
    }

    if (this.bannedUsers.has(userId)) { score = 100; signals.push("user is banned"); }

    const level: RiskLevel = score >= 80 ? "critical" : score >= 60 ? "high" : score >= 30 ? "medium" : "low";
    const autoBan = level === "critical" && signals.length >= 3;

    return { userId, score, level, signals, autoBan };
  }

  banUser(userId: string): void { this.bannedUsers.add(userId); }
  unbanUser(userId: string): void { this.bannedUsers.delete(userId); }
  isBanned(userId: string): boolean { return this.bannedUsers.has(userId); }

  validateView(userId: string, videoId: string, sessionDuration: number): { valid: boolean; reason?: string } {
    if (this.isBanned(userId)) return { valid: false, reason: "user banned" };
    if (sessionDuration < 1000) return { valid: false, reason: "session too short (<1s)" };
    const events = this.analytics.getEventsForUser(userId);
    const recentStarts = events.filter((e) => e.type === "video_started" && e.videoId === videoId && Date.now() - e.timestamp < 60_000);
    if (recentStarts.length > 5) return { valid: false, reason: "repeated views in 1 min" };
    return { valid: true };
  }

  detectSybil(userIds: string[]): string[] {
    const suspicious: string[] = [];
    const patternMap = new Map<string, string[]>();
    for (const userId of userIds) {
      const events = this.analytics.getEventsForUser(userId);
      if (events.length < 5) continue;
      const fingerprint = events.slice(0, 10).map((e) => e.type).join("|");
      const existing = patternMap.get(fingerprint) ?? [];
      existing.push(userId);
      patternMap.set(fingerprint, existing);
    }
    for (const [, users] of patternMap) {
      if (users.length >= 3) suspicious.push(...users);
    }
    return suspicious;
  }
}
