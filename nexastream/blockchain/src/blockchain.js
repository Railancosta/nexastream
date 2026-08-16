/**
 * NexaChain - Hybrid PoW/PoS Blockchain
 * Combines Proof of Work (60%) and Proof of Stake (40%)
 */

const Block = require('./block');
const Transaction = require('./transaction');
const { hash, verify, getAddress } = require('./crypto');

class NexaChain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = [];
        this.validators = new Map(); // Stake holders
        this.rewardPool = 0;
        this.networkNodes = new Set();
        
        // Consensus parameters
        this.POW_REWARD = 10;        // NEXA per PoW block
        this.POS_REWARD = 8;         // NEXA per PoS block
        this.MIN_STAKE = 1000;       // Minimum stake to be validator
        this.POW_RATIO = 0.6;        // 60% PoW blocks
        this.POS_RATIO = 0.4;        // 40% PoS blocks
        
        // Stats
        this.stats = {
            totalBlocks: 1,
            totalTransactions: 0,
            totalVolume: 0,
            powBlocks: 0,
            posBlocks: 0
        };
    }

    /**
     * Create genesis block
     */
    createGenesisBlock() {
        const genesisData = {
            type: 'GENESIS',
            timestamp: Date.now(),
            message: 'NexaChain Genesis Block - NexaStream Platform',
            initialSupply: 1000000000, // 1 billion NEXA
            distribution: {
                rewardsPool: 300000000,  // 30%
                stakingPool: 150000000,   // 15%
                teamReserve: 50000000,    // 5%
                publicSale: 500000000     // 50%
            }
        };
        
        const block = new Block(0, '0', genesisData, 1704067200000); // Jan 1, 2024
        block.hash = hash(JSON.stringify(genesisData));
        return block;
    }

    /**
     * Get latest block
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Add transaction to pending pool
     */
    addTransaction(transaction) {
        if (!transaction.isValid()) {
            throw new Error('Invalid transaction');
        }
        this.pendingTransactions.push(transaction);
        this.stats.totalTransactions++;
        return transaction.id;
    }

    /**
     * Register validator with stake
     */
    registerValidator(address, stake) {
        if (stake < this.MIN_STAKE) {
            throw new Error(`Minimum stake is ${this.MIN_STAKE} NEXA`);
        }
        this.validators.set(address, {
            stake,
            lastBlock: 0,
            totalReward: 0
        });
        console.log(`Validator registered: ${address} with ${stake} NEXA stake`);
    }

    /**
     * Select block producer (PoW + PoS hybrid)
     */
    selectBlockProducer() {
        const blockIndex = this.getLatestBlock().index + 1;
        const blockType = this.determineBlockType(blockIndex);
        
        if (blockType === 'POW') {
            return { type: 'POW', producer: null }; // Anyone can mine PoW
        }
        
        // PoS: Select validator based on stake weight
        return { type: 'POS', producer: this.selectPoSProducer() };
    }

    /**
     * Determine if block should be PoW or PoS
     */
    determineBlockType(blockIndex) {
        // Every 10 blocks, alternate to maintain ratio
        const cyclePosition = blockIndex % 10;
        if (cyclePosition < 6) {
            return 'POW'; // 60% PoW
        }
        return 'POS';   // 40% PoS
    }

    /**
     * Select PoS producer based on stake weight
     */
    selectPoSProducer() {
        const validators = Array.from(this.validators.entries())
            .filter(([_, v]) => v.stake >= this.MIN_STAKE);
        
        if (validators.length === 0) return null;
        
        // Weighted random selection based on stake
        const totalStake = validators.reduce((sum, [_, v]) => sum + v.stake, 0);
        let random = Math.random() * totalStake;
        
        for (const [address, validator] of validators) {
            random -= validator.stake;
            if (random <= 0) {
                return address;
            }
        }
        
        return validators[0][0];
    }

    /**
     * Create new block
     */
    createBlock(producerAddress = null, privateKey = null) {
        const producer = this.selectBlockProducer();
        const blockData = {
            transactions: this.pendingTransactions,
            producer: producerAddress,
            producerType: producer.type,
            timestamp: Date.now()
        };
        
        const newBlock = new Block(
            this.chain.length,
            this.getLatestBlock().hash,
            blockData
        );
        
        // Mining reward
        const reward = producer.type === 'POW' ? this.POW_REWARD : this.POS_REWARD;
        const coinbaseTx = Transaction.createCoinbase(producerAddress || '0x0000', reward, newBlock.index);
        newBlock.transactions.unshift(coinbaseTx);
        
        return newBlock;
    }

    /**
     * Mine block (PoW)
     */
    mineBlock(minerAddress, difficulty = 4) {
        const newBlock = this.createBlock(minerAddress);
        newBlock.validator = null; // PoW miners don't need to be validators
        
        console.log(`Mining block #${newBlock.index}...`);
        newBlock.mine(difficulty);
        
        if (this.addBlock(newBlock)) {
            this.stats.powBlocks++;
            return newBlock;
        }
        return null;
    }

    /**
     * Validate and add block (PoS)
     */
    validateAndAddBlock(block, validatorAddress, signature) {
        const producer = this.selectBlockProducer();
        
        if (producer.type !== 'POS') {
            throw new Error('This block must be PoW');
        }
        
        if (producer.producer !== validatorAddress) {
            throw new Error('Not selected as block producer');
        }
        
        // Verify signature
        if (!verify(block.getSigningData(), signature, validatorAddress)) {
            throw new Error('Invalid block signature');
        }
        
        block.validator = validatorAddress;
        return this.addBlock(block);
    }

    /**
     * Add block to chain
     */
    addBlock(block) {
        const latestBlock = this.getLatestBlock();
        
        // Verify block
        if (block.index !== latestBlock.index + 1) {
            throw new Error('Invalid block index');
        }
        
        if (block.previousHash !== latestBlock.hash) {
            throw new Error('Invalid previous hash');
        }
        
        if (!block.hasValidProof()) {
            throw new Error('Invalid PoW');
        }
        
        this.chain.push(block);
        this.pendingTransactions = [];
        this.stats.totalBlocks++;
        
        // Calculate volume
        const volume = block.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        this.stats.totalVolume += volume;
        
        // Update validator stats
        if (block.validator && this.validators.has(block.validator)) {
            const v = this.validators.get(block.validator);
            v.lastBlock = block.index;
            v.totalReward += block.transactions[0].amount;
        }
        
        console.log(`Block #${block.index} added. Hash: ${block.hash.substring(0, 16)}...`);
        return true;
    }

    /**
     * Get balance of address
     */
    getBalance(address) {
        let balance = 0;
        
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.to === address) {
                    balance += tx.amount;
                }
                if (tx.from === address) {
                    balance -= tx.amount + tx.fee;
                }
            }
        }
        
        return balance;
    }

    /**
     * Get all transactions for address
     */
    getTransactions(address) {
        const transactions = [];
        
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.from === address || tx.to === address) {
                    transactions.push({
                        ...tx,
                        blockIndex: block.index,
                        blockHash: block.hash
                    });
                }
            }
        }
        
        return transactions;
    }

    /**
     * Verify chain integrity
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }
            
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
            
            if (!currentBlock.hasValidProof()) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get blockchain stats
     */
    getStats() {
        return {
            ...this.stats,
            pendingTransactions: this.pendingTransactions.length,
            validatorCount: this.validators.size,
            totalSupply: this.calculateTotalSupply(),
            difficulty: this.getLatestBlock().difficulty
        };
    }

    /**
     * Calculate total supply
     */
    calculateTotalSupply() {
        let supply = 0;
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.from === 'COINBASE') {
                    supply += tx.amount;
                }
            }
        }
        return supply;
    }

    /**
     * Export chain to JSON
     */
    toJSON() {
        return {
            chain: this.chain.map(b => b.toJSON()),
            stats: this.stats,
            validators: Array.from(this.validators.entries())
        };
    }

    /**
     * Import chain from JSON
     */
    static fromJSON(data) {
        const chain = new NexaChain();
        chain.chain = data.chain.map(b => Block.fromJSON(b));
        chain.stats = data.stats;
        chain.validators = new Map(data.validators);
        return chain;
    }
}

module.exports = NexaChain;
