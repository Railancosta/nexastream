/**
 * Wallet security utilities.
 *
 * Design rules (enforced here, not by convention):
 *  1. A wallet private key is NEVER returned to the client.
 *  2. Private keys are NEVER stored in plaintext. They are encrypted at rest
 *     with AES-256-GCM using config.WALLET_ENCRYPTION_KEY and stored as
 *     "iv:ciphertext:tag" (all base64). The key itself lives only in env.
 *  3. Key generation uses ethers v6 (genuine secp256k1) so addresses are real
 *     EVM addresses, not fabricated values.
 *  4. Decrypt is the only path that recovers the raw key, and it is only ever
 *     called server-side right before signing an outbound transaction.
 */
const crypto = require('crypto');
const { ethers } = require('ethers');
const config = require('../config');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // 96-bit IV is recommended for GCM

function encryptionKey() {
  return Buffer.from(config.WALLET_ENCRYPTION_KEY, 'hex');
}

/**
 * Generate a genuine EVM keypair.
 * @returns {{ address: string, privateKey: string }} address is checksummed.
 */
function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  return { address: wallet.address, privateKey: wallet.privateKey };
}

/**
 * Encrypt a private key for at-rest storage.
 * @param {string} privateKey 0x-prefixed 32-byte hex private key
 * @returns {string} "iv:ciphertext:tag" base64 payload
 */
function encryptPrivateKey(privateKey) {
  const key = encryptionKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), ct.toString('base64'), tag.toString('base64')].join(':');
}

/**
 * Decrypt a stored private key payload. Server-side only.
 * @param {string} payload "iv:ciphertext:tag"
 * @returns {string} 0x-prefixed private key
 */
function decryptPrivateKey(payload) {
  if (!payload || typeof payload !== 'string') {
    throw new Error('No encrypted private key payload provided');
  }
  const [ivB64, ctB64, tagB64] = payload.split(':');
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error('Malformed encrypted private key payload');
  }
  const key = encryptionKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * Validate an EVM address without throwing.
 * @param {string} address
 * @returns {boolean}
 */
function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

module.exports = {
  generateWallet,
  encryptPrivateKey,
  decryptPrivateKey,
  isValidAddress
};
