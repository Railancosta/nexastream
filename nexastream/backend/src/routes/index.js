const express = require('express');
const router = express.Router();

const usersRoutes = require('./api/users');
const videosRoutes = require('./api/videos');
const channelsRoutes = require('./api/channels');
const paymentsRoutes = require('./api/payments');
const streamingRoutes = require('./api/streaming');
const nftRoutes = require('./api/nft');
const analyticsRoutes = require('./api/analytics');

// Mount routes
router.use('/users', usersRoutes);
router.use('/videos', videosRoutes);
router.use('/channels', channelsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/streaming', streamingRoutes);
router.use('/nft', nftRoutes);
router.use('/analytics', analyticsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), version: '2.0.0' });
});

// API Info
router.get('/', (req, res) => {
  res.json({
    name: 'NexaStream API v2',
    version: '2.0.0',
    description: 'Complete backend API for NexaStream platform',
    endpoints: {
      auth: '/api/users',
      videos: '/api/videos',
      channels: '/api/channels',
      payments: '/api/payments',
      streaming: '/api/streaming',
      nft: '/api/nft',
      analytics: '/api/analytics'
    }
  });
});

module.exports = router;
