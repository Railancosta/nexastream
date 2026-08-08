/**
 * NexaStream Web3 API Routes
 * Wallet, NST Token, NFT, DAO Governance
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { web3Service, TX_TYPE, TX_STATUS } = require('../services/web3');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ============================================
// NETWORK & INFO
// ============================================

/**
 * GET /api/web3/info
 * Get network information
 */
router.get('/info', (req, res) => {
  try {
    const info = web3Service.getNetworkInfo();
    res.json(info);
  } catch (error) {
    console.error('Get network info error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/web3/health
 * Health check
 */
router.get('/health', (req, res) => {
  try {
    const health = web3Service.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WALLET
// ============================================

/**
 * POST /api/web3/wallet/create
 * Create a new wallet
 */
router.post('/wallet/create',
  authenticate,
  [
    body('type').optional().isIn(['local', 'hardware', 'multiSig']),
    body('name').optional().isString().isLength({ max: 50 })
  ],
  validate,
  (req, res) => {
    try {
      const wallet = web3Service.createWallet(req.user.id, {
        type: req.body.type,
        name: req.body.name
      });

      res.status(201).json({
        success: true,
        wallet: wallet.toJSON()
      });
    } catch (error) {
      console.error('Create wallet error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/web3/wallet/import
 * Import wallet from private key
 */
router.post('/wallet/import',
  authenticate,
  [
    body('privateKey').notEmpty().isString()
  ],
  validate,
  (req, res) => {
    try {
      const wallet = web3Service.importWallet(req.body.privateKey, req.user.id);
      
      res.status(201).json({
        success: true,
        wallet: wallet.toJSON()
      });
    } catch (error) {
      console.error('Import wallet error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/wallet
 * Get user's wallet
 */
router.get('/wallet',
  authenticate,
  (req, res) => {
    try {
      // Get first wallet for user or create one
      let wallet = web3Service.getWallet(req.user.walletAddress);
      
      if (!wallet) {
        wallet = web3Service.createWallet(req.user.id);
      }

      const balance = web3Service.getBalance(wallet.address);

      res.json({
        wallet: wallet.toJSON(),
        balance
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/wallet/balance
 * Get wallet balance
 */
router.get('/wallet/balance',
  optionalAuth,
  [
    query('address').notEmpty().isString()
  ],
  validate,
  (req, res) => {
    try {
      const balance = web3Service.getBalance(req.query.address);
      res.json(balance);
    } catch (error) {
      console.error('Get balance error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// TRANSFER
// ============================================

/**
 * POST /api/web3/transfer
 * Transfer NST tokens
 */
router.post('/transfer',
  authenticate,
  [
    body('to').notEmpty().isString(),
    body('amount').notEmpty().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const tx = await web3Service.transfer(
        wallet.address,
        req.body.to,
        req.body.amount,
        { metadata: req.body.metadata }
      );

      res.json({
        success: true,
        transaction: tx
      });
    } catch (error) {
      console.error('Transfer error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/transactions/:hash
 * Get transaction by hash
 */
router.get('/transactions/:hash',
  (req, res) => {
    try {
      const tx = web3Service.getTransaction(req.params.hash);
      
      if (!tx) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json(tx);
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/transactions
 * Get transaction history
 */
router.get('/transactions',
  optionalAuth,
  [
    query('address').notEmpty().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  (req, res) => {
    try {
      const history = web3Service.getTransactionHistory(
        req.query.address,
        {
          limit: parseInt(req.query.limit) || 50,
          offset: parseInt(req.query.offset) || 0
        }
      );

      res.json(history);
    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// STAKING
// ============================================

/**
 * POST /api/web3/stake
 * Stake NST tokens
 */
router.post('/stake',
  authenticate,
  [
    body('amount').notEmpty().isString(),
    body('duration').optional().isInt({ min: 1, max: 365 })
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const result = await web3Service.stake(
        wallet.address,
        req.body.amount,
        req.body.duration || 30
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Stake error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/web3/unstake
 * Unstake NST tokens
 */
router.post('/unstake',
  authenticate,
  [
    body('amount').notEmpty().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const result = await web3Service.unstake(wallet.address, req.body.amount);

      res.json({
        success: true,
        transaction: result
      });
    } catch (error) {
      console.error('Unstake error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/stake
 * Get stake info
 */
router.get('/stake',
  authenticate,
  (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const stakeInfo = web3Service.getStakeInfo(wallet.address);

      res.json(stakeInfo);
    } catch (error) {
      console.error('Get stake info error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// NFT
// ============================================

/**
 * POST /api/web3/nft/mint
 * Mint a new NFT
 */
router.post('/nft/mint',
  authenticate,
  [
    body('name').notEmpty().isString().isLength({ max: 100 }),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('image').optional().isString(),
    body('animation').optional().isString(),
    body('attributes').optional().isArray(),
    body('edition').optional().isIn(['single', 'multiple']),
    body('supply').optional().isInt({ min: 1 }),
    body('royalty').optional().isFloat({ min: 0, max: 15 })
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const nft = await web3Service.mintNFT(wallet.address, {
        name: req.body.name,
        description: req.body.description,
        image: req.body.image,
        animation: req.body.animation,
        attributes: req.body.attributes,
        edition: req.body.edition,
        supply: req.body.supply,
        royalty: req.body.royalty
      });

      res.status(201).json({
        success: true,
        nft
      });
    } catch (error) {
      console.error('Mint NFT error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/nft/:tokenId
 * Get NFT by token ID
 */
router.get('/nft/:tokenId',
  (req, res) => {
    try {
      const nft = web3Service.getNFT(req.params.tokenId);
      
      if (!nft) {
        return res.status(404).json({ error: 'NFT not found' });
      }

      res.json(nft);
    } catch (error) {
      console.error('Get NFT error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/nft
 * Get NFTs by owner
 */
router.get('/nft',
  optionalAuth,
  [
    query('owner').notEmpty().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  (req, res) => {
    try {
      const result = web3Service.getNFTsByOwner(req.query.owner, {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      });

      res.json(result);
    } catch (error) {
      console.error('Get NFTs error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/web3/nft/:tokenId/transfer
 * Transfer NFT
 */
router.post('/nft/:tokenId/transfer',
  authenticate,
  [
    body('to').notEmpty().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const tx = await web3Service.transferNFT(
        wallet.address,
        req.body.to,
        req.params.tokenId
      );

      res.json({
        success: true,
        transaction: tx
      });
    } catch (error) {
      console.error('Transfer NFT error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/web3/nft/:tokenId/list
 * List NFT for sale
 */
router.post('/nft/:tokenId/list',
  authenticate,
  [
    body('price').notEmpty().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const nft = await web3Service.listNFTForSale(
        req.params.tokenId,
        req.body.price,
        wallet.address
      );

      res.json({
        success: true,
        nft
      });
    } catch (error) {
      console.error('List NFT error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/web3/nft/:tokenId/buy
 * Buy NFT
 */
router.post('/nft/:tokenId/buy',
  authenticate,
  [
    body('price').notEmpty().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const result = await web3Service.buyNFT(
        req.params.tokenId,
        wallet.address,
        req.body.price
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Buy NFT error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// DAO GOVERNANCE
// ============================================

/**
 * POST /api/web3/dao/proposals
 * Create a new proposal
 */
router.post('/dao/proposals',
  authenticate,
  [
    body('title').notEmpty().isString().isLength({ max: 200 }),
    body('description').notEmpty().isString().isLength({ max: 5000 }),
    body('type').optional().isIn(['text', 'treasury', 'parameter', 'emergency']),
    body('actions').optional().isArray(),
    body('forumLink').optional().isURL(),
    body('ipfsHash').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const proposal = await web3Service.createProposal(wallet.address, {
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        actions: req.body.actions,
        forumLink: req.body.forumLink,
        ipfsHash: req.body.ipfsHash
      });

      res.status(201).json({
        success: true,
        proposal
      });
    } catch (error) {
      console.error('Create proposal error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/dao/proposals
 * Get all proposals
 */
router.get('/dao/proposals',
  [
    query('status').optional().isIn(['draft', 'active', 'passed', 'failed', 'executed', 'cancelled']),
    query('type').optional().isIn(['text', 'treasury', 'parameter', 'emergency']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  (req, res) => {
    try {
      const result = web3Service.getProposals({
        status: req.query.status,
        type: req.query.type,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      });

      res.json(result);
    } catch (error) {
      console.error('Get proposals error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/web3/dao/proposals/:id
 * Get proposal by ID
 */
router.get('/dao/proposals/:id',
  (req, res) => {
    try {
      const proposal = web3Service.getProposal(req.params.id);
      
      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      res.json(proposal);
    } catch (error) {
      console.error('Get proposal error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/web3/dao/proposals/:id/vote
 * Cast vote on proposal
 */
router.post('/dao/proposals/:id/vote',
  authenticate,
  [
    body('voteType').notEmpty().isIn(['for', 'against', 'abstain']),
    body('votingPower').notEmpty().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const wallet = web3Service.getWallet(req.user.walletAddress);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const result = await web3Service.castVote(
        wallet.address,
        req.params.id,
        req.body.voteType,
        req.body.votingPower
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Cast vote error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/web3/dao/proposals/:id/execute
 * Execute a proposal
 */
router.post('/dao/proposals/:id/execute',
  authenticate,
  async (req, res) => {
    try {
      // Check if user is authorized (admin or proposer)
      const proposal = web3Service.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      // In production, check authorization
      const result = await web3Service.executeProposal(req.params.id);

      res.json({
        success: true,
        proposal: result
      });
    } catch (error) {
      console.error('Execute proposal error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
