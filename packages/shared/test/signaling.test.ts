import { describe, it, expect } from "vitest";
import {
  parseSignalingMessage,
  serializePeerMessage,
  SignalingProtocolError,
} from "../src/signaling/index.ts";

describe("signaling protocol", () => {
  it("parses a valid join message", () => {
    const msg = parseSignalingMessage(JSON.stringify({ type: "join", roomId: "room-1" }));
    expect(msg.type).toBe("join");
  });

  it("parses a valid offer message", () => {
    const msg = parseSignalingMessage(
      JSON.stringify({
        type: "offer",
        roomId: "room-1",
        targetPeerId: "peerA",
        payload: { sdp: "x" },
      }),
    );
    expect(msg.type).toBe("offer");
  });

  it("rejects invalid JSON", () => {
    expect(() => parseSignalingMessage("nope")).toThrow(SignalingProtocolError);
  });

  it("rejects unknown type", () => {
    expect(() => parseSignalingMessage(JSON.stringify({ type: "flood" }))).toThrow(
      SignalingProtocolError,
    );
  });

  it("rejects malformed roomId", () => {
    expect(() =>
      parseSignalingMessage(JSON.stringify({ type: "join", roomId: "bad room!" })),
    ).toThrow(SignalingProtocolError);
  });

  it("serializes outbound peer messages", () => {
    const s = serializePeerMessage({ type: "pong" });
    expect(JSON.parse(s).type).toBe("pong");
  });
});
