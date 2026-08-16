/**
 * Security fuzzing utilities (rule 164, 171).
 * Generates malformed/edge-case inputs to test parsers and validators.
 */

export function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** Generate a random email-like string (may be invalid). */
export function fuzzEmail(): string {
  const variants = [
    "valid@example.com",
    "no-at-sign.com",
    "@no-local.com",
    "no-domain@",
    "a".repeat(1000) + "@x.com",
    "test@",
    "",
    "test@example.com" + "\x00null",
    "test\x0a@example.com",
    "TEST@EXAMPLE.COM",
    "test+tag@example.com",
    randomString(255) + "@x.com",
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

/** Generate random oversized buffers for upload fuzzing (rule 170). */
export function fuzzChunkSizes(maxSize: number): number[] {
  return [
    0,
    1,
    maxSize - 1,
    maxSize,
    maxSize + 1,
    maxSize * 2,
    2 ** 31 - 1,
    -1,
  ];
}

/** Generate malformed JSON strings (rule 171). */
export function fuzzJsonPayloads(): string[] {
  return [
    "",
    "{",
    "}",
    '{"key":}',
    '{"key":"value"',
    '{"key":null}',
    "[]",
    "null",
    '"string"',
    "42",
    "true",
    "{\"" + "a".repeat(10000) + "\":1}",
    "{\"" + "key\":\"" + "x".repeat(100000) + "\"}",
    "\x00\x01\x02",
    "{\"\x0akey\":\"val\"}",
  ];
}

/** Generate SQL injection patterns (rule 171, 31). */
export function sqlInjectionPatterns(): string[] {
  return [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "1; DELETE FROM users WHERE 1=1",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "1' OR 1=1--",
    "'; INSERT INTO users VALUES('hacker','admin'); --",
  ];
}

/** Generate XSS patterns for output encoding tests (rule 89). */
export function xssPatterns(): string[] {
  return [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert(1)>",
    "\"><script>alert(1)</script>",
    "javascript:alert(1)",
    "<svg onload=alert(1)>",
    "';alert(1)//",
  ];
}
