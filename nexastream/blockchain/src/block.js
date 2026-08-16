/**
 * NexaChain Block Class
 */

const { hash, merkleRoot, proofOfWork } = require('./crypto');

class Block {
    constructor(index, previousHash, data, timestamp, validator = null) {
        this.index = index;
        this.timestamp = timestamp || Date.now();
        this.previousHash = previousHash;
        this.data = data;
        this.validator = validator;
        this.transactions = data.transactions || [];
        this.merkleRoot = merkleRoot(this.transactions);
        this.nonce = 0;
        this.difficulty = 4;
        this.hash = this.calculateHash();
    }

    /**
     * Calculate block hash with PoW
     */
    calculateHash() {
        const blockData = 
            this.index +
            this.timestamp +
            this.previousHash +
            this.merkleRoot +
            this.nonce +
            (this.validator || '');
        
        return hash(blockData);
    }

    /**
     * Mine block (PoW)
     */
    mine(difficulty = 4) {
        this.difficulty = difficulty;
        const target = '0'.repeat(difficulty);
        
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        
        console.log(`Block #${this.index} mined: ${this.hash}`);
        return this.hash;
    }

    /**
     * Validate PoW
     */
    hasValidProof() {
        const target = '0'.repeat(this.difficulty);
        return this.hash.substring(0, this.difficulty) === target;
    }

    /**
     * Get block data for signing
     */
    getSigningData() {
        return JSON.stringify({
            index: this.index,
            timestamp: this.timestamp,
            previousHash: this.previousHash,
            merkleRoot: this.merkleRoot,
            nonce: this.nonce
        });
    }

    /**
     * Serialize block to JSON
     */
    toJSON() {
        return {
            index: this.index,
            timestamp: this.timestamp,
            previousHash: this.previousHash,
            merkleRoot: this.merkleRoot,
            transactions: this.transactions,
            nonce: this.nonce,
            difficulty: this.difficulty,
            validator: this.validator,
            hash: this.hash
        };
    }

    /**
     * Create block from JSON
     */
    static fromJSON(data) {
        const block = new Block(
            data.index,
            data.previousHash,
            { transactions: data.transactions },
            data.timestamp,
            data.validator
        );
        block.nonce = data.nonce;
        block.difficulty = data.difficulty;
        block.hash = data.hash;
        return block;
    }
}

module.exports = Block;
