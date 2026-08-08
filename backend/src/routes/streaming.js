/**
 * NexaStream Streaming API Routes
 * Live streaming, VOD, chat, super chats
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { streamingService, STREAM_STATUS, TRANSCODE_STATUS } = require('../services/streaming');
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
// LIVE STREAM ROUTES
// ============================================

/**
 * POST /api/streaming/streams
 * Create a new live stream
 */
router.post('/streams',
  authenticate,
  [
    body('title').notEmpty().isString().isLength({ max: 200 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('category').optional().isString(),
    body('visibility').optional().isIn(['public', 'unlisted', 'private']),
    body('quality').optional().isIn(['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '4k']),
    body('latency').optional().isIn(['ultra_low', 'low', 'normal']),
    body('recordingEnabled').optional().isBoolean(),
    body('chatEnabled').optional().isBoolean(),
    body('tags').optional().isArray()
  ],
  validate,
  (req, res) => {
    try {
      const stream = streamingService.createLiveStream({
        userId: req.user.id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        visibility: req.body.visibility,
        quality: req.body.quality,
        latency: req.body.latency,
        recordingEnabled: req.body.recordingEnabled,
        chatEnabled: req.body.chatEnabled,
        tags: req.body.tags
      });

      res.status(201).json({
        success: true,
        stream: stream.toJSON()
      });
    } catch (error) {
      console.error('Create stream error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/streaming/streams
 * Get all active streams
 */
router.get('/streams',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString()
  ],
  validate,
  (req, res) => {
    try {
      let streams = streamingService.getActiveStreams();

      // Filter by category
      if (req.query.category) {
        streams = streams.filter(s => s.category === req.query.category);
      }

      // Sort by viewer count
      streams.sort((a, b) => b.viewerCount - a.viewerCount);

      // Limit
      const limit = parseInt(req.query.limit) || 20;
      streams = streams.slice(0, limit);

      res.json({
        streams,
        total: streams.length
      });
    } catch (error) {
      console.error('Get streams error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/streaming/streams/trending
 * Get trending streams
 */
router.get('/streams/trending',
  [
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validate,
  (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const streams = streamingService.getTrendingStreams(limit);

      res.json({
        streams,
        total: streams.length
      });
    } catch (error) {
      console.error('Get trending streams error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/streaming/streams/:streamId
 * Get stream details
 */
router.get('/streams/:streamId',
  optionalAuth,
  (req, res) => {
    try {
      const stream = streamingService.getStream(req.params.streamId);

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      // Check visibility for private/unlisted
      if (stream.visibility === 'private' && (!req.user || req.user.id !== stream.userId)) {
        return res.status(403).json({ error: 'This stream is private' });
      }

      res.json(stream.toJSON());
    } catch (error) {
      console.error('Get stream error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /api/streaming/streams/:streamId
 * Update stream info
 */
router.patch('/streams/:streamId',
  authenticate,
  [
    body('title').optional().isString().isLength({ max: 200 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('category').optional().isString(),
    body('tags').optional().isArray()
  ],
  validate,
  (req, res) => {
    try {
      const stream = streamingService.getStream(req.params.streamId);

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      if (stream.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const updated = streamingService.updateStream(req.params.streamId, req.body);

      res.json({
        success: true,
        stream: updated.toJSON()
      });
    } catch (error) {
      console.error('Update stream error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/streaming/streams/:streamId
 * Delete/end a stream
 */
router.delete('/streams/:streamId',
  authenticate,
  (req, res) => {
    try {
      const stream = streamingService.getStream(req.params.streamId);

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      if (stream.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const ended = streamingService.endLiveStream(req.params.streamId);

      res.json({
        success: true,
        stream: ended.toJSON()
      });
    } catch (error) {
      console.error('Delete stream error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/streams/:streamId/go-live
 * Start streaming (user goes live)
 */
router.post('/streams/:streamId/go-live',
  authenticate,
  (req, res) => {
    try {
      const stream = streamingService.getStream(req.params.streamId);

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      if (stream.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const live = streamingService.startLiveStream(req.params.streamId);

      res.json({
        success: true,
        stream: live.toJSON()
      });
    } catch (error) {
      console.error('Go live error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/streams/:streamId/end
 * End stream
 */
router.post('/streams/:streamId/end',
  authenticate,
  (req, res) => {
    try {
      const stream = streamingService.getStream(req.params.streamId);

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      if (stream.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const ended = streamingService.endLiveStream(req.params.streamId);

      res.json({
        success: true,
        stream: ended.toJSON()
      });
    } catch (error) {
      console.error('End stream error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// VIEWER ROUTES
// ============================================

/**
 * POST /api/streaming/streams/:streamId/join
 * Join a stream as viewer
 */
router.post('/streams/:streamId/join',
  optionalAuth,
  [
    body('peerId').notEmpty().isString()
  ],
  validate,
  (req, res) => {
    try {
      const { peerId } = req.body;
      const result = streamingService.joinStream(req.params.streamId, peerId);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Join stream error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/streams/:streamId/leave
 * Leave a stream
 */
router.post('/streams/:streamId/leave',
  optionalAuth,
  [
    body('peerId').notEmpty().isString()
  ],
  validate,
  (req, res) => {
    try {
      streamingService.leaveStream(req.params.streamId, req.body.peerId);

      res.json({ success: true });
    } catch (error) {
      console.error('Leave stream error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/streaming/streams/:streamId/viewers
 * Get viewer count
 */
router.get('/streams/:streamId/viewers',
  (req, res) => {
    try {
      const count = streamingService.getViewerCount(req.params.streamId);

      res.json({ viewerCount: count });
    } catch (error) {
      console.error('Get viewers error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// CHAT ROUTES
// ============================================

/**
 * GET /api/streaming/streams/:streamId/chat
 * Get chat history
 */
router.get('/streams/:streamId/chat',
  [
    query('limit').optional().isInt({ min: 1, max: 500 })
  ],
  validate,
  (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const messages = streamingService.getChatHistory(req.params.streamId, limit);

      res.json({ messages });
    } catch (error) {
      console.error('Get chat error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/streams/:streamId/chat
 * Send chat message
 */
router.post('/streams/:streamId/chat',
  authenticate,
  [
    body('content').notEmpty().isString().isLength({ max: 500 }),
    body('type').optional().isIn(['message', 'reply'])
  ],
  validate,
  (req, res) => {
    try {
      const message = streamingService.sendChatMessage(req.params.streamId, {
        userId: req.user.id,
        username: req.user.username,
        content: req.body.content,
        type: req.body.type,
        isOwner: req.user.id === req.params.streamId // Check if user is streamer
      });

      res.status(201).json({
        success: true,
        message
      });
    } catch (error) {
      console.error('Send chat error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/streaming/streams/:streamId/chat/:messageId
 * Delete chat message (moderator only)
 */
router.delete('/streams/:streamId/chat/:messageId',
  authenticate,
  (req, res) => {
    try {
      const stream = streamingService.getStream(req.params.streamId);

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      // Only streamer or admins can delete
      if (stream.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const deleted = streamingService.deleteChatMessage(
        req.params.streamId,
        req.params.messageId
      );

      res.json({ success: deleted });
    } catch (error) {
      console.error('Delete chat error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/streams/:streamId/chat/timeout
 * Timeout a user (moderator only)
 */
router.post('/streams/:streamId/chat/timeout',
  authenticate,
  [
    body('userId').notEmpty().isString(),
    body('duration').optional().isInt({ min: 1, max: 86400 })
  ],
  validate,
  (req, res) => {
    try {
      const stream = streamingService.getStream(req.params.streamId);

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      if (stream.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const timeout = streamingService.timeoutUser(
        req.params.streamId,
        req.body.userId,
        req.body.duration || 600
      );

      res.json({ success: true, ...timeout });
    } catch (error) {
      console.error('Timeout user error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/streams/:streamId/chat/ban
 * Ban a user (moderator only)
 */
router.post('/streams/:streamId/chat/ban',
  authenticate,
  [
    body('userId').notEmpty().isString()
  ],
  validate,
  (req, res) => {
    try {
      const stream = streamingService.getStream(req.params.streamId);

      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      if (stream.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const banned = streamingService.banUser(req.params.streamId, req.body.userId);

      res.json({ success: true, ...banned });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// SUPER CHATS & GIFTS
// ============================================

/**
 * POST /api/streaming/streams/:streamId/superchat
 * Send super chat
 */
router.post('/streams/:streamId/superchat',
  authenticate,
  [
    body('amount').isFloat({ min: 1 }),
    body('message').optional().isString().isLength({ max: 200 }),
    body('color').optional().isHexColor()
  ],
  validate,
  (req, res) => {
    try {
      const superChat = streamingService.sendSuperChat(req.params.streamId, {
        userId: req.user.id,
        username: req.user.username,
        amount: req.body.amount,
        message: req.body.message,
        color: req.body.color
      });

      res.status(201).json({
        success: true,
        superChat
      });
    } catch (error) {
      console.error('Super chat error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/streaming/streams/:streamId/superchats
 * Get active super chats
 */
router.get('/streams/:streamId/superchats',
  (req, res) => {
    try {
      const superChats = streamingService.getActiveSuperChats(req.params.streamId);

      res.json({ superChats });
    } catch (error) {
      console.error('Get super chats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/streams/:streamId/gift
 * Send gift
 */
router.post('/streams/:streamId/gift',
  authenticate,
  [
    body('giftType').notEmpty().isString(),
    body('count').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  (req, res) => {
    try {
      const gift = streamingService.sendGift(req.params.streamId, {
        userId: req.user.id,
        username: req.user.username,
        giftType: req.body.giftType,
        count: req.body.count || 1
      });

      res.status(201).json({
        success: true,
        gift
      });
    } catch (error) {
      console.error('Send gift error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// VIDEO ON DEMAND (VOD)
// ============================================

/**
 * POST /api/streaming/vod/transcode
 * Transcode video for VOD
 */
router.post('/vod/transcode',
  authenticate,
  [
    body('videoId').notEmpty().isString(),
    body('sourcePath').notEmpty().isString(),
    body('resolutions').optional().isArray()
  ],
  validate,
  (req, res) => {
    try {
      const job = streamingService.transcodeVideo(req.body.sourcePath, {
        videoId: req.body.videoId,
        resolutions: req.body.resolutions
      });

      res.status(202).json({
        success: true,
        job: job.toJSON()
      });
    } catch (error) {
      console.error('Transcode error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/streaming/vod/jobs/:jobId
 * Get transcode job status
 */
router.get('/vod/jobs/:jobId',
  authenticate,
  (req, res) => {
    try {
      const job = streamingService.getTranscodeJob(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json(job);
    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/thumbnail
 * Generate thumbnail
 */
router.post('/thumbnail',
  authenticate,
  [
    body('videoPath').notEmpty().isString(),
    body('timestamp').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const thumbnail = await streamingService.generateThumbnail(
        req.body.videoPath,
        req.body.timestamp || '00:00:01'
      );

      res.json({
        success: true,
        thumbnail
      });
    } catch (error) {
      console.error('Generate thumbnail error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/streaming/streams/:streamId/thumbnail
 * Generate stream thumbnail
 */
router.post('/streams/:streamId/thumbnail',
  authenticate,
  async (req, res) => {
    try {
      const thumbnail = await streamingService.generateStreamThumbnail(
        req.params.streamId
      );

      res.json({
        success: true,
        thumbnail
      });
    } catch (error) {
      console.error('Generate stream thumbnail error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// ANALYTICS
// ============================================

/**
 * GET /api/streaming/streams/:streamId/analytics
 * Get stream analytics
 */
router.get('/streams/:streamId/analytics',
  authenticate,
  (req, res) => {
    try {
      const analytics = streamingService.getStreamAnalytics(req.params.streamId);

      if (!analytics) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      res.json(analytics);
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/streaming/stats
 * Get global streaming stats
 */
router.get('/stats',
  (req, res) => {
    try {
      const stats = streamingService.getGlobalStats();

      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// HEALTH & INFO
// ============================================

/**
 * GET /api/streaming/health
 * Health check
 */
router.get('/health',
  async (req, res) => {
    try {
      const health = await streamingService.healthCheck();

      if (health.healthy) {
        res.json(health);
      } else {
        res.status(503).json(health);
      }
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/streaming/info
 * Get streaming service info
 */
router.get('/info',
  (req, res) => {
    res.json({
      service: 'NexaStream Streaming',
      version: '1.0.0',
      supportedResolutions: ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '4k', '8k'],
      supportedFormats: ['HLS', 'DASH'],
      maxLiveStreams: streamingService.config.maxLiveStreams,
      maxConcurrentTranscodes: streamingService.config.maxConcurrentTranscodes,
      superChatEnabled: streamingService.config.superChatEnabled
    });
  }
);

module.exports = router;
