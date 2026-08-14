import { describe, it, expect } from "vitest";
import { KeyManager, MissingSecretError, WeakSecretError } from "../src/index.js";

describe("KeyManager", () => {
  it("requires secrets from environment (rule 106)", () => {
    const km = new KeyManager({ JWT_SECRET: "a-very-long-secret-32-chars-min" });
    expect(km.requireSecret("JWT_SECRET")).toBe("a-very-long-secret-32-chars-min");
  });

  it("throws on missing secret (fail-fast)", () => {
    const km = new KeyManager({});
    expect(() => km.requireSecret("MISSING_SECRET")).toThrow(MissingSecretError);
  });

  it("validates JWT secret minimum length", () => {
    const km = new KeyManager({ JWT_SECRET: "short" });
    expect(() => km.requireJwtSecret()).toThrow(WeakSecretError);
  });

  it("validates private key format", () => {
    const km = new KeyManager({ PRIVATE_KEY: "not-a-key" });
    expect(() => km.requirePrivateKey("PRIVATE_KEY")).toThrow(WeakSecretError);
  });

  it("accepts hex private key", () => {
    const km = new KeyManager({ PRIVATE_KEY: "0x" + "a".repeat(64) });
    expect(km.requirePrivateKey("PRIVATE_KEY")).toBe("0x" + "a".repeat(64));
  });

  it("accepts PEM private key", () => {
    const km = new KeyManager({ PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nMIIEvQIB\n-----END PRIVATE KEY-----" });
    expect(km.requirePrivateKey("PRIVATE_KEY")).toContain("BEGIN");
  });

  it("optional secret returns undefined when not set", () => {
    const km = new KeyManager({});
    expect(km.optionalSecret("TURN_URL")).toBeUndefined();
  });

  it("detects hardcoded secrets in code (rule 106)", () => {
    const code = 'const PRIVATE_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"';
    const findings = KeyManager.scanForHardcodedSecrets(code);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not flag safe code", () => {
    const code = 'const key = process.env.PRIVATE_KEY;';
    const findings = KeyManager.scanForHardcodedSecrets(code);
    expect(findings.length).toBe(0);
  });

  it("generates dev secret with sufficient entropy", () => {
    const secret = KeyManager.generateDevSecret(48);
    expect(secret.length).toBe(96); // 48 bytes = 96 hex chars
  });
});
