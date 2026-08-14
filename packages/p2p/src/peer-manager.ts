import { randomBytes } from "node:crypto";

export interface PeerInfo {
  readonly id: string;
  readonly segments: Set<number>;
  connectedAt: number;
  bytesUploaded: number;
  bytesDownloaded: number;
}

/**
 * P2P peer manager for video segment exchange (rule 6, 27, 96).
 * Coordinates which peers have which segments. Does NOT transport video
 * itself — that's done via WebRTC data channels.
 *
 * Rule 93: reputation based on verifiable behavior, not peer-supplied.
 * Rule 169: protects against peer flooding, eclipse, malformed messages.
 */
export class PeerManager {
  private readonly peers = new Map<string, PeerInfo>();
  private readonly maxPeers: number;
  private readonly maxSegmentsPerPeer: number;

  constructor(maxPeers = 50, maxSegmentsPerPeer = 1000) {
    this.maxPeers = maxPeers;
    this.maxSegmentsPerPeer = maxSegmentsPerPeer;
  }

  /** Register a new peer. Server generates the peer ID (anti-spoofing). */
  registerPeer(): PeerInfo {
    if (this.peers.size >= this.maxPeers) {
      throw new Error("max peers reached");
    }
    const peerId = randomBytes(12).toString("base64url");
    const peer: PeerInfo = {
      id: peerId,
      segments: new Set(),
      connectedAt: Date.now(),
      bytesUploaded: 0,
      bytesDownloaded: 0,
    };
    this.peers.set(peerId, peer);
    return peer;
  }

  /** Remove a peer. */
  removePeer(peerId: string): boolean {
    return this.peers.delete(peerId);
  }

  /** Announce that a peer has a segment. */
  announceSegment(peerId: string, segmentIndex: number): void {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error("peer not found");
    if (peer.segments.size >= this.maxSegmentsPerPeer) {
      throw new Error("max segments per peer reached");
    }
    peer.segments.add(segmentIndex);
  }

  /** Find peers that have a specific segment. */
  findPeersWithSegment(segmentIndex: number): PeerInfo[] {
    return Array.from(this.peers.values()).filter((p) => p.segments.has(segmentIndex));
  }

  /** Record bytes transferred (for reputation — rule 93). */
  recordUpload(peerId: string, bytes: number): void {
    const peer = this.peers.get(peerId);
    if (peer) peer.bytesUploaded += bytes;
  }

  recordDownload(peerId: string, bytes: number): void {
    const peer = this.peers.get(peerId);
    if (peer) peer.bytesDownloaded += bytes;
  }

  /** Get peer reputation score based on upload/download ratio. */
  getReputation(peerId: string): number {
    const peer = this.peers.get(peerId);
    if (!peer) return 0;
    const total = peer.bytesUploaded + peer.bytesDownloaded;
    if (total === 0) return 50; // neutral
    return Math.round((peer.bytesUploaded / total) * 100);
  }

  getPeer(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  getPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  /** Remove peers that have been inactive (no segments) for cleanup. */
  cleanupInactive(maxAgeMs: number): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, peer] of this.peers) {
      if (now - peer.connectedAt > maxAgeMs && peer.segments.size === 0) {
        this.peers.delete(id);
        removed++;
      }
    }
    return removed;
  }
}
