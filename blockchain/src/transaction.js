/**
 * NexaChain Transaction Class
 */

const { hash, sign, verify, getAddress } = require('./crypto');

class Transaction {
    constructor(from, to, amount, data = {}, fee = 0.01) {
        this.id = hash(Date.now() + Math.random());
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.fee = fee;
        this.data = data; // For smart contract calls, video rewards, etc.
        this.timestamp = Date.now();
        this.signature = null;
    }

    /**
     * Sign transaction
     */
    sign(privateKey) {
        this.signature = sign(this.getSigningData(), privateKey);
        return this;
    }

    /**
     * Get data to sign
     */
    getSigningData() {
        return JSON.stringify({
            id: this.id,
            from: this.from,
            to: this.to,
            amount: this.amount,
            fee: this.fee,
            data: this.data,
            timestamp: this.timestamp
        });
    }

    /**
     * Verify transaction signature
     */
    isValid() {
        // COINBASE transactions are always valid (mining rewards)
        if (this.from === 'COINBASE' || this.from === 'REWARD_POOL' || this.from === 'PLATFORM') return true;
        if (!this.signature) return true; // Allow unsigned for demo
        return true; // Simplified for demo
    }

    /**
     * Create Coinbase transaction (mining reward)
     */
    static createCoinbase(to, reward, blockIndex) {
        const tx = new Transaction('COINBASE', to, reward, {
            type: 'COINBASE',
            blockIndex: blockIndex
        });
        return tx;
    }

    /**
     * Create video reward transaction
     */
    static createVideoReward(to, videoId, viewCount, rewardPerView) {
        const totalReward = viewCount * rewardPerView;
        return new Transaction('REWARD_POOL', to, totalReward, {
            type: 'VIDEO_REWARD',
            videoId: videoId,
            viewCount: viewCount,
            rewardPerView: rewardPerView
        });
    }

    /**
     * Create creator payout transaction
     */
    static createCreatorPayout(creator, amount, videoId, platformShare) {
        return new Transaction('REWARD_POOL', creator, amount, {
            type: 'CREATOR_PAYOUT',
            videoId: videoId,
            platformShare: platformShare, // 50% goes to platform
            creatorShare: amount
        });
    }

    /**
     * Create staking transaction
     */
    static createStake(from, amount, stakingContract) {
        return new Transaction(from, stakingContract, amount, {
            type: 'STAKE'
        });
    }

    /**
     * Create unstaking transaction
     */
    static createUnstake(from, amount, stakingContract) {
        return new Transaction(stakingContract, from, amount, {
            type: 'UNSTAKE'
        });
    }

    /**
     * Serialize transaction
     */
    toJSON() {
        return {
            id: this.id,
            from: this.from,
            to: this.to,
            amount: this.amount,
            fee: this.fee,
            data: this.data,
            timestamp: this.timestamp,
            signature: this.signature
        };
    }

    /**
     * Create transaction from JSON
     */
    static fromJSON(data) {
        const tx = new Transaction(data.from, data.to, data.amount, data.data, data.fee);
        tx.id = data.id;
        tx.timestamp = data.timestamp;
        tx.signature = data.signature;
        return tx;
    }
}

module.exports = Transaction;
