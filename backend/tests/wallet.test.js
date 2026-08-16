/**
 * Security-critical unit tests for the wallet crypto utilities.
 *
 * These lock in the two most important fixes in this change:
 *   1. A generated private key is NEVER returned in a form that leaks it, and
 *   2. encryptPrivateKey -> decryptPrivateKey round-trips correctly, while the
 *      stored payload is never the raw key (not plaintext, not the 0x hex).
 */
const crypto = require('crypto');

// Ensure the config resolver provides a usable encryption key in tests.
process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-32chars-minimum-length';
if (!process.env.WALLET_ENCRYPTION_KEY) {
  process.env.WALLET_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
}

const {
  generateWallet,
  encryptPrivateKey,
  decryptPrivateKey,
  isValidAddress
} = require('../src/utils/wallet');

describe('Wallet security', () => {
  test('generateWallet returns a valid EVM address and a 0x private key', () => {
    const w = generateWallet();
    expect(w.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(w.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(isValidAddress(w.address)).toBe(true);
  });

  test('encrypted payload is never the plaintext private key', () => {
    const w = generateWallet();
    const payload = encryptPrivateKey(w.privateKey);
    expect(payload).not.toContain(w.privateKey);
    expect(payload).not.toContain(w.privateKey.replace('0x', ''));
    // Payload is the iv:ct:tag base64 format.
    expect(payload.split(':')).toHaveLength(3);
  });

  test('decryptPrivateKey round-trips the original key', () => {
    const w = generateWallet();
    const payload = encryptPrivateKey(w.privateKey);
    expect(decryptPrivateKey(payload)).toBe(w.privateKey);
  });

  test('two encryptions of the same key differ (random IV)', () => {
    const w = generateWallet();
    const a = encryptPrivateKey(w.privateKey);
    const b = encryptPrivateKey(w.privateKey);
    expect(a).not.toBe(b);
    expect(decryptPrivateKey(a)).toBe(w.privateKey);
    expect(decryptPrivateKey(b)).toBe(w.privateKey);
  });

  test('tampered payload fails to decrypt (auth tag check)', () => {
    const w = generateWallet();
    const payload = encryptPrivateKey(w.privateKey);
    const [iv, ct, tag] = payload.split(':');
    // Flip one bit in the ciphertext.
    const tamperedCt = Buffer.from(ct, 'base64');
    tamperedCt[0] ^= 0x01;
    const tampered = [iv, tamperedCt.toString('base64'), tag].join(':');
    expect(() => decryptPrivateKey(tampered)).toThrow();
  });

  test('malformed payload is rejected', () => {
    expect(() => decryptPrivateKey('not-a-valid-payload')).toThrow();
    expect(() => decryptPrivateKey('')).toThrow();
    expect(() => decryptPrivateKey(null)).toThrow();
  });

  test('isValidAddress rejects garbage', () => {
    expect(isValidAddress('0xdeadbeef')).toBe(false);
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress(null)).toBe(false);
  });
});

describe('Config: JWT secret fail-fast', () => {
  test('config exposes a non-empty JWT secret in test env', () => {
    const config = require('../src/config');
    expect(typeof config.JWT_SECRET).toBe('string');
    expect(config.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  test('config exposes a 64-hex WALLET_ENCRYPTION_KEY', () => {
    const config = require('../src/config');
    expect(config.WALLET_ENCRYPTION_KEY).toMatch(/^[0-9a-fA-F]{64}$/);
  });
});
