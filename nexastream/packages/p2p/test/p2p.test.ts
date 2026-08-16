import { describe, it, expect } from "vitest";
import { createSegment, verifySegment, PeerManager } from "../src/index.js";

describe("VideoSegment — integrity", () => {
  it("creates a segment with SHA-256 content hash", () => {
    const data = Buffer.from("video-data-chunk-1");
    const seg = createSegment(0, data);
    expect(seg.index).toBe(0);
    expect(seg.size).toBe(data.length);
    expect(seg.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies segment integrity", () => {
    const data = Buffer.from("valid-data");
    const seg = createSegment(5, data);
    expect(verifySegment(seg)).toBe(true);
  });

  it("detects tampered segment data", () => {
    const seg = createSegment(0, Buffer.from("original"));
    const tampered = { ...seg, data: Buffer.from("tampered") };
    expect(verifySegment(tampered)).toBe(false);
  });

  it("same data produces same hash (deterministic)", () => {
    const data = Buffer.from("same-data");
    const s1 = createSegment(0, data);
    const s2 = createSegment(0, data);
    expect(s1.contentHash).toBe(s2.contentHash);
  });
});

describe("PeerManager — peer coordination", () => {
  it("registers peers with server-generated IDs (anti-spoofing)", () => {
    const pm = new PeerManager(10);
    const p1 = pm.registerPeer();
    const p2 = pm.registerPeer();
    expect(p1.id).not.toBe(p2.id);
    expect(p1.id.length).toBeGreaterThan(10);
    expect(pm.getPeerCount()).toBe(2);
  });

  it("announces segments and finds peers with them", () => {
    const pm = new PeerManager();
    const p1 = pm.registerPeer();
    const p2 = pm.registerPeer();
    pm.announceSegment(p1.id, 0);
    pm.announceSegment(p1.id, 1);
    pm.announceSegment(p2.id, 1);
    expect(pm.findPeersWithSegment(0).length).toBe(1);
    expect(pm.findPeersWithSegment(1).length).toBe(2);
  });

  it("records upload/download for reputation (rule 93)", () => {
    const pm = new PeerManager();
    const p = pm.registerPeer();
    pm.recordUpload(p.id, 10000);
    pm.recordDownload(p.id, 5000);
    expect(pm.getReputation(p.id)).toBe(67); // 10000/15000 * 100 = 66.67 -> 67
  });

  it("neutral reputation for new peers with no transfers", () => {
    const pm = new PeerManager();
    const p = pm.registerPeer();
    expect(pm.getReputation(p.id)).toBe(50);
  });

  it("enforces max peers limit (anti-flooding — rule 169)", () => {
    const pm = new PeerManager(3);
    pm.registerPeer();
    pm.registerPeer();
    pm.registerPeer();
    expect(() => pm.registerPeer()).toThrow("max peers reached");
  });

  it("removes peers", () => {
    const pm = new PeerManager();
    const p = pm.registerPeer();
    expect(pm.removePeer(p.id)).toBe(true);
    expect(pm.getPeerCount()).toBe(0);
    expect(pm.getPeer(p.id)).toBeUndefined();
  });

  it("rejects segment announcement for unknown peer", () => {
    const pm = new PeerManager();
    expect(() => pm.announceSegment("unknown", 0)).toThrow("peer not found");
  });

  it("enforces max segments per peer", () => {
    const pm = new PeerManager(10, 3);
    const p = pm.registerPeer();
    pm.announceSegment(p.id, 0);
    pm.announceSegment(p.id, 1);
    pm.announceSegment(p.id, 2);
    expect(() => pm.announceSegment(p.id, 3)).toThrow("max segments per peer reached");
  });

  it("cleans up inactive peers", () => {
    const pm = new PeerManager();
    const p1 = pm.registerPeer();
    const p2 = pm.registerPeer();
    pm.announceSegment(p2.id, 0); // p2 has segments
    // p1 has no segments and is "old"
    const peer1 = pm.getPeer(p1.id)!;
    peer1.connectedAt = Date.now() - 600000; // 10 min ago
    const removed = pm.cleanupInactive(300000); // 5 min max age
    expect(removed).toBe(1);
    expect(pm.getPeer(p1.id)).toBeUndefined();
    expect(pm.getPeer(p2.id)).toBeDefined();
  });

  it("returns all peer IDs", () => {
    const pm = new PeerManager();
    pm.registerPeer();
    pm.registerPeer();
    expect(pm.getPeerIds().length).toBe(2);
  });
});
