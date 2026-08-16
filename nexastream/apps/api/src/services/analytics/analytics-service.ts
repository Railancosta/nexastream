import { randomUUID } from "node:crypto";

export type EventType =
  | "video_started"
  | "video_progress"
  | "video_completed"
  | "like_added"
  | "comment_created"
  | "subscription_created"
  | "upload_completed"
  | "search_performed";

export interface AnalyticsEvent {
  readonly id: string;
  readonly type: EventType;
  readonly timestamp: number;
  readonly userId?: string;
  readonly videoId?: string;
  readonly metadata: Record<string, string | number | boolean>;
  readonly sessionId: string;
}

/**
 * Analytics service — event-driven (rule 100).
 * Events are versioned when necessary (rule 137): e.g. "video.started.v1".
 */
export class AnalyticsService {
  private readonly events: AnalyticsEvent[] = [];
  private readonly eventTypeCounts = new Map<EventType, number>();

  record(input: Omit<AnalyticsEvent, "id" | "timestamp"> & { timestamp?: number }): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: randomUUID(),
      type: input.type,
      timestamp: input.timestamp ?? Date.now(),
      userId: input.userId,
      videoId: input.videoId,
      metadata: input.metadata,
      sessionId: input.sessionId,
    };
    this.events.push(event);
    this.eventTypeCounts.set(event.type, (this.eventTypeCounts.get(event.type) ?? 0) + 1);
    return event;
  }

  getEvents(type?: EventType, limit = 100): AnalyticsEvent[] {
    const filtered = type ? this.events.filter((e) => e.type === type) : this.events;
    return filtered.slice(-limit);
  }

  getEventTypeCounts(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [type, count] of this.eventTypeCounts) result[type] = count;
    return result;
  }

  getEventsForVideo(videoId: string): AnalyticsEvent[] {
    return this.events.filter((e) => e.videoId === videoId);
  }

  getEventsForUser(userId: string): AnalyticsEvent[] {
    return this.events.filter((e) => e.userId === userId);
  }

  get totalEvents(): number { return this.events.length; }

  getVideoStartCount(videoId: string): number {
    return this.events.filter((e) => e.type === "video_started" && e.videoId === videoId).length;
  }

  getCompletionRate(videoId: string): number {
    const started = this.getVideoStartCount(videoId);
    if (started === 0) return 0;
    const completed = this.events.filter((e) => e.type === "video_completed" && e.videoId === videoId).length;
    return completed / started;
  }
}
