import { WebSocketServer, type WebSocket } from "ws";
import { loadConfig, type SignalingConfig } from "./config.js";
import { RoomManager } from "./room-manager.js";
import { createMessageHandler } from "./handler.js";
import { serializePeerMessage } from "@nexastream/shared";

export interface SignalingServer {
  readonly config: SignalingConfig;
  readonly rooms: RoomManager;
  close: () => Promise<void>;
}

export function createSignalingServer(config: SignalingConfig): SignalingServer {
  const rooms = new RoomManager(config.maxPeersPerRoom);
  const handler = createMessageHandler({ rooms, maxPeersPerRoom: config.maxPeersPerRoom });

  const wss = new WebSocketServer({
    host: config.host,
    port: config.port,
    // Limit inbound frame size at the transport layer too.
    maxPayload: config.maxMessageBytes,
  });

  wss.on("connection", (ws: WebSocket) => {
    rooms.register(ws);

    ws.on("message", (data) => {
      // Enforce size limit again in case of fragmented frames.
      const raw = data.toString("utf8");
      if (Buffer.byteLength(raw, "utf8") > config.maxMessageBytes) {
        handler.sendError(ws, "message too large");
        return;
      }
      handler.handle(ws, raw);
    });

    ws.on("error", () => {
      // Swallow socket errors; disconnect handles cleanup.
    });

    ws.on("close", () => {
      const result = rooms.disconnect(ws);
      if (result?.roomId) {
        for (const t of rooms.targetsInRoom(result.roomId)) {
          t.ws.send(
            serializePeerMessage({ type: "peer-left", roomId: result.roomId, peerId: result.peerId }),
          );
        }
      }
    });
  });

  return {
    config,
    rooms,
    async close(): Promise<void> {
      return new Promise((resolve, reject) => {
        wss.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const server = createSignalingServer(config);
  console.log(
    `[signaling] listening on ${config.host}:${config.port} (stun=${config.stunUrl})`,
  );
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}
