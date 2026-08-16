/**
 * NexaChain Crypto Module
 * Handles hashing and cryptographic operations
 */

const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

/**
 * Hash a string using SHA-256
 */
function hash(data) {
    return CryptoJS.SHA256(data).toString();
}

/**
 * Hash a block
 */
function hashBlock(block) {
    return hash(
        block.index +
        block.timestamp +
        block.previousHash +
        block.data +
        block.difficulty +
        block.hash
    );
}

/**
 * Generate a key pair
 */
function generateKeyPair() {
    const keyPair = ec.genKeyPair();
    return {
        privateKey: keyPair.getPrivate('hex'),
        publicKey: keyPair.getPublic('hex')
    };
}

/**
 * Get address from public key
 */
function getAddress(publicKey) {
    const hash256 = hash(publicKey);
    return '0x' + hash256.slice(-40);
}

/**
 * Sign data with private key
 */
function sign(data, privateKey) {
    const keyPair = ec.keyFromPrivate(privateKey);
    const signature = keyPair.sign(hash(data), 'base64');
    return {
        r: signature.r.toString('hex'),
        s: signature.s.toString('hex'),
        v: signature.recoveryParam + 27
    };
}

/**
 * Verify signature
 */
function verify(data, signature, publicKey) {
    try {
        const keyPair = ec.keyFromPublic(publicKey, 'hex');
        return keyPair.verify(hash(data), signature);
    } catch (e) {
        return false;
    }
}

/**
 * Proof of Work - find nonce with target difficulty
 */
function proofOfWork(data, difficulty = 4) {
    let nonce = 0;
    let hash = '';
    const target = '0'.repeat(difficulty);
    
    while (!hash.startsWith(target)) {
        nonce++;
        hash = hash(data + nonce);
    }
    
    return { nonce, hash };
}

/**
 * Create Merkle tree root
 */
function merkleRoot(transactions) {
    if (transactions.length === 0) return hash('');
    
    const hashes = transactions.map(tx => hash(JSON.stringify(tx)));
    
    while (hashes.length > 1) {
        const newHashes = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = hashes[i + 1] || left;
            newHashes.push(hash(left + right));
        }
        hashes.length = 0;
        hashes.push(...newHashes);
    }
    
    return hashes[0];
}

module.exports = {
    hash,
    hashBlock,
    generateKeyPair,
    getAddress,
    sign,
    verify,
    proofOfWork,
    merkleRoot
};
