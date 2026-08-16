/**
 * NexaStream Web3 Service
 * Complete Web3 integration for NexaStream platform
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ============================================
// CONSTANTS
// ============================================

const CHAIN_ID = process.env.NEXACHAIN_CHAIN_ID || 1;
const NETWORK = {
  chainId: CHAIN_ID,
  chainName: 'NexaStream Mainnet',
  nativeCurrency: {
    name: 'NexaStream Token',
    symbol: 'NST',
    decimals: 18
  },
  rpcUrls: [
    process.env.NEXACHAIN_RPC_URL || 'http://localhost:8545'
  ],
  blockExplorerUrls: [
    process.env.NEXACHAIN_EXPLORER_URL || 'http://localhost:4000'
  ]
};

const MAX_SUPPLY = 55000000n * 10n ** 18n; // 55,000,000 NST

// Transaction types
const TX_TYPE = {
  TRANSFER: 0,
  STAKE: 1,
  UNSTAKE: 2,
  REWARD: 3,
  CONTRACT: 4,
  NFT_MINT: 5,
  NFT_TRANSFER: 6,
  NFT_SALE: 7,
  DAO_PROPOSAL: 8,
  DAO_VOTE: 9,
  SUPERCHAT: 10,
  GIFT: 11
};

// Transaction status
const TX_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed'
};

// ============================================
// WALLET CLASS
// ============================================

class Wallet {
  constructor(data = {}) {
    this.address = data.address || this.generateAddress();
    this.publicKey = data.publicKey;
    this.privateKey = data.privateKey; // Only for local wallets
    this.createdAt = data.createdAt || new Date();
    this.type = data.type || 'local'; // local, hardware, multiSig
    this.name = data.name;
    this.ens = data.ens;
    this.avatar = data.avatar;
    this.nickname = data.nickname;
  }

  generateAddress() {
    // Generate a random address (in production, derive from key pair)
    const bytes = crypto.randomBytes(20);
    return '0x' + bytes.toString('hex');
  }

  toJSON() {
    return {
      address: this.address,
      type: this.type,
      name: this.name,
      ens: this.ens,
      avatar: this.avatar,
      nickname: this.nickname,
      createdAt: this.createdAt
    };
  }
}

// ============================================
// TRANSACTION CLASS
// ============================================

class Transaction {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.hash = data.hash || this.generateHash();
    this.type = data.type || TX_TYPE.TRANSFER;
    this.from = data.from;
    this.to = data.to;
    this.value = BigInt(data.value || 0);
    this.data = data.data || null;
    this.gasLimit = BigInt(data.gasLimit || 21000);
    this.gasPrice = BigInt(data.gasPrice || 0);
    this.nonce = data.nonce || 0;
    this.status = data.status || TX_STATUS.PENDING;
    this.blockNumber = data.blockNumber || null;
    this.blockHash = data.blockHash || null;
    this.timestamp = data.timestamp || new Date();
    this.confirmations = data.confirmations || 0;
    this.gasUsed = data.gasUsed || null;
    this.fee = data.fee || null;
    this.error = data.error || null;
    this.metadata = data.metadata || {};
  }

  generateHash() {
    const data = `${this.from}${this.to}${this.value}${Date.now()}`;
    return '0x' + crypto.createHash('sha256').update(data).digest('hex');
  }

  calculateFee() {
    if (this.gasUsed && this.gasPrice) {
      this.fee = this.gasUsed * this.gasPrice;
    }
    return this.fee;
  }

  toJSON() {
    return {
      id: this.id,
      hash: this.hash,
      type: this.type,
      from: this.from,
      to: this.to,
      value: this.value.toString(),
      gasLimit: this.gasLimit.toString(),
      gasPrice: this.gasPrice.toString(),
      nonce: this.nonce,
      status: this.status,
      blockNumber: this.blockNumber,
      timestamp: this.timestamp,
      confirmations: this.confirmations,
      fee: this.fee?.toString(),
      error: this.error
    };
  }
}

// ============================================
// NFT CLASS
// ============================================

class NFT {
  constructor(data = {}) {
    this.tokenId = data.tokenId || uuidv4();
    this.contractAddress = data.contractAddress;
    this.owner = data.owner;
    this.creator = data.creator || data.owner;
    this.metadata = data.metadata || {};
    this.uri = data.uri;
    this.name = data.name;
    this.description = data.description;
    this.image = data.image;
    this.animation = data.animation;
    this.attributes = data.attributes || [];
    this.edition = data.edition || 'single'; // single, multiple
    this.supply = data.supply || 1;
    this.royalty = data.royalty || 0; // percentage
    this.createdAt = data.createdAt || new Date();
    this.lastSale = data.lastSale || null;
    this.auction = data.auction || null;
  }

  toJSON() {
    return {
      tokenId: this.tokenId,
      contractAddress: this.contractAddress,
      owner: this.owner,
      creator: this.creator,
      metadata: this.metadata,
      uri: this.uri,
      name: this.name,
      description: this.description,
      image: this.image,
      animation: this.animation,
      attributes: this.attributes,
      edition: this.edition,
      supply: this.supply,
      royalty: this.royalty,
      createdAt: this.createdAt,
      lastSale: this.lastSale,
      auction: this.auction
    };
  }
}

// ============================================
// DAO PROPOSAL CLASS
// ============================================

class Proposal {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.title = data.title;
    this.description = data.description;
    this.type = data.type || 'text'; // text, treasury, parameter, emergency
    this.status = data.status || 'active'; // draft, active, passed, failed, executed, cancelled
    this.author = data.author;
    this.votes = {
      for: BigInt(data.votesFor || 0),
      against: BigInt(data.votesAgainst || 0),
      abstain: BigInt(data.votesAbstain || 0)
    };
    this.quorum = data.quorum || 1000000n * 10n ** 18n; // 1M NST
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    this.executionDelay = data.executionDelay || 2 * 24 * 60 * 60 * 1000; // 2 days
    this.executedAt = data.executedAt || null;
    this.executedTx = data.executedTx || null;
    this.cancelReason = data.cancelReason || null;
    this.forumLink = data.forumLink;
    this.ipfsHash = data.ipfsHash;
    this.actions = data.actions || []; // [{to, value, data}]
    this.createdAt = data.createdAt || new Date();
  }

  isPassed() {
    const now = new Date();
    if (now < this.endTime) return false;
    
    const totalVotes = this.votes.for + this.votes.against + this.votes.abstain;
    if (totalVotes < this.quorum) return false;
    
    // Simple majority for now
    return this.votes.for > this.votes.against;
  }

  canExecute() {
    if (!this.isPassed()) return false;
    if (this.status === 'executed') return false;
    
    const now = Date.now();
    const executeTime = this.endTime.getTime() + this.executionDelay;
    
    return now >= executeTime;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type,
      status: this.status,
      author: this.author,
      votes: {
        for: this.votes.for.toString(),
        against: this.votes.against.toString(),
        abstain: this.votes.abstain.toString()
      },
      quorum: this.quorum.toString(),
      startTime: this.startTime,
      endTime: this.endTime,
      isPassed: this.isPassed(),
      canExecute: this.canExecute(),
      executedAt: this.executedAt,
      actions: this.actions,
      createdAt: this.createdAt
    };
  }
}

// ============================================
// WEB3 SERVICE
// ============================================

class Web3Service extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Blockchain
      chainId: config.chainId || CHAIN_ID,
      network: config.network || NETWORK,
      rpcUrl: config.rpcUrl || process.env.NEXACHAIN_RPC_URL || 'http://localhost:8545',
      wsUrl: config.wsUrl || process.env.NEXACHAIN_WS_URL || 'ws://localhost:8546',
      
      // Contracts (mock addresses for now)
      nstTokenAddress: config.nstTokenAddress || process.env.NST_TOKEN_ADDRESS,
      stakingAddress: config.stakingAddress || process.env.STAKING_ADDRESS,
      nftAddress: config.nftAddress || process.env.NFT_ADDRESS,
      daoAddress: config.daoAddress || process.env.DAO_ADDRESS,
      
      // Features
      enableStaking: config.enableStaking !== false,
      enableNFT: config.enableNFT !== false,
      enableDAO: config.enableDAO !== false,
      
      // Fees
      baseFee: config.baseFee || 0n, // Zero gas for NexaStream
      minTip: config.minTip || 0n,
      
      // NFT
      mintingFee: config.mintingFee || 0n,
      royaltyPercentage: config.royaltyPercentage || 2.5,
      
      // DAO
      proposalDeposit: config.proposalDeposit || 1000n * 10n ** 18n, // 1000 NST
      votingPeriod: config.votingPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
      executionDelay: config.executionDelay || 2 * 24 * 60 * 60 * 1000 // 2 days
    };

    // State
    this.wallets = new Map(); // address -> Wallet
    this.transactions = new Map(); // txHash -> Transaction
    this.nfts = new Map(); // tokenId -> NFT
    this.userNfts = new Map(); // userAddress -> NFT[]
    this.proposals = new Map(); // proposalId -> Proposal
    this.stakes = new Map(); // userAddress -> StakeInfo
    this.balances = new Map(); // address -> balance
    
    // Nonces
    this.nonces = new Map(); // address -> nonce
    
    // Initialize genesis balances
    this.initializeGenesis();
  }

  initializeGenesis() {
    // Initialize with some test addresses for development
    const testAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    ];
    
    for (const addr of testAddresses) {
      this.balances.set(addr.toLowerCase(), 1000000n * 10n ** 18n); // 1M NST each
    }
  }

  // ============================================
  // WALLET METHODS
  // ============================================

  /**
   * Create a new wallet
   */
  createWallet(userId, options = {}) {
    const wallet = new Wallet({
      type: options.type || 'local',
      name: options.name
    });

    // Generate initial balance from faucet for testnet
    if (this.config.chainId !== 1) { // Not mainnet
      this.balances.set(wallet.address.toLowerCase(), 10000n * 10n ** 18n); // 10,000 NST
    }

    this.wallets.set(wallet.address.toLowerCase(), wallet);
    this.nonces.set(wallet.address.toLowerCase(), 0);

    this.emit('wallet:created', wallet.toJSON());

    return wallet;
  }

  /**
   * Get wallet by address
   */
  getWallet(address) {
    return this.wallets.get(address.toLowerCase());
  }

  /**
   * Get all wallets for a user
   */
  getUserWallets(userId) {
    const userWallets = [];
    for (const wallet of this.wallets.values()) {
      if (wallet.userId === userId) {
        userWallets.push(wallet.toJSON());
      }
    }
    return userWallets;
  }

  /**
   * Import wallet from private key
   */
  importWallet(privateKey, userId) {
    // In production, validate and derive address from private key
    const address = '0x' + crypto.createHash('sha256').update(privateKey).digest('hex').slice(0, 40);
    
    const wallet = new Wallet({
      address,
      privateKey,
      type: 'imported'
    });

    this.wallets.set(address.toLowerCase(), wallet);
    this.nonces.set(address.toLowerCase(), 0);

    return wallet;
  }

  // ============================================
  // BALANCE & TRANSFER METHODS
  // ============================================

  /**
   * Get NST balance
   */
  getBalance(address) {
    const balance = this.balances.get(address.toLowerCase()) || 0n;
    return {
      balance: balance.toString(),
      formatted: this.formatUnits(balance, 18),
      symbol: 'NST',
      decimals: 18
    };
  }

  /**
   * Transfer NST
   */
  async transfer(from, to, amount, options = {}) {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    // Get balances
    const fromBalance = this.balances.get(fromLower) || 0n;
    const amountBig = BigInt(amount);

    // Check balance
    if (fromBalance < amountBig) {
      throw new Error('Insufficient balance');
    }

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.TRANSFER,
      from,
      to,
      value: amount,
      gasPrice: this.config.baseFee,
      nonce: this.nonces.get(fromLower) || 0,
      metadata: options.metadata || {}
    });

    // Deduct balance
    this.balances.set(fromLower, fromBalance - amountBig);

    // Add to recipient
    const toBalance = this.balances.get(toLower) || 0n;
    this.balances.set(toLower, toBalance + amountBig);

    // Increment nonce
    this.nonces.set(fromLower, (this.nonces.get(fromLower) || 0) + 1);

    // Confirm transaction (simulate block inclusion)
    tx.status = TX_STATUS.CONFIRMED;
    tx.blockNumber = Math.floor(Math.random() * 1000000);
    tx.confirmations = 1;

    // Store transaction
    this.transactions.set(tx.hash.toLowerCase(), tx);

    this.emit('transfer', tx.toJSON());
    this.emit('transaction:confirmed', tx.toJSON());

    return tx.toJSON();
  }

  /**
   * Format units
   */
  formatUnits(value, decimals = 18) {
    const divisor = 10n ** BigInt(decimals);
    const integer = value / divisor;
    const fraction = value % divisor;
    return `${integer}.${fraction.toString().padStart(decimals, '0')}`.replace(/\.?0+$/, '');
  }

  /**
   * Parse units
   */
  parseUnits(value, decimals = 18) {
    const [integer, fraction = '0'] = value.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(integer + paddedFraction);
  }

  // ============================================
  // TRANSACTION METHODS
  // ============================================

  /**
   * Get transaction by hash
   */
  getTransaction(hash) {
    return this.transactions.get(hash.toLowerCase())?.toJSON() || null;
  }

  /**
   * Get transaction history for address
   */
  getTransactionHistory(address, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const addressLower = address.toLowerCase();
    
    const txs = Array.from(this.transactions.values())
      .filter(tx => tx.from?.toLowerCase() === addressLower || tx.to?.toLowerCase() === addressLower)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit)
      .map(tx => tx.toJSON());

    return {
      transactions: txs,
      total: txs.length
    };
  }

  /**
   * Get pending transactions
   */
  getPendingTransactions(address) {
    const addressLower = address.toLowerCase();
    
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === TX_STATUS.PENDING && 
        (tx.from?.toLowerCase() === addressLower || tx.to?.toLowerCase() === addressLower))
      .map(tx => tx.toJSON());
  }

  // ============================================
  // STAKING METHODS
  // ============================================

  /**
   * Stake NST
   */
  async stake(address, amount, duration = 30) {
    const addressLower = address.toLowerCase();
    const amountBig = BigInt(amount);

    // Check balance
    const balance = this.balances.get(addressLower) || 0n;
    if (balance < amountBig) {
      throw new Error('Insufficient balance');
    }

    // Create stake info
    const stakeInfo = {
      amount: amountBig,
      startTime: Date.now(),
      duration: duration * 24 * 60 * 60 * 1000, // days to ms
      rewards: 0n,
      withdrawn: false
    };

    // Lock tokens
    this.balances.set(addressLower, balance - amountBig);
    
    // Store stake
    const userStakes = this.stakes.get(addressLower) || [];
    userStakes.push(stakeInfo);
    this.stakes.set(addressLower, userStakes);

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.STAKE,
      from: address,
      to: this.config.stakingAddress,
      value: amount
    });
    tx.status = TX_STATUS.CONFIRMED;
    this.transactions.set(tx.hash.toLowerCase(), tx);

    this.emit('stake', { address, amount: amountBig.toString(), duration });
    return {
      ...tx.toJSON(),
      stakeInfo: {
        amount: stakeInfo.amount.toString(),
        startTime: stakeInfo.startTime,
        duration: stakeInfo.duration,
        endTime: stakeInfo.startTime + stakeInfo.duration
      }
    };
  }

  /**
   * Unstake NST
   */
  async unstake(address, amount) {
    const addressLower = address.toLowerCase();
    const amountBig = BigInt(amount);

    // Find and update stake
    const userStakes = this.stakes.get(addressLower) || [];
    let found = false;
    let unstakedAmount = 0n;

    for (const stake of userStakes) {
      if (!stake.withdrawn && stake.amount >= amountBig) {
        // Calculate rewards (simplified APY calculation)
        const stakingDays = (Date.now() - stake.startTime) / (24 * 60 * 60 * 1000);
        const apy = 0.12; // 12% APY
        const rewards = (stake.amount * BigInt(Math.floor(apy * stakingDays * 100))) / (100n * 365n);
        
        stake.withdrawn = true;
        found = true;

        // Return tokens + rewards
        const totalReturn = stake.amount + rewards;
        const currentBalance = this.balances.get(addressLower) || 0n;
        this.balances.set(addressLower, currentBalance + totalReturn);

        unstakedAmount = totalReturn;
        break;
      }
    }

    if (!found) {
      throw new Error('No eligible stake found');
    }

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.UNSTAKE,
      from: this.config.stakingAddress,
      to: address,
      value: unstakedAmount.toString()
    });
    tx.status = TX_STATUS.CONFIRMED;
    this.transactions.set(tx.hash.toLowerCase(), tx);

    this.emit('unstake', { address, amount: unstakedAmount.toString() });
    return tx.toJSON();
  }

  /**
   * Get stake info
   */
  getStakeInfo(address) {
    const addressLower = address.toLowerCase();
    const userStakes = this.stakes.get(addressLower) || [];
    const activeStakes = userStakes.filter(s => !s.withdrawn);

    let totalStaked = 0n;
    let pendingRewards = 0n;

    for (const stake of activeStakes) {
      totalStaked += stake.amount;
      
      // Calculate pending rewards
      const stakingDays = (Date.now() - stake.startTime) / (24 * 60 * 60 * 1000);
      const apy = 0.12;
      pendingRewards += (stake.amount * BigInt(Math.floor(apy * stakingDays * 100))) / (100n * 365n);
    }

    return {
      totalStaked: totalStaked.toString(),
      pendingRewards: pendingRewards.toString(),
      activeStakes: activeStakes.length,
      stakes: activeStakes.map(s => ({
        amount: s.amount.toString(),
        startTime: s.startTime,
        duration: s.duration,
        endTime: s.startTime + s.duration,
        rewards: s.rewards.toString()
      }))
    };
  }

  // ============================================
  // NFT METHODS
  // ============================================

  /**
   * Mint NFT
   */
  async mintNFT(creator, options = {}) {
    const creatorLower = creator.toLowerCase();
    const nft = new NFT({
      owner: creator,
      creator: creator,
      name: options.name,
      description: options.description,
      image: options.image,
      animation: options.animation,
      attributes: options.attributes || [],
      edition: options.edition || 'single',
      supply: options.supply || 1,
      royalty: options.royalty || this.config.royaltyPercentage,
      metadata: options.metadata || {}
    });

    // Store NFT
    this.nfts.set(nft.tokenId, nft);

    // Update user NFTs
    const userNfts = this.userNfts.get(creatorLower) || [];
    userNfts.push(nft);
    this.userNfts.set(creatorLower, userNfts);

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.NFT_MINT,
      from: creator,
      to: nft.tokenId,
      value: this.config.mintingFee.toString(),
      metadata: { tokenId: nft.tokenId }
    });
    tx.status = TX_STATUS.CONFIRMED;
    this.transactions.set(tx.hash.toLowerCase(), tx);

    this.emit('nft:minted', nft.toJSON());
    return nft.toJSON();
  }

  /**
   * Transfer NFT
   */
  async transferNFT(from, to, tokenId) {
    const nft = this.nfts.get(tokenId);
    if (!nft) {
      throw new Error('NFT not found');
    }

    if (nft.owner !== from) {
      throw new Error('Not the owner');
    }

    // Update owner
    nft.owner = to;

    // Update user NFT lists
    const fromNfts = this.userNfts.get(from.toLowerCase()) || [];
    const toNfts = this.userNfts.get(to.toLowerCase()) || [];
    
    this.userNfts.set(from.toLowerCase(), fromNfts.filter(n => n.tokenId !== tokenId));
    toNfts.push(nft);
    this.userNfts.set(to.toLowerCase(), toNfts);

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.NFT_TRANSFER,
      from,
      to,
      value: '0',
      metadata: { tokenId }
    });
    tx.status = TX_STATUS.CONFIRMED;
    this.transactions.set(tx.hash.toLowerCase(), tx);

    this.emit('nft:transferred', { tokenId, from, to });
    return tx.toJSON();
  }

  /**
   * Get NFT by token ID
   */
  getNFT(tokenId) {
    return this.nfts.get(tokenId)?.toJSON() || null;
  }

  /**
   * Get NFTs by owner
   */
  getNFTsByOwner(address, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const userNfts = this.userNfts.get(address.toLowerCase()) || [];
    
    return {
      nfts: userNfts.slice(offset, offset + limit).map(n => n.toJSON()),
      total: userNfts.length
    };
  }

  /**
   * List NFT for sale
   */
  async listNFTForSale(tokenId, price, seller) {
    const nft = this.nfts.get(tokenId);
    if (!nft) {
      throw new Error('NFT not found');
    }

    nft.auction = {
      listingId: uuidv4(),
      price: BigInt(price),
      seller,
      listedAt: Date.now(),
      active: true
    };

    this.emit('nft:listed', { tokenId, price });
    return nft.toJSON();
  }

  /**
   * Buy NFT
   */
  async buyNFT(tokenId, buyer, price) {
    const nft = this.nfts.get(tokenId);
    if (!nft || !nft.auction || !nft.auction.active) {
      throw new Error('NFT not for sale');
    }

    const priceBig = BigInt(price);
    if (priceBig !== nft.auction.price) {
      throw new Error('Price mismatch');
    }

    const buyerBalance = this.balances.get(buyer.toLowerCase()) || 0n;
    if (buyerBalance < priceBig) {
      throw new Error('Insufficient balance');
    }

    // Calculate royalties
    const royaltyAmount = (priceBig * BigInt(nft.royalty * 100)) / 10000n;
    const sellerAmount = priceBig - royaltyAmount;

    // Transfer funds
    this.balances.set(buyer.toLowerCase(), buyerBalance - priceBig);
    
    const sellerBalance = this.balances.get(nft.auction.seller.toLowerCase()) || 0n;
    this.balances.set(nft.auction.seller.toLowerCase(), sellerBalance + sellerAmount);

    // Transfer NFT
    const previousOwner = nft.owner;
    nft.owner = buyer;
    nft.auction.active = false;
    nft.lastSale = {
      price: priceBig.toString(),
      buyer,
      seller: previousOwner,
      timestamp: Date.now()
    };

    // Update user NFT lists
    const prevUserNfts = this.userNfts.get(previousOwner.toLowerCase()) || [];
    const buyerNfts = this.userNfts.get(buyer.toLowerCase()) || [];
    
    this.userNfts.set(previousOwner.toLowerCase(), prevUserNfts.filter(n => n.tokenId !== tokenId));
    buyerNfts.push(nft);
    this.userNfts.set(buyer.toLowerCase(), buyerNfts);

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.NFT_SALE,
      from: buyer,
      to: previousOwner,
      value: price,
      metadata: { tokenId, royalty: royaltyAmount.toString() }
    });
    tx.status = TX_STATUS.CONFIRMED;
    this.transactions.set(tx.hash.toLowerCase(), tx);

    this.emit('nft:sold', { tokenId, buyer, price });
    return { tx: tx.toJSON(), nft: nft.toJSON() };
  }

  // ============================================
  // DAO METHODS
  // ============================================

  /**
   * Create proposal
   */
  async createProposal(author, options = {}) {
    const authorBalance = this.balances.get(author.toLowerCase()) || 0n;
    
    if (authorBalance < this.config.proposalDeposit) {
      throw new Error('Insufficient deposit. Need 1000 NST to create proposal.');
    }

    // Deduct deposit
    this.balances.set(author.toLowerCase(), authorBalance - this.config.proposalDeposit);

    const proposal = new Proposal({
      title: options.title,
      description: options.description,
      type: options.type || 'text',
      author,
      actions: options.actions || [],
      startTime: new Date(),
      endTime: new Date(Date.now() + this.config.votingPeriod),
      quorum: options.quorum,
      forumLink: options.forumLink,
      ipfsHash: options.ipfsHash
    });

    this.proposals.set(proposal.id, proposal);

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.DAO_PROPOSAL,
      from: author,
      to: this.config.daoAddress,
      value: this.config.proposalDeposit.toString(),
      metadata: { proposalId: proposal.id }
    });
    tx.status = TX_STATUS.CONFIRMED;
    this.transactions.set(tx.hash.toLowerCase(), tx);

    this.emit('proposal:created', proposal.toJSON());
    return proposal.toJSON();
  }

  /**
   * Cast vote
   */
  async castVote(voter, proposalId, voteType, votingPower) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'active') {
      throw new Error('Voting is not active');
    }

    const now = Date.now();
    if (now < proposal.startTime.getTime() || now > proposal.endTime.getTime()) {
      throw new Error('Voting period has ended');
    }

    const votePower = BigInt(votingPower);

    switch (voteType) {
      case 'for':
        proposal.votes.for += votePower;
        break;
      case 'against':
        proposal.votes.against += votePower;
        break;
      case 'abstain':
        proposal.votes.abstain += votePower;
        break;
      default:
        throw new Error('Invalid vote type');
    }

    // Create transaction
    const tx = new Transaction({
      type: TX_TYPE.DAO_VOTE,
      from: voter,
      to: this.config.daoAddress,
      value: '0',
      metadata: { proposalId, voteType, votingPower: votePower.toString() }
    });
    tx.status = TX_STATUS.CONFIRMED;
    this.transactions.set(tx.hash.toLowerCase(), tx);

    this.emit('proposal:voted', { proposalId, voter, voteType, votePower: votePower.toString() });
    return { votes: proposal.votes, tx: tx.toJSON() };
  }

  /**
   * Execute proposal
   */
  async executeProposal(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (!proposal.canExecute()) {
      throw new Error('Proposal cannot be executed');
    }

    // Execute actions
    for (const action of proposal.actions) {
      if (action.value && action.value > 0) {
        // Transfer funds (simplified)
        const toBalance = this.balances.get(action.to.toLowerCase()) || 0n;
        this.balances.set(action.to.toLowerCase(), toBalance + BigInt(action.value));
      }
    }

    proposal.status = 'executed';
    proposal.executedAt = new Date();
    proposal.executedTx = uuidv4();

    this.emit('proposal:executed', proposal.toJSON());
    return proposal.toJSON();
  }

  /**
   * Get proposal
   */
  getProposal(proposalId) {
    return this.proposals.get(proposalId)?.toJSON() || null;
  }

  /**
   * Get all proposals
   */
  getProposals(options = {}) {
    const { status, type, limit = 50, offset = 0 } = options;
    
    let proposals = Array.from(this.proposals.values());

    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }
    if (type) {
      proposals = proposals.filter(p => p.type === type);
    }

    proposals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      proposals: proposals.slice(offset, offset + limit).map(p => p.toJSON()),
      total: proposals.length
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get network info
   */
  getNetworkInfo() {
    let totalSupply = 0n;
    for (const balance of this.balances.values()) {
      totalSupply += balance;
    }

    return {
      chainId: this.config.chainId,
      chainName: this.config.network.chainName,
      nativeCurrency: this.config.network.nativeCurrency,
      rpcUrls: this.config.network.rpcUrls,
      blockExplorerUrls: this.config.network.blockExplorerUrls,
      maxSupply: MAX_SUPPLY.toString(),
      totalSupply: totalSupply.toString(),
      circulatingSupply: (totalSupply - this.getLockedSupply()).toString()
    };
  }

  /**
   * Get locked supply (stakes, treasury, etc.)
   */
  getLockedSupply() {
    let locked = 0n;
    
    // Add stakes
    for (const stakes of this.stakes.values()) {
      for (const stake of stakes) {
        if (!stake.withdrawn) {
          locked += stake.amount;
        }
      }
    }
    
    return locked;
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      healthy: true,
      chainId: this.config.chainId,
      connected: true,
      timestamp: new Date()
    };
  }
}

// Export
const web3Service = new Web3Service();

module.exports = {
  Web3Service,
  web3Service,
  Wallet,
  Transaction,
  NFT,
  Proposal,
  TX_TYPE,
  TX_STATUS,
  CHAIN_ID,
  NETWORK,
  MAX_SUPPLY
};
