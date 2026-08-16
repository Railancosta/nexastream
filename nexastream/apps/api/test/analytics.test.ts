import { describe, it, expect } from "vitest";
import { AnalyticsService } from "../src/services/analytics/analytics-service.js";
import { AntiFraudService } from "../src/services/antifraud/antifraud-service.js";

describe("AnalyticsService — event tracking", () => {
  it("records events and counts by type", () => {
    const svc = new AnalyticsService();
    svc.record({ type: "video_started", sessionId: "s1", videoId: "v1", userId: "u1", metadata: {} });
    svc.record({ type: "video_completed", sessionId: "s1", videoId: "v1", userId: "u1", metadata: {} });
    svc.record({ type: "like_added", sessionId: "s1", videoId: "v1", userId: "u1", metadata: {} });
    const counts = svc.getEventTypeCounts();
    expect(counts["video_started"]).toBe(1);
    expect(counts["video_completed"]).toBe(1);
    expect(counts["like_added"]).toBe(1);
    expect(svc.totalEvents).toBe(3);
  });

  it("aggregates video start count and completion rate", () => {
    const svc = new AnalyticsService();
    svc.record({ type: "video_started", sessionId: "s1", videoId: "v1", userId: "u1", metadata: {} });
    svc.record({ type: "video_started", sessionId: "s2", videoId: "v1", userId: "u2", metadata: {} });
    svc.record({ type: "video_started", sessionId: "s3", videoId: "v1", userId: "u3", metadata: {} });
    svc.record({ type: "video_completed", sessionId: "s1", videoId: "v1", userId: "u1", metadata: {} });
    expect(svc.getVideoStartCount("v1")).toBe(3);
    expect(svc.getCompletionRate("v1")).toBeCloseTo(0.333, 1);
  });

  it("filters events by user and video", () => {
    const svc = new AnalyticsService();
    svc.record({ type: "video_started", sessionId: "s1", videoId: "v1", userId: "u1", metadata: {} });
    svc.record({ type: "video_started", sessionId: "s2", videoId: "v2", userId: "u2", metadata: {} });
    expect(svc.getEventsForUser("u1").length).toBe(1);
    expect(svc.getEventsForVideo("v2").length).toBe(1);
  });
});

describe("AntiFraudService — risk assessment", () => {
  it("returns low risk for normal user", () => {
    const analytics = new AnalyticsService();
    const af = new AntiFraudService(analytics);
    const result = af.assessRisk("normal-user");
    expect(result.level).toBe("low");
    expect(result.score).toBe(0);
    expect(result.autoBan).toBe(false);
  });

  it("detects view farming (started without completion)", () => {
    const analytics = new AnalyticsService();
    const af = new AntiFraudService(analytics);
    for (let i = 0; i < 15; i++) {
      analytics.record({ type: "video_started", sessionId: `s${i}`, videoId: `v${i}`, userId: "farmer", metadata: {} });
    }
    const result = af.assessRisk("farmer");
    expect(result.signals).toContain("view farming: no completions");
    expect(result.score).toBeGreaterThan(0);
  });

  it("detects excessive activity velocity", () => {
    const analytics = new AnalyticsService();
    const af = new AntiFraudService(analytics);
    const now = Date.now();
    for (let i = 0; i < 150; i++) {
      af.trackActivity("fast-user", now - i * 10);
    }
    const result = af.assessRisk("fast-user");
    expect(result.signals.some((s) => s.includes("velocity"))).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it("does NOT auto-ban on single weak heuristic (rule 35)", () => {
    const analytics = new AnalyticsService();
    const af = new AntiFraudService(analytics);
    // Only one signal: view farming.
    for (let i = 0; i < 15; i++) {
      analytics.record({ type: "video_started", sessionId: `s${i}`, videoId: `v${i}`, userId: "user", metadata: {} });
    }
    const result = af.assessRisk("user");
    expect(result.signals.length).toBe(1);
    expect(result.autoBan).toBe(false); // single signal = no auto-ban
  });

  it("auto-bans only on critical risk with multiple signals", () => {
    const analytics = new AnalyticsService();
    const af = new AntiFraudService(analytics);
    const now = Date.now();
    // Signal 1: excessive velocity.
    for (let i = 0; i < 200; i++) af.trackActivity("attacker", now - i * 5);
    // Signal 2: view farming.
    for (let i = 0; i < 20; i++) analytics.record({ type: "video_started", sessionId: `s${i}`, videoId: `v${i}`, userId: "attacker", metadata: {} });
    // Signal 3: impossible activity + like farming.
    for (let i = 0; i < 25; i++) af.trackActivity("attacker", now + i * 50);
    // Signal 4: like farming.
    for (let i = 0; i < 60; i++) analytics.record({ type: "like_added", sessionId: `ls${i}`, videoId: `v${i}`, userId: "attacker", metadata: {}, timestamp: now });
    const result = af.assessRisk("attacker");
    expect(result.signals.length).toBeGreaterThanOrEqual(3);
    expect(result.level).toBe("critical");
    expect(result.autoBan).toBe(true);
  });

  it("validates views (rule 34)", () => {
    const analytics = new AnalyticsService();
    const af = new AntiFraudService(analytics);
    expect(af.validateView("u1", "v1", 500).valid).toBe(false); // too short
    expect(af.validateView("u1", "v1", 5000).valid).toBe(true); // valid
    af.banUser("u1");
    expect(af.validateView("u1", "v1", 5000).valid).toBe(false); // banned
  });

  it("detects Sybil patterns (rule 35)", () => {
    const analytics = new AnalyticsService();
    const af = new AntiFraudService(analytics);
    // 3 users with identical behavior.
    for (const userId of ["sybil1", "sybil2", "sybil3"]) {
      for (let i = 0; i < 6; i++) {
        analytics.record({ type: "video_started", sessionId: `s${i}`, videoId: `v${i}`, userId, metadata: {} });
      }
    }
    // 1 normal user with different pattern.
    analytics.record({ type: "like_added", sessionId: "sx", videoId: "vx", userId: "normal", metadata: {} });
    const suspicious = af.detectSybil(["sybil1", "sybil2", "sybil3", "normal"]);
    expect(suspicious).toContain("sybil1");
    expect(suspicious).toContain("sybil2");
    expect(suspicious).toContain("sybil3");
    expect(suspicious).not.toContain("normal");
  });

  it("ban/unban works", () => {
    const analytics = new AnalyticsService();
    const af = new AntiFraudService(analytics);
    af.banUser("bad-actor");
    expect(af.isBanned("bad-actor")).toBe(true);
    af.unbanUser("bad-actor");
    expect(af.isBanned("bad-actor")).toBe(false);
  });
});
