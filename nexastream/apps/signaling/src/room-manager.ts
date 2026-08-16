import { randomBytes } from "node:crypto";
import type { WebSocket } from "ws";

interface PeerState {
  readonly peerId: string;
  roomId: string | null;
  /** timestamps (ms) of recently accepted messages, for sliding-window rate limit */
  recentMessages: number[];
  lastSeen: number;
}

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 20; // 20 messages / second / peer

export interface BroadcastTarget {
  readonly peerId: string;
  readonly ws: WebSocket;
}

/**
 * In-memory room manager. Coordinates membership only — it never stores
 * SDP permanently. SDP messages are routed and forgotten.
 */
export class RoomManager {
  private readonly peers = new Map<WebSocket, PeerState>();
  private readonly rooms = new Map<string, Set<WebSocket>>();
  private readonly maxPeersPerRoom: number;

  constructor(maxPeersPerRoom: number) {
    this.maxPeersPerRoom = maxPeersPerRoom;
  }

  register(ws: WebSocket): string {
    const peerId = randomBytes(12).toString("base64url");
    this.peers.set(ws, {
      peerId,
      roomId: null,
      recentMessages: [],
      lastSeen: Date.now(),
    });
    return peerId;
  }

  getPeerId(ws: WebSocket): string | undefined {
    return this.peers.get(ws)?.peerId;
  }

  /**
   * Returns true if the peer is allowed to send another message right now
   * (rate limit). Mutates the sliding window.
   */
  allowMessage(ws: WebSocket): boolean {
    const state = this.peers.get(ws);
    if (!state) return false;
    const now = Date.now();
    state.lastSeen = now;
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    state.recentMessages = state.recentMessages.filter((t) => t > cutoff);
    if (state.recentMessages.length >= RATE_LIMIT_MAX) {
      return false;
    }
    state.recentMessages.push(now);
    return true;
  }

  joinRoom(ws: WebSocket, roomId: string): { joined: true; peers: string[] } | { joined: false; reason: string } {
    const state = this.peers.get(ws);
    if (!state) return { joined: false, reason: "not registered" };

    // Leave any previous room first.
    if (state.roomId) this.leaveRoom(ws);

    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Set();
      this.rooms.set(roomId, room);
    }
    if (room.size >= this.maxPeersPerRoom) {
      return { joined: false, reason: "room full" };
    }
    room.add(ws);
    state.roomId = roomId;
    const peers = this.peerIdsInRoom(roomId).filter((id) => id !== state.peerId);
    return { joined: true, peers };
  }

  leaveRoom(ws: WebSocket): string | null {
    const state = this.peers.get(ws);
    if (!state || !state.roomId) return null;
    const roomId = state.roomId;
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) this.rooms.delete(roomId);
    }
    state.roomId = null;
    return roomId;
  }

  peerIdsInRoom(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const ids: string[] = [];
    for (const ws of room) {
      const state = this.peers.get(ws);
      if (state && state.roomId === roomId) ids.push(state.peerId);
    }
    return ids;
  }

  /** Sockets in a room EXCLUDING a given one (used for relaying). */
  targetsInRoom(roomId: string, excludeWs?: WebSocket): BroadcastTarget[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const out: BroadcastTarget[] = [];
    for (const ws of room) {
      if (ws === excludeWs) continue;
      const state = this.peers.get(ws);
      if (state && state.roomId === roomId && ws.readyState === ws.OPEN) {
        out.push({ peerId: state.peerId, ws });
      }
    }
    return out;
  }

  /** Resolve the ws for a specific target peer in a room. */
  targetForPeer(roomId: string, targetPeerId: string): BroadcastTarget | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    for (const ws of room) {
      const state = this.peers.get(ws);
      if (state && state.peerId === targetPeerId && state.roomId === roomId && ws.readyState === ws.OPEN) {
        return { peerId: state.peerId, ws };
      }
    }
    return null;
  }

  disconnect(ws: WebSocket): { peerId: string; roomId: string | null } | null {
    const state = this.peers.get(ws);
    if (!state) return null;
    const roomId = state.roomId ? this.leaveRoom(ws) : null;
    this.peers.delete(ws);
    return { peerId: state.peerId, roomId };
  }

  /** Total registered peers (for health/observability). */
  get peerCount(): number {
    return this.peers.size;
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}
