/**
 * NexaStream Storage Service
 * Unified storage abstraction for S3/MinIO/Local/Remote backends
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Storage backend types
const STORAGE_TYPES = {
  LOCAL: 'local',
  S3: 's3',
  MINIO: 'minio',
  IPFS: 'ipfs',
  DISTRIBUTED: 'distributed'
};

// Upload status
const UPLOAD_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABORTED: 'aborted'
};

class StorageService {
  constructor(config = {}) {
    this.config = {
      type: config.type || process.env.STORAGE_TYPE || STORAGE_TYPES.LOCAL,
      // S3/MinIO config
      endpoint: config.endpoint || process.env.STORAGE_ENDPOINT,
      region: config.region || process.env.STORAGE_REGION || 'us-east-1',
      bucket: config.bucket || process.env.STORAGE_BUCKET || 'nexastream',
      accessKeyId: config.accessKeyId || process.env.STORAGE_ACCESS_KEY,
      secretAccessKey: config.secretAccessKey || process.env.STORAGE_SECRET_KEY,
      // Local storage config
      localPath: config.localPath || process.env.STORAGE_LOCAL_PATH || './uploads',
      // Limits
      maxFileSize: config.maxFileSize || parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024, // 500MB default
      allowedMimeTypes: config.allowedMimeTypes || [
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/ogg', 'audio/wav'
      ],
      // Multipart upload
      multipartChunkSize: config.multipartChunkSize || 10 * 1024 * 1024, // 10MB
      multipartThreshold: config.multipartThreshold || 100 * 1024 * 1024, // 100MB
      // Lifecycle
      defaultTTL: config.defaultTTL || 365 * 24 * 60 * 60 * 1000, // 1 year in ms
      cleanupInterval: config.cleanupInterval || 60 * 60 * 1000, // 1 hour
      // Quotas
      userQuota: config.userQuota || 10 * 1024 * 1024 * 1024, // 10GB per user
      // Encryption
      encryptionEnabled: config.encryptionEnabled !== false,
      encryptionKey: config.encryptionKey || process.env.STORAGE_ENCRYPTION_KEY
    };

    this.s3Client = null;
    this.uploadSessions = new Map(); // multipart upload tracking
    this.fileRegistry = new Map(); // file metadata registry
    
    this.initialize();
  }

  async initialize() {
    // Ensure local storage directory exists
    if (this.config.type === STORAGE_TYPES.LOCAL) {
      if (!fs.existsSync(this.config.localPath)) {
        fs.mkdirSync(this.config.localPath, { recursive: true });
      }
    }

    // Initialize S3 client for S3/MinIO
    if ([STORAGE_TYPES.S3, STORAGE_TYPES.MINIO].includes(this.config.type)) {
      this.s3Client = new S3Client({
        endpoint: this.config.endpoint,
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.secretAccessKey
        },
        forcePathStyle: this.config.type === STORAGE_TYPES.MINIO
      });
    }

    // Start cleanup interval
    this.startCleanupInterval();
  }

  // ============================================
  // UPLOAD OPERATIONS
  // ============================================

  /**
   * Upload a file (handles both small files and multipart)
   */
  async upload(file, options = {}) {
    const {
      userId,
      folder = 'videos',
      metadata = {},
      tags = {},
      expiresAt = null
    } = options;

    // Validate file
    await this.validateFile(file);

    // Check user quota
    await this.checkUserQuota(userId);

    // Generate unique file ID
    const fileId = crypto.randomUUID();
    const extension = path.extname(file.originalname || file.filename || 'file');
    const key = this.generateKey(userId, folder, fileId, extension);

    // Calculate checksum
    const checksum = await this.calculateChecksum(file);

    // Check for duplicate
    const existingFile = await this.findByChecksum(checksum);
    if (existingFile) {
      return {
        ...existingFile,
        duplicate: true
      };
    }

    // Determine upload method
    const fileSize = file.size;
    let result;

    if (fileSize >= this.config.multipartThreshold) {
      result = await this.multipartUpload(file, key, options);
    } else {
      result = await this.singleUpload(file, key, options);
    }

    // Store metadata
    const fileMetadata = {
      fileId,
      key,
      originalName: file.originalname || file.filename,
      mimeType: file.mimetype,
      size: fileSize,
      checksum,
      folder,
      userId,
      metadata,
      tags,
      uploadedAt: new Date(),
      expiresAt: expiresAt || new Date(Date.now() + this.config.defaultTTL),
      status: UPLOAD_STATUS.COMPLETED,
      storageType: this.config.type
    };

    this.fileRegistry.set(fileId, fileMetadata);
    await this.saveMetadata(fileId, fileMetadata);

    return {
      fileId,
      key,
      url: this.getPublicUrl(key),
      size: fileSize,
      mimeType: file.mimetype,
      checksum,
      duplicate: false
    };
  }

  /**
   * Single file upload (for files below threshold)
   */
  async singleUpload(file, key, options = {}) {
    const body = await this.readFileBuffer(file);

    // Encrypt if enabled
    const dataToStore = this.config.encryptionEnabled 
      ? this.encrypt(body) 
      : body;

    if (this.config.type === STORAGE_TYPES.LOCAL) {
      const filePath = path.join(this.config.localPath, key);
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, dataToStore);
    } else if (this.s3Client) {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: dataToStore,
        ContentType: file.mimetype,
        Metadata: options.metadata || {}
      }));
    }

    return { key, uploaded: true };
  }

  /**
   * Multipart upload for large files
   */
  async multipartUpload(file, key, options = {}) {
    const totalSize = file.size;
    const chunkSize = this.config.multipartChunkSize;
    const numParts = Math.ceil(totalSize / chunkSize);

    // Create multipart upload session
    let createCommand;
    if (this.s3Client) {
      createCommand = new CreateMultipartUploadCommand({
        Bucket: this.config.bucket,
        Key: key,
        ContentType: file.mimetype
      });
      var { UploadId } = await this.s3Client.send(createCommand);
    } else {
      var UploadId = crypto.randomUUID();
    }

    const session = {
      uploadId: UploadId,
      key,
      fileId: options.fileId,
      parts: [],
      totalParts: numParts,
      uploadedBytes: 0,
      status: UPLOAD_STATUS.IN_PROGRESS,
      createdAt: new Date()
    };

    this.uploadSessions.set(`${key}:${UploadId}`, session);

    // Read and upload parts
    const buffer = await this.readFileBuffer(file);
    const partPromises = [];

    for (let i = 0; i < numParts; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const partData = buffer.slice(start, end);
      const partNumber = i + 1;

      partPromises.push(
        this.uploadPart(key, UploadId, partNumber, partData)
          .then(part => {
            session.parts.push(part);
            session.uploadedBytes += part.size;
          })
          .catch(err => {
            session.status = UPLOAD_STATUS.FAILED;
            throw err;
          })
      );
    }

    await Promise.all(partPromises);

    // Complete multipart upload
    if (this.s3Client) {
      await this.s3Client.send(new CompleteMultipartUploadCommand({
        Bucket: this.config.bucket,
        Key: key,
        UploadId: UploadId,
        MultipartUpload: {
          Parts: session.parts.map(p => ({
            PartNumber: p.partNumber,
            ETag: p.etag
          }))
        }
      }));
    }

    session.status = UPLOAD_STATUS.COMPLETED;
    return { key, uploadId: UploadId, parts: session.parts.length };
  }

  /**
   * Upload a single part of multipart upload
   */
  async uploadPart(key, uploadId, partNumber, data) {
    if (this.config.type === STORAGE_TYPES.LOCAL) {
      // For local storage, just store parts sequentially
      const partPath = path.join(this.config.localPath, 'parts', `${key}.part${partNumber}`);
      const dir = path.dirname(partPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(partPath, data);
      
      return {
        partNumber,
        size: data.length,
        etag: crypto.createHash('md5').update(data).digest('hex')
      };
    } else if (this.s3Client) {
      const command = new UploadPartCommand({
        Bucket: this.config.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: data
      });
      
      const result = await this.s3Client.send(command);
      
      return {
        partNumber,
        size: data.length,
        etag: result.ETag
      };
    }
  }

  /**
   * Resume interrupted multipart upload
   */
  async resumeUpload(key, uploadId) {
    const sessionId = `${key}:${uploadId}`;
    const session = this.uploadSessions.get(sessionId);
    
    if (!session) {
      throw new Error('Upload session not found');
    }
    
    if (session.status === UPLOAD_STATUS.COMPLETED) {
      return { status: UPLOAD_STATUS.COMPLETED, key, uploadId };
    }
    
    // List uploaded parts and continue
    const uploadedParts = session.parts.map(p => p.partNumber);
    const missingParts = [];
    
    for (let i = 1; i <= session.totalParts; i++) {
      if (!uploadedParts.includes(i)) {
        missingParts.push(i);
      }
    }
    
    return {
      status: session.status,
      key,
      uploadId,
      completedParts: session.parts.length,
      totalParts: session.totalParts,
      uploadedBytes: session.uploadedBytes,
      missingParts
    };
  }

  /**
   * Abort multipart upload
   */
  async abortUpload(key, uploadId) {
    const sessionId = `${key}:${uploadId}`;
    const session = this.uploadSessions.get(sessionId);
    
    if (session) {
      session.status = UPLOAD_STATUS.ABORTED;
      
      if (this.s3Client) {
        await this.s3Client.send(new AbortMultipartUploadCommand({
          Bucket: this.config.bucket,
          Key: key,
          UploadId: uploadId
        }));
      }
      
      this.uploadSessions.delete(sessionId);
    }
    
    return { aborted: true };
  }

  // ============================================
  // DOWNLOAD/RETRIEVE OPERATIONS
  // ============================================

  /**
   * Get file as buffer
   */
  async download(key) {
    if (this.config.type === STORAGE_TYPES.LOCAL) {
      const filePath = path.join(this.config.localPath, key);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }
      
      let data = fs.readFileSync(filePath);
      
      if (this.config.encryptionEnabled) {
        data = this.decrypt(data);
      }
      
      return data;
    } else if (this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });
      
      const response = await this.s3Client.send(command);
      let data = await this.streamToBuffer(response.Body);
      
      if (this.config.encryptionEnabled) {
        data = this.decrypt(data);
      }
      
      return data;
    }
  }

  /**
   * Get file as stream
   */
  async downloadStream(key) {
    if (this.config.type === STORAGE_TYPES.LOCAL) {
      const filePath = path.join(this.config.localPath, key);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }
      
      const stream = fs.createReadStream(filePath);
      
      if (this.config.encryptionEnabled) {
        // Return encrypted stream for decryption middleware
        return stream;
      }
      
      return stream;
    } else if (this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });
      
      const response = await this.s3Client.send(command);
      return response.Body;
    }
  }

  /**
   * Generate signed URL for temporary access
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });
      
      return getSignedUrl(this.s3Client, command, { expiresIn });
    } else if (this.config.type === STORAGE_TYPES.LOCAL) {
      // For local storage, generate a token-based URL
      const token = crypto.randomUUID();
      const expires = Date.now() + (expiresIn * 1000);
      
      // Store token mapping (in production, use Redis)
      this.signedUrlTokens = this.signedUrlTokens || new Map();
      this.signedUrlTokens.set(token, { key, expires });
      
      return `${process.env.API_URL || 'http://localhost:3001'}/api/storage/download/${token}`;
    }
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(key) {
    if (this.config.type === STORAGE_TYPES.LOCAL) {
      return `/uploads/${key}`;
    } else if (this.s3Client) {
      return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    }
    
    return null;
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete a file
   */
  async delete(key) {
    if (this.config.type === STORAGE_TYPES.LOCAL) {
      const filePath = path.join(this.config.localPath, key);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete parts if multipart
      const partsDir = path.join(this.config.localPath, 'parts', key);
      if (fs.existsSync(partsDir)) {
        fs.rmSync(partsDir, { recursive: true });
      }
    } else if (this.s3Client) {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      }));
    }
    
    // Remove from registry
    for (const [fileId, metadata] of this.fileRegistry) {
      if (metadata.key === key) {
        this.fileRegistry.delete(fileId);
        await this.deleteMetadata(fileId);
        break;
      }
    }
    
    return { deleted: true };
  }

  /**
   * Delete multiple files
   */
  async deleteMany(keys) {
    const results = await Promise.allSettled(
      keys.map(key => this.delete(key))
    );
    
    return {
      deleted: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  }

  // ============================================
  // METADATA OPERATIONS
  // ============================================

  /**
   * Get file metadata
   */
  async getMetadata(fileId) {
    // Check registry first
    if (this.fileRegistry.has(fileId)) {
      return this.fileRegistry.get(fileId);
    }
    
    // Load from persistent storage
    return this.loadMetadata(fileId);
  }

  /**
   * Get metadata by key
   */
  async getMetadataByKey(key) {
    for (const metadata of this.fileRegistry.values()) {
      if (metadata.key === key) {
        return metadata;
      }
    }
    
    return null;
  }

  /**
   * Update file metadata
   */
  async updateMetadata(fileId, updates) {
    const metadata = await this.getMetadata(fileId);
    
    if (!metadata) {
      throw new Error('File not found');
    }
    
    Object.assign(metadata, updates, { updatedAt: new Date() });
    this.fileRegistry.set(fileId, metadata);
    await this.saveMetadata(fileId, metadata);
    
    return metadata;
  }

  /**
   * List files for a user
   */
  async listFiles(userId, options = {}) {
    const { folder, limit = 100, offset = 0 } = options;
    
    let files = Array.from(this.fileRegistry.values())
      .filter(f => f.userId === userId);
    
    if (folder) {
      files = files.filter(f => f.folder === folder);
    }
    
    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
    const total = files.length;
    files = files.slice(offset, offset + limit);
    
    return {
      files,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  // ============================================
  // QUOTA MANAGEMENT
  // ============================================

  /**
   * Check if user has quota for upload
   */
  async checkUserQuota(userId) {
    const usedBytes = await this.getUserUsedStorage(userId);
    const quota = await this.getUserQuota(userId);
    
    if (usedBytes >= quota) {
      throw new Error(`Storage quota exceeded. Used: ${usedBytes}, Quota: ${quota}`);
    }
  }

  /**
   * Get user's used storage
   */
  async getUserUsedStorage(userId) {
    let totalSize = 0;
    
    for (const metadata of this.fileRegistry.values()) {
      if (metadata.userId === userId && metadata.status !== UPLOAD_STATUS.ABORTED) {
        totalSize += metadata.size;
      }
    }
    
    return totalSize;
  }

  /**
   * Get user's storage quota
   */
  async getUserQuota(userId) {
    // In production, fetch from database based on user tier
    return this.config.userQuota;
  }

  /**
   * Get user quota info
   */
  async getUserQuotaInfo(userId) {
    const used = await this.getUserUsedStorage(userId);
    const quota = await this.getUserQuota(userId);
    
    return {
      used,
      quota,
      available: quota - used,
      percentage: (used / quota) * 100
    };
  }

  // ============================================
  // LIFECYCLE MANAGEMENT
  // ============================================

  /**
   * Start cleanup interval for expired files
   */
  startCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpiredFiles();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired files
   */
  async cleanupExpiredFiles() {
    const now = new Date();
    let deletedCount = 0;
    
    for (const [fileId, metadata] of this.fileRegistry) {
      if (new Date(metadata.expiresAt) < now) {
        try {
          await this.delete(metadata.key);
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete expired file ${fileId}:`, err);
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired files`);
    }
    
    return { deletedCount };
  }

  /**
   * Set file expiration
   */
  async setExpiration(fileId, expiresAt) {
    return this.updateMetadata(fileId, { expiresAt });
  }

  /**
   * Extend file TTL
   */
  async extendTTL(fileId, additionalMs) {
    const metadata = await this.getMetadata(fileId);
    
    if (!metadata) {
      throw new Error('File not found');
    }
    
    const newExpiresAt = new Date(new Date(metadata.expiresAt).getTime() + additionalMs);
    return this.updateMetadata(fileId, { expiresAt: newExpiresAt });
  }

  // ============================================
  // VERSIONING
  // ============================================

  /**
   * Create a new version of a file
   */
  async createVersion(fileId, newFile) {
    const original = await this.getMetadata(fileId);
    
    if (!original) {
      throw new Error('Original file not found');
    }
    
    // Upload new version
    const result = await this.upload(newFile, {
      userId: original.userId,
      folder: original.folder,
      metadata: {
        ...original.metadata,
        previousVersion: fileId
      }
    });
    
    // Mark original as previous version
    await this.updateMetadata(fileId, {
      isLatest: false,
      replacedBy: result.fileId
    });
    
    return result;
  }

  /**
   * Get file versions
   */
  async getVersions(fileId) {
    const versions = [];
    let currentId = fileId;
    
    while (currentId) {
      const metadata = await this.getMetadata(currentId);
      
      if (!metadata) break;
      
      versions.push(metadata);
      currentId = metadata.previousVersion;
    }
    
    return versions;
  }

  // ============================================
  // DEDUPLICATION
  // ============================================

  /**
   * Find file by checksum
   */
  async findByChecksum(checksum) {
    for (const metadata of this.fileRegistry.values()) {
      if (metadata.checksum === checksum && metadata.status === UPLOAD_STATUS.COMPLETED) {
        return metadata;
      }
    }
    
    return null;
  }

  /**
   * Check for duplicates before upload
   */
  async checkDuplicate(checksum) {
    const existing = await this.findByChecksum(checksum);
    
    if (existing) {
      return {
        duplicate: true,
        existingFileId: existing.fileId,
        existingKey: existing.key
      };
    }
    
    return { duplicate: false };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Validate file
   */
  async validateFile(file) {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${this.config.maxFileSize} bytes`);
    }
    
    // Check mime type
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type not allowed: ${file.mimetype}`);
    }
    
    return true;
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(file) {
    const buffer = await this.readFileBuffer(file);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  }

  /**
   * Read file as buffer
   */
  async readFileBuffer(file) {
    if (file.buffer) {
      return file.buffer;
    }
    
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = fs.createReadStream(file.path);
      
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Stream to buffer
   */
  async streamToBuffer(stream) {
    const chunks = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  /**
   * Generate storage key
   */
  generateKey(userId, folder, fileId, extension) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return path.join(folder, userId, `${year}-${month}`, `${fileId}${extension}`);
  }

  /**
   * Encrypt data
   */
  encrypt(data) {
    if (!this.config.encryptionKey) {
      return data;
    }
    
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt data
   */
  decrypt(data) {
    if (!this.config.encryptionKey) {
      return data;
    }
    
    const iv = data.slice(0, 16);
    const authTag = data.slice(16, 32);
    const encrypted = data.slice(32);
    
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Get storage stats
   */
  async getStats() {
    let totalFiles = 0;
    let totalSize = 0;
    let totalUsers = new Set();
    
    for (const metadata of this.fileRegistry.values()) {
      if (metadata.status === UPLOAD_STATUS.COMPLETED) {
        totalFiles++;
        totalSize += metadata.size;
        totalUsers.add(metadata.userId);
      }
    }
    
    return {
      totalFiles,
      totalSize,
      totalUsers: totalUsers.size,
      storageType: this.config.type,
      encryptionEnabled: this.config.encryptionEnabled,
      maxFileSize: this.config.maxFileSize
    };
  }

  /**
   * Save metadata to disk (simple implementation)
   */
  async saveMetadata(fileId, metadata) {
    const metadataPath = path.join(this.config.localPath, '.metadata');
    
    if (!fs.existsSync(metadataPath)) {
      fs.mkdirSync(metadataPath, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(metadataPath, `${fileId}.json`),
      JSON.stringify(metadata, null, 2)
    );
  }

  /**
   * Load metadata from disk
   */
  async loadMetadata(fileId) {
    const metadataPath = path.join(this.config.localPath, '.metadata', `${fileId}.json`);
    
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }

  /**
   * Delete metadata
   */
  async deleteMetadata(fileId) {
    const metadataPath = path.join(this.config.localPath, '.metadata', `${fileId}.json`);
    
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    const checks = {
      storage: { status: 'ok' },
      write: { status: 'ok' },
      read: { status: 'ok' }
    };
    
    try {
      if (this.config.type === STORAGE_TYPES.LOCAL) {
        const testFile = path.join(this.config.localPath, '.healthcheck');
        fs.writeFileSync(testFile, 'ok');
        fs.unlinkSync(testFile);
      } else if (this.s3Client) {
        await this.s3Client.send(new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: '.healthcheck'
        }));
      }
    } catch (err) {
      checks.write.status = 'error';
      checks.write.error = err.message;
    }
    
    const isHealthy = Object.values(checks).every(c => c.status === 'ok');
    
    return {
      healthy: isHealthy,
      checks,
      storageType: this.config.type,
      timestamp: new Date()
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Abort any in-progress multipart uploads
    for (const [sessionId, session] of this.uploadSessions) {
      if (session.status === UPLOAD_STATUS.IN_PROGRESS) {
        await this.abortUpload(session.key, session.uploadId);
      }
    }
  }
}

// Export singleton instance
const storageService = new StorageService();

module.exports = {
  StorageService,
  storageService,
  STORAGE_TYPES,
  UPLOAD_STATUS
};
