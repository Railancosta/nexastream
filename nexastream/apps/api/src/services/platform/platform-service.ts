import { randomUUID } from "node:crypto";

export interface Video {
  id: string;
  title: string;
  description: string;
  contentHash: string;
  creatorId: string;
  createdAt: number;
  views: number;
  likes: Set<string>;
  status: "processing" | "ready" | "published" | "private" | "blocked";
}

export interface Comment {
  id: string;
  videoId: string;
  authorId: string;
  content: string;
  createdAt: number;
  updatedAt: number | null;
  status: "visible" | "hidden" | "removed";
}

export interface Subscription {
  subscriberId: string;
  creatorId: string;
  createdAt: number;
}

/**
 * Platform service — in-memory store for feed, comments, likes, subscriptions.
 * In production this would be backed by PostgreSQL.
 *
 * Rule 33: likes are idempotent — one user cannot like the same video twice.
 * Rule 31: search never concatenates SQL with input.
 * Rule 32: comments have moderation states.
 */
export class PlatformService {
  private readonly videos = new Map<string, Video>();
  private readonly comments = new Map<string, Comment>();
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly likedPairs = new Set<string>(); // "userId:videoId" for idempotency

  // --- Videos ---

  publishVideo(input: { title: string; description: string; contentHash: string; creatorId: string }): Video {
    const video: Video = {
      id: randomUUID(),
      title: input.title.slice(0, 255),
      description: input.description.slice(0, 5000),
      contentHash: input.contentHash,
      creatorId: input.creatorId,
      createdAt: Date.now(),
      views: 0,
      likes: new Set(),
      status: "published",
    };
    this.videos.set(video.id, video);
    return video;
  }

  getVideo(id: string): Video | undefined {
    return this.videos.get(id);
  }

  /** Feed: ranking by recency + watch time + engagement (rule 30). */
  getFeed(limit = 20, offset = 0): Video[] {
    return Array.from(this.videos.values())
      .filter((v) => v.status === "published")
      .sort((a, b) => {
        // Simple ranking: recency + likes count
        const scoreA = a.createdAt + a.likes.size * 10000;
        const scoreB = b.createdAt + b.likes.size * 10000;
        return scoreB - scoreA;
      })
      .slice(offset, offset + limit);
  }

  /** Search: parameterized, never SQL concatenation (rule 31). */
  search(query: string, limit = 20): Video[] {
    const q = query.trim().toLowerCase();
    if (!q || q.length > 200) return [];
    return Array.from(this.videos.values())
      .filter(
        (v) =>
          v.status === "published" &&
          (v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)),
      )
      .slice(0, limit);
  }

  incrementViews(videoId: string): void {
    const v = this.videos.get(videoId);
    if (v) v.views++;
  }

  // --- Likes (idempotent — rule 33) ---

  likeVideo(userId: string, videoId: string): { liked: boolean } {
    const key = `${userId}:${videoId}`;
    if (this.likedPairs.has(key)) {
      return { liked: false }; // already liked — idempotent
    }
    this.likedPairs.add(key);
    const v = this.videos.get(videoId);
    if (v) v.likes.add(userId);
    return { liked: true };
  }

  unlikeVideo(userId: string, videoId: string): { unliked: boolean } {
    const key = `${userId}:${videoId}`;
    if (!this.likedPairs.has(key)) return { unliked: false };
    this.likedPairs.delete(key);
    const v = this.videos.get(videoId);
    if (v) v.likes.delete(userId);
    return { unliked: true };
  }

  getLikeCount(videoId: string): number {
    return this.videos.get(videoId)?.likes.size ?? 0;
  }

  // --- Comments (rule 32) ---

  addComment(videoId: string, authorId: string, content: string): Comment {
    const trimmed = content.trim().slice(0, 2000);
    if (!trimmed) throw new Error("comment cannot be empty");
    const comment: Comment = {
      id: randomUUID(),
      videoId,
      authorId,
      content: trimmed,
      createdAt: Date.now(),
      updatedAt: null,
      status: "visible",
    };
    this.comments.set(comment.id, comment);
    return comment;
  }

  getComments(videoId: string, limit = 50): Comment[] {
    return Array.from(this.comments.values())
      .filter((c) => c.videoId === videoId && c.status === "visible")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  removeComment(commentId: string, requesterId: string): boolean {
    const c = this.comments.get(commentId);
    if (!c) return false;
    if (c.authorId !== requesterId) return false; // only author can remove
    c.status = "removed";
    return true;
  }

  // --- Subscriptions ---

  subscribe(subscriberId: string, creatorId: string): { subscribed: boolean } {
    const key = `${subscriberId}:${creatorId}`;
    if (this.subscriptions.has(key)) return { subscribed: false }; // idempotent
    this.subscriptions.set(key, { subscriberId, creatorId, createdAt: Date.now() });
    return { subscribed: true };
  }

  unsubscribe(subscriberId: string, creatorId: string): { unsubscribed: boolean } {
    const key = `${subscriberId}:${creatorId}`;
    if (!this.subscriptions.has(key)) return { unsubscribed: false };
    this.subscriptions.delete(key);
    return { unsubscribed: true };
  }

  getSubscriberCount(creatorId: string): number {
    let count = 0;
    for (const sub of this.subscriptions.values()) {
      if (sub.creatorId === creatorId) count++;
    }
    return count;
  }

  getVideoCount(): number {
    return this.videos.size;
  }

  getCommentCount(): number {
    return this.comments.size;
  }
}
