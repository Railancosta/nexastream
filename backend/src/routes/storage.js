/**
 * NexaStream Storage API Routes
 */

const express = require('express');
const multer = require('multer');
const { body, query, param, validationResult } = require('express-validator');
const { storageService, STORAGE_TYPES, UPLOAD_STATUS } = require('../services/storage');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024 // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/ogg', 'audio/wav'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ============================================
// UPLOAD ROUTES
// ============================================

/**
 * POST /api/storage/upload
 * Upload a file
 */
router.post('/upload',
  authenticate,
  upload.single('file'),
  [
    body('folder').optional().isIn(['videos', 'images', 'audio', 'documents', 'thumbnails']),
    body('metadata').optional().isObject()
  ],
  validate,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await storageService.upload(req.file, {
        userId: req.user.id,
        folder: req.body.folder || 'videos',
        metadata: req.body.metadata || {},
        tags: req.body.tags ? JSON.parse(req.body.tags) : {}
      });

      res.status(201).json({
        success: true,
        file: result
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/storage/upload/multipart/init
 * Initialize multipart upload
 */
router.post('/upload/multipart/init',
  authenticate,
  [
    body('fileName').notEmpty().isString(),
    body('fileSize').isInt({ min: 1 }),
    body('mimeType').notEmpty().isString(),
    body('folder').optional().isIn(['videos', 'images', 'audio', 'documents'])
  ],
  validate,
  async (req, res) => {
    try {
      const { fileName, fileSize, mimeType, folder } = req.body;
      
      // Check quota
      await storageService.checkUserQuota(req.user.id);
      
      // Create file metadata
      const extension = fileName.split('.').pop();
      const fileId = require('crypto').randomUUID();
      const key = storageService.generateKey(req.user.id, folder || 'videos', fileId, `.${extension}`);
      
      // Initialize multipart upload
      const uploadId = require('crypto').randomUUID();
      
      // Store session info
      storageService.uploadSessions.set(`${key}:${uploadId}`, {
        uploadId,
        key,
        fileId,
        fileName,
        fileSize,
        mimeType,
        userId: req.user.id,
        parts: [],
        totalParts: Math.ceil(fileSize / storageService.config.multipartChunkSize),
        status: UPLOAD_STATUS.PENDING,
        createdAt: new Date()
      });

      res.status(201).json({
        success: true,
        uploadId,
        key,
        fileId,
        chunkSize: storageService.config.multipartChunkSize,
        totalParts: Math.ceil(fileSize / storageService.config.multipartChunkSize)
      });
    } catch (error) {
      console.error('Multipart init error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/storage/upload/multipart/part
 * Upload a part of multipart upload
 */
router.put('/upload/multipart/part',
  authenticate,
  upload.single('part'),
  [
    body('uploadId').notEmpty().isString(),
    body('key').notEmpty().isString(),
    body('partNumber').isInt({ min: 1 })
  ],
  validate,
  async (req, res) => {
    try {
      const { uploadId, key, partNumber } = req.body;
      const sessionId = `${key}:${uploadId}`;
      const session = storageService.uploadSessions.get(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Upload session not found' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No part data received' });
      }
      
      // Upload part
      const part = await storageService.uploadPart(key, uploadId, partNumber, req.file.buffer);
      
      session.parts.push(part);
      session.uploadedBytes = (session.uploadedBytes || 0) + req.file.size;
      session.status = UPLOAD_STATUS.IN_PROGRESS;

      res.json({
        success: true,
        part: {
          partNumber,
          etag: part.etag,
          size: part.size
        }
      });
    } catch (error) {
      console.error('Part upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/storage/upload/multipart/complete
 * Complete multipart upload
 */
router.post('/upload/multipart/complete',
  authenticate,
  [
    body('uploadId').notEmpty().isString(),
    body('key').notEmpty().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { uploadId, key } = req.body;
      const sessionId = `${key}:${uploadId}`;
      const session = storageService.uploadSessions.get(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Upload session not found' });
      }
      
      // Complete upload
      if (storageService.s3Client) {
        const { CompleteMultipartUploadCommand } = require('@aws-sdk/client-s3');
        await storageService.s3Client.send(new CompleteMultipartUploadCommand({
          Bucket: storageService.config.bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: session.parts.map(p => ({
              PartNumber: p.partNumber,
              ETag: p.etag
            }))
          }
        }));
      }
      
      session.status = UPLOAD_STATUS.COMPLETED;
      
      // Save metadata
      const checksum = require('crypto').createHash('sha256')
        .update(session.fileId)
        .digest('hex');
      
      const metadata = {
        fileId: session.fileId,
        key,
        originalName: session.fileName,
        mimeType: session.mimeType,
        size: session.fileSize,
        checksum,
        userId: req.user.id,
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + storageService.config.defaultTTL),
        status: UPLOAD_STATUS.COMPLETED
      };
      
      storageService.fileRegistry.set(session.fileId, metadata);
      storageService.uploadSessions.delete(sessionId);
      
      res.json({
        success: true,
        fileId: session.fileId,
        key,
        url: storageService.getPublicUrl(key)
      });
    } catch (error) {
      console.error('Complete upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/storage/upload/multipart/abort
 * Abort multipart upload
 */
router.delete('/upload/multipart/abort',
  authenticate,
  [
    body('uploadId').notEmpty().isString(),
    body('key').notEmpty().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { uploadId, key } = req.body;
      await storageService.abortUpload(key, uploadId);
      
      res.json({ success: true, aborted: true });
    } catch (error) {
      console.error('Abort upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// DOWNLOAD ROUTES
// ============================================

/**
 * GET /api/storage/download/:fileId
 * Download a file
 */
router.get('/download/:fileId',
  optionalAuth,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const metadata = await storageService.getMetadata(fileId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const file = await storageService.download(metadata.key);
      
      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
      res.setHeader('Content-Length', file.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      res.send(file);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/storage/download/token/:token
 * Download via signed token
 */
router.get('/download/token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!storageService.signedUrlTokens) {
      return res.status(404).json({ error: 'Token not found or expired' });
    }
    
    const tokenData = storageService.signedUrlTokens.get(token);
    
    if (!tokenData || new Date(tokenData.expires) < new Date()) {
      return res.status(404).json({ error: 'Token expired or invalid' });
    }
    
    const metadata = await storageService.getMetadataByKey(tokenData.key);
    
    if (!metadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = await storageService.download(tokenData.key);
    
    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
    res.send(file);
    
    // Clean up token
    storageService.signedUrlTokens.delete(token);
  } catch (error) {
    console.error('Token download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// METADATA ROUTES
// ============================================

/**
 * GET /api/storage/files
 * List user's files
 */
router.get('/files',
  authenticate,
  [
    query('folder').optional().isIn(['videos', 'images', 'audio', 'documents', 'thumbnails']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      const { folder, limit, offset } = req.query;
      
      const result = await storageService.listFiles(req.user.id, {
        folder,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0
      });

      res.json(result);
    } catch (error) {
      console.error('List files error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/storage/files/:fileId
 * Get file metadata
 */
router.get('/files/:fileId',
  authenticate,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const metadata = await storageService.getMetadata(fileId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Check ownership
      if (metadata.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(metadata);
    } catch (error) {
      console.error('Get metadata error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /api/storage/files/:fileId
 * Update file metadata
 */
router.patch('/files/:fileId',
  authenticate,
  [
    body('metadata').optional().isObject(),
    body('tags').optional().isObject(),
    body('expiresAt').optional().isISO8601()
  ],
  validate,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const metadata = await storageService.getMetadata(fileId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (metadata.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await storageService.updateMetadata(fileId, req.body);

      res.json({ success: true, file: updated });
    } catch (error) {
      console.error('Update metadata error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// QUOTA ROUTES
// ============================================

/**
 * GET /api/storage/quota
 * Get user's storage quota
 */
router.get('/quota',
  authenticate,
  async (req, res) => {
    try {
      const quotaInfo = await storageService.getUserQuotaInfo(req.user.id);

      res.json(quotaInfo);
    } catch (error) {
      console.error('Get quota error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// DELETE ROUTES
// ============================================

/**
 * DELETE /api/storage/files/:fileId
 * Delete a file
 */
router.delete('/files/:fileId',
  authenticate,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const metadata = await storageService.getMetadata(fileId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (metadata.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      await storageService.delete(metadata.key);

      res.json({ success: true, deleted: true });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/storage/files
 * Delete multiple files
 */
router.delete('/files',
  authenticate,
  [body('fileIds').isArray({ min: 1 })],
  validate,
  async (req, res) => {
    try {
      const { fileIds } = req.body;
      
      const keys = [];
      for (const fileId of fileIds) {
        const metadata = await storageService.getMetadata(fileId);
        if (metadata && metadata.userId === req.user.id) {
          keys.push(metadata.key);
        }
      }

      const result = await storageService.deleteMany(keys);

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Batch delete error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================
// UTILITY ROUTES
// ============================================

/**
 * GET /api/storage/stats
 * Get storage statistics
 */
router.get('/stats',
  authenticate,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const stats = await storageService.getStats();

      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/storage/health
 * Health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await storageService.healthCheck();

    if (health.healthy) {
      res.json(health);
    } else {
      res.status(503).json(health);
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/storage/check-duplicate
 * Check for duplicate files
 */
router.post('/check-duplicate',
  authenticate,
  [body('checksum').notEmpty().isString()],
  validate,
  async (req, res) => {
    try {
      const { checksum } = req.body;
      const result = await storageService.checkDuplicate(checksum);

      res.json(result);
    } catch (error) {
      console.error('Check duplicate error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
