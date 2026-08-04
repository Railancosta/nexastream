const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { NFT, Video, Channel, User, Transaction } = require('../../models');
const { auth, optionalAuth } = require('../../middleware');

// GET ALL NFTs
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, sort = 'recent', search } = req.query;
    
    const where = { status: { [Op.in]: ['listed', 'minting'] } };
    if (search) where.title = { [Op.iLike]: `%${search}%` };
    
    const order = sort === 'price_low' ? [['price', 'ASC']] : sort === 'price_high' ? [['price', 'DESC']] : [['createdAt', 'DESC']];
    
    const { rows: nfts, count } = await NFT.findAndCountAll({
      where,
      include: [
        { model: User, as: 'owner', attributes: ['id', 'username', 'avatar'] },
        { model: Channel, as: 'creator', attributes: ['id', 'username', 'displayName', 'avatar'] }
      ],
      order, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({ nfts, total: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch NFTs' });
  }
});

// GET FEATURED NFTs
router.get('/featured', async (req, res) => {
  try {
    const nfts = await NFT.findAll({
      where: { status: 'listed' },
      order: [['views', 'DESC']],
      limit: 10,
      include: [{ model: Channel, as: 'creator' }]
    });
    res.json({ nfts });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET SINGLE NFT
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const nft = await NFT.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'username', 'avatar'] },
        { model: Channel, as: 'creator', attributes: ['id', 'username', 'displayName'] },
        { model: Video, as: 'video', attributes: ['id', 'title', 'thumbnail'] }
      ]
    });
    
    if (!nft) return res.status(404).json({ error: 'NFT not found' });
    
    await nft.increment('views');
    res.json({ nft });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// MINT NFT
router.post('/mint', auth, async (req, res) => {
  try {
    const { title, description, image, animationUrl, price, royalties, videoId } = req.body;
    
    const nft = await NFT.create({
      creatorId: req.user.userId, ownerId: req.user.userId, title,
      description, image, animationUrl, price, royalties: royalties || 10,
      videoId, status: 'minting', contractAddress: process.env.NFT_CONTRACT || '0x...'
    });
    
    res.status(201).json({ success: true, nft });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mint NFT' });
  }
});

// LIST NFT FOR SALE
router.post('/:id/list', auth, async (req, res) => {
  try {
    const { price } = req.body;
    const nft = await NFT.findByPk(req.params.id);
    
    if (!nft) return res.status(404).json({ error: 'NFT not found' });
    if (nft.ownerId !== req.user.userId) return res.status(403).json({ error: 'Not your NFT' });
    
    await nft.update({ price, status: 'listed' });
    
    res.json({ success: true, nft });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// BUY NFT
router.post('/:id/buy', auth, async (req, res) => {
  try {
    const nft = await NFT.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner' }]
    });
    
    if (!nft || nft.status !== 'listed') return res.status(404).json({ error: 'NFT not for sale' });
    if (nft.ownerId === req.user.userId) return res.status(400).json({ error: 'Already owned' });
    
    // Process payment
    const tx = await Transaction.create({
      userId: req.user.userId, type: 'purchase', amount: nft.price,
      currency: nft.currency || 'NEXA', status: 'completed',
      metadata: { nftId: nft.id }
    });
    
    // Transfer ownership
    await nft.update({ ownerId: req.user.userId, status: 'sold' });
    
    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// GET USER NFTs
router.get('/user/:userId/owned', async (req, res) => {
  try {
    const nfts = await NFT.findAll({
      where: { ownerId: req.params.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json({ nfts });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET CREATED NFTs
router.get('/user/:userId/created', async (req, res) => {
  try {
    const nfts = await NFT.findAll({
      where: { creatorId: req.params.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json({ nfts });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// LIKE NFT
router.post('/:id/like', auth, async (req, res) => {
  try {
    const nft = await NFT.findByPk(req.params.id);
    if (!nft) return res.status(404).json({ error: 'NFT not found' });
    
    await nft.increment('likes');
    res.json({ success: true, likes: nft.likes + 1 });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
