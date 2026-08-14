import { describe, it, expect, afterEach } from "vitest";
import { WebSocket } from "ws";
import { createSignalingServer, type SignalingServer } from "../src/server.js";
import { loadConfig } from "../src/config.js";
import { serializePeerMessage, type PeerMessage } from "@nexastream/shared";

const TEST_PORT = 4097;

function makeConfig(overrides: Partial<Record<string, unknown>> = {}) {
  process.env.SIGNALING_PORT = String(TEST_PORT);
  process.env.SIGNALING_MAX_MESSAGE_BYTES = "65536";
  process.env.SIGNALING_MAX_PEERS_PER_ROOM = "2";
  process.env.SIGNALING_PEER_TIMEOUT_SECONDS = "60";
  for (const [k, v] of Object.entries(overrides)) {
    process.env[k] = String(v);
  }
  return loadConfig();
}

let servers: SignalingServer[] = [];

function openClient(port = TEST_PORT): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function recv(ws: WebSocket, timeoutMs = 3000): Promise<PeerMessage> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("recv timeout")), timeoutMs);
    ws.once("message", (data) => {
      clearTimeout(t);
      // Outbound messages are PeerMessage (not inbound SignalingMessage),
      // so parse directly. parseSignalingMessage is only for inbound traffic.
      const parsed = JSON.parse(data.toString()) as PeerMessage;
      resolve(parsed);
    });
    ws.once("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

afterEach(async () => {
  for (const s of servers) await s.close();
  servers = [];
});

describe("signaling server", () => {
  it("registers a peer and responds to ping with pong", async () => {
    const server = createSignalingServer(makeConfig());
    servers.push(server);
    const ws = await openClient();
    ws.send(JSON.stringify({ type: "ping" }));
    const msg = await recv(ws);
    expect(msg.type).toBe("pong");
    ws.close();
  });

  it("rejects malformed JSON with an error message", async () => {
    const server = createSignalingServer(makeConfig());
    servers.push(server);
    const ws = await openClient();
    ws.send("not-json");
    const msg = await recv(ws);
    expect(msg.type).toBe("error");
    ws.close();
  });

  it("rejects unknown message types", async () => {
    const server = createSignalingServer(makeConfig());
    servers.push(server);
    const ws = await openClient();
    ws.send(JSON.stringify({ type: "hack-the-planet" }));
    const msg = await recv(ws);
    expect(msg.type).toBe("error");
    ws.close();
  });

  it("allows a peer to join a room and reports existing peers", async () => {
    const server = createSignalingServer(makeConfig());
    servers.push(server);
    const ws1 = await openClient();
    ws1.send(JSON.stringify({ type: "join", roomId: "room-A" }));
    const joined1 = await recv(ws1);
    expect(joined1.type).toBe("joined");

    const ws2 = await openClient();
    ws2.send(JSON.stringify({ type: "join", roomId: "room-A" }));
    const joined2 = await recv(ws2);
    expect(joined2.type).toBe("joined");
    if (joined2.type !== "joined") throw new Error("fail");
    expect(joined2.peers.length).toBe(1);

    // ws1 should have received peer-joined
    const peerJoined = await recv(ws1);
    expect(peerJoined.type).toBe("peer-joined");
    ws1.close();
    ws2.close();
  });

  it("routes an offer to the targeted peer", async () => {
    const server = createSignalingServer(makeConfig());
    servers.push(server);
    const ws1 = await openClient();
    const ws2 = await openClient();

    ws1.send(JSON.stringify({ type: "join", roomId: "room-B" }));
    await recv(ws1);
    ws2.send(JSON.stringify({ type: "join", roomId: "room-B" }));
    const joined2 = await recv(ws2);
    await recv(ws1); // peer-joined notification
    if (joined2.type !== "joined") throw new Error("fail");
    const targetPeerId = joined2.peers[0];

    ws2.send(
      JSON.stringify({
        type: "offer",
        roomId: "room-B",
        targetPeerId,
        payload: { sdp: "fake-sdp" },
      }),
    );
    const offer = await recv(ws1);
    expect(offer.type).toBe("offer");
    if (offer.type !== "offer") throw new Error("fail");
    expect(offer.fromPeerId).toBe(joined2.peerId);
    expect(offer.payload.sdp).toBe("fake-sdp");
    ws1.close();
    ws2.close();
  });

  it("broadcasts peer-left when a peer disconnects", async () => {
    const server = createSignalingServer(makeConfig());
    servers.push(server);
    const ws1 = await openClient();
    const ws2 = await openClient();
    ws1.send(JSON.stringify({ type: "join", roomId: "room-C" }));
    await recv(ws1);
    ws2.send(JSON.stringify({ type: "join", roomId: "room-C" }));
    await recv(ws2);
    await recv(ws1);

    ws1.close();
    const left = await recv(ws2);
    expect(left.type).toBe("peer-left");
    ws2.close();
  });

  it("enforces room capacity", async () => {
    const server = createSignalingServer(makeConfig({ SIGNALING_MAX_PEERS_PER_ROOM: "1" }));
    servers.push(server);
    const ws1 = await openClient();
    const ws2 = await openClient();
    ws1.send(JSON.stringify({ type: "join", roomId: "room-D" }));
    await recv(ws1);
    ws2.send(JSON.stringify({ type: "join", roomId: "room-D" }));
    const msg = await recv(ws2);
    expect(msg.type).toBe("error");
    ws1.close();
    ws2.close();
  });

  it("applies rate limiting on excessive messages", async () => {
    const server = createSignalingServer(makeConfig());
    servers.push(server);
    const ws = await openClient();
    // Flood pings well beyond the 20 msg/s window.
    let lastMsg: PeerMessage | null = null;
    for (let i = 0; i < 60; i++) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
    // Drain messages; one of them should be an error.
    const got: PeerMessage[] = [];
    await new Promise<void>((resolve) => {
      let count = 0;
      const handler = (data: { toString: () => string }) => {
        got.push(JSON.parse(data.toString()) as PeerMessage);
        count++;
        if (count >= 30) {
          ws.off("message", handler);
          resolve();
        }
      };
      ws.on("message", handler);
    });
    expect(got.some((m) => m.type === "error")).toBe(true);
    void lastMsg;
    ws.close();
  });

  it("round-trips outbound serialization", () => {
    const s = serializePeerMessage({ type: "pong" });
    expect(JSON.parse(s).type).toBe("pong");
  });
});
