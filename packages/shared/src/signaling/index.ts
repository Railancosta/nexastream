import { z } from "zod";

/**
 * Signaling protocol. Only these message types are accepted.
 * Any other type is rejected (rule: never accept arbitrary JSON).
 */

const roomIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "roomId may only contain A-Z a-z 0-9 _ -");

const peerIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "peerId may only contain A-Z a-z 0-9 _ -");

const payloadSchema = z.record(z.string(), z.unknown());

export const JoinMessage = z.object({
  type: z.literal("join"),
  roomId: roomIdSchema,
});

export const OfferMessage = z.object({
  type: z.literal("offer"),
  roomId: roomIdSchema,
  targetPeerId: peerIdSchema,
  payload: payloadSchema,
});

export const AnswerMessage = z.object({
  type: z.literal("answer"),
  roomId: roomIdSchema,
  targetPeerId: peerIdSchema,
  payload: payloadSchema,
});

export const IceCandidateMessage = z.object({
  type: z.literal("ice-candidate"),
  roomId: roomIdSchema,
  targetPeerId: peerIdSchema,
  payload: payloadSchema,
});

export const LeaveMessage = z.object({
  type: z.literal("leave"),
  roomId: roomIdSchema,
});

export const PingMessage = z.object({
  type: z.literal("ping"),
});

export const SignalingMessage = z.discriminatedUnion("type", [
  JoinMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  LeaveMessage,
  PingMessage,
]);

export type JoinMessage = z.infer<typeof JoinMessage>;
export type OfferMessage = z.infer<typeof OfferMessage>;
export type AnswerMessage = z.infer<typeof AnswerMessage>;
export type IceCandidateMessage = z.infer<typeof IceCandidateMessage>;
export type LeaveMessage = z.infer<typeof LeaveMessage>;
export type PingMessage = z.infer<typeof PingMessage>;
export type SignalingMessage = z.infer<typeof SignalingMessage>;

/** Outbound message sent to peers. */
export const PeerMessage = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("joined"),
    roomId: roomIdSchema,
    peerId: peerIdSchema,
    peers: z.array(peerIdSchema),
  }),
  z.object({
    type: z.literal("peer-joined"),
    roomId: roomIdSchema,
    peerId: peerIdSchema,
  }),
  z.object({
    type: z.literal("peer-left"),
    roomId: roomIdSchema,
    peerId: peerIdSchema,
  }),
  z.object({
    type: z.literal("offer"),
    fromPeerId: peerIdSchema,
    payload: payloadSchema,
  }),
  z.object({
    type: z.literal("answer"),
    fromPeerId: peerIdSchema,
    payload: payloadSchema,
  }),
  z.object({
    type: z.literal("ice-candidate"),
    fromPeerId: peerIdSchema,
    payload: payloadSchema,
  }),
  z.object({ type: z.literal("pong") }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type PeerMessage = z.infer<typeof PeerMessage>;

/** Parse a raw inbound message string. Throws on invalid JSON/schema. */
export function parseSignalingMessage(raw: string): SignalingMessage {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new SignalingProtocolError("invalid JSON");
  }
  const result = SignalingMessage.safeParse(data);
  if (!result.success) {
    throw new SignalingProtocolError(result.error.issues[0]?.message ?? "schema validation failed");
  }
  return result.data;
}

/** Serialize an outbound message to a JSON string. */
export function serializePeerMessage(msg: PeerMessage): string {
  return JSON.stringify(PeerMessage.parse(msg));
}

export class SignalingProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignalingProtocolError";
  }
}

export const SCHEMA_VALID_TYPES = [
  "join",
  "offer",
  "answer",
  "ice-candidate",
  "leave",
  "ping",
] as const;
