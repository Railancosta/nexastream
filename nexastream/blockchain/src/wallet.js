/**
 * NexaChain Wallet
 */

const { generateKeyPair, getAddress, sign, verify } = require('./crypto');
const Transaction = require('./transaction');

class Wallet {
    constructor(keyPair = null) {
        if (keyPair) {
            this.privateKey = keyPair.privateKey;
            this.publicKey = keyPair.publicKey;
        } else {
            const keys = generateKeyPair();
            this.privateKey = keys.privateKey;
            this.publicKey = keys.publicKey;
        }
        this.address = getAddress(this.publicKey);
    }

    /**
     * Get address
     */
    getAddress() {
        return this.address;
    }

    /**
     * Get balance (needs blockchain reference)
     */
    getBalance(blockchain) {
        return blockchain.getBalance(this.address);
    }

    /**
     * Create transaction
     */
    createTransaction(to, amount, data = {}, fee = 0.01) {
        const tx = new Transaction(this.address, to, amount, data, fee);
        tx.sign(this.privateKey);
        return tx;
    }

    /**
     * Create video reward transaction
     */
    createVideoReward(to, videoId, viewCount, rewardPerView) {
        const reward = viewCount * rewardPerView;
        return this.createTransaction(to, reward, {
            type: 'VIDEO_REWARD',
            videoId: videoId,
            viewCount: viewCount
        });
    }

    /**
     * Create creator payout (50% creator, 50% platform)
     */
    createCreatorPayout(creator, totalAmount, videoId, platformOwner) {
        const creatorShare = totalAmount * 0.5;
        const platformShare = totalAmount * 0.5;
        
        // Creator transaction
        const creatorTx = this.createTransaction(creator, creatorShare, {
            type: 'CREATOR_PAYOUT',
            videoId: videoId,
            share: '50%'
        });
        
        // Platform owner transaction
        const platformTx = this.createTransaction(platformOwner, platformShare, {
            type: 'PLATFORM_REVENUE',
            videoId: videoId,
            share: '50%'
        });
        
        return [creatorTx, platformTx];
    }

    /**
     * Create staking transaction
     */
    createStake(amount, stakingContract) {
        return this.createTransaction(stakingContract, amount, {
            type: 'STAKE'
        });
    }

    /**
     * Export wallet info
     */
    export() {
        return {
            address: this.address,
            privateKey: this.privateKey,
            publicKey: this.publicKey
        };
    }

    /**
     * Import wallet from private key
     */
    static import(privateKey) {
        const keys = { privateKey, publicKey: '' };
        const EC = require('elliptic').ec;
        const ec = new EC('secp256k1');
        
        try {
            const keyPair = ec.keyFromPrivate(privateKey);
            keys.publicKey = keyPair.getPublic('hex');
            return new Wallet(keys);
        } catch (e) {
            throw new Error('Invalid private key');
        }
    }

    /**
     * Get wallet info (safe for display)
     */
    getInfo() {
        return {
            address: this.address,
            shortAddress: this.address.substring(0, 8) + '...' + this.address.substring(36),
            publicKey: this.publicKey.substring(0, 32) + '...'
        };
    }
}

module.exports = Wallet;
