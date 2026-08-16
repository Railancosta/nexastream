import type { WebSocket } from "ws";
import {
  parseSignalingMessage,
  serializePeerMessage,
  type PeerMessage,
  type SignalingMessage,
  SignalingProtocolError,
} from "@nexastream/shared";
import type { RoomManager } from "./room-manager.js";

function send(ws: WebSocket, msg: PeerMessage): void {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(serializePeerMessage(msg));
}

function sendError(ws: WebSocket, message: string): void {
  send(ws, { type: "error", message });
}

export interface MessageHandlerDeps {
  readonly rooms: RoomManager;
  readonly maxPeersPerRoom: number;
}

export function createMessageHandler(deps: MessageHandlerDeps) {
  function handle(ws: WebSocket, raw: string): void {
    let msg: SignalingMessage;
    try {
      msg = parseSignalingMessage(raw);
    } catch (err) {
      const message =
        err instanceof SignalingProtocolError ? err.message : "invalid message";
      sendError(ws, message);
      return;
    }

    if (!deps.rooms.allowMessage(ws)) {
      sendError(ws, "rate limit exceeded");
      return;
    }

    const senderPeerId = deps.rooms.getPeerId(ws);
    if (!senderPeerId) {
      sendError(ws, "not registered");
      return;
    }

    switch (msg.type) {
      case "ping": {
        send(ws, { type: "pong" });
        return;
      }
      case "join": {
        const result = deps.rooms.joinRoom(ws, msg.roomId);
        if (!result.joined) {
          sendError(ws, `join failed: ${result.reason}`);
          return;
        }
        send(ws, {
          type: "joined",
          roomId: msg.roomId,
          peerId: senderPeerId,
          peers: result.peers,
        });
        for (const t of deps.rooms.targetsInRoom(msg.roomId, ws)) {
          send(t.ws, { type: "peer-joined", roomId: msg.roomId, peerId: senderPeerId });
        }
        return;
      }
      case "leave": {
        const leftRoomId = deps.rooms.leaveRoom(ws);
        if (leftRoomId) {
          for (const t of deps.rooms.targetsInRoom(leftRoomId, ws)) {
            send(t.ws, { type: "peer-left", roomId: leftRoomId, peerId: senderPeerId });
          }
        }
        return;
      }
      case "offer":
      case "answer":
      case "ice-candidate": {
        const target = deps.rooms.targetForPeer(msg.roomId, msg.targetPeerId);
        if (!target) {
          sendError(ws, "target peer not in room");
          return;
        }
        send(target.ws, { type: msg.type, fromPeerId: senderPeerId, payload: msg.payload });
        return;
      }
    }
  }

  return { handle, send, sendError };
}

export { parseSignalingMessage, serializePeerMessage };
export type { SignalingMessage };
