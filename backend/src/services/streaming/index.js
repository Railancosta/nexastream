/**
 * NexaStream Streaming Service
 * Complete streaming infrastructure with RTMP, HLS, DASH, WebRTC
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// ============================================
// CONSTANTS
// ============================================

const STREAM_STATUS = {
  LIVE: 'live',
  ENDED: 'ended',
  RECORDING: 'recording',
  PAUSED: 'paused'
};

const TRANSCODE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const QUALITY_LEVELS = {
  '144p': { width: 256, height: 144, bitrate: 400 },
  '240p': { width: 426, height: 240, bitrate: 700 },
  '360p': { width: 640, height: 360, bitrate: 1000 },
  '480p': { width: 854, height: 480, bitrate: 2500 },
  '720p': { width: 1280, height: 720, bitrate: 5000 },
  '1080p': { width: 1920, height: 1080, bitrate: 8000 },
  '1440p': { width: 2560, height: 1440, bitrate: 16000 },
  '4k': { width: 3840, height: 2160, bitrate: 35000 },
  '8k': { width: 7680, height: 4320, bitrate: 80000 }
};

const RECORDING_STATUS = {
  NONE: 'none',
  AVAILABLE: 'available',
  PROCESSING: 'processing'
};

// ============================================
// LIVE STREAM CLASS
// ============================================

class LiveStream extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.streamId = options.streamId || crypto.randomUUID();
    this.userId = options.userId;
    this.title = options.title || 'Untitled Stream';
    this.description = options.description || '';
    this.category = options.category || 'general';
    this.visibility = options.visibility || 'public';
    
    // Stream keys
    this.streamKey = options.streamKey || crypto.randomUUID();
    this.rtmpUrl = options.rtmpUrl || 'rtmp://localhost/live';
    
    // Status
    this.status = STREAM_STATUS.LIVE;
    this.startedAt = new Date();
    this.endedAt = null;
    
    // Viewers
    this.viewers = new Set();
    this.peakViewers = 0;
    
    // Recording
    this.recordingEnabled = options.recordingEnabled !== false;
    this.recordingStatus = RECORDING_STATUS.NONE;
    this.recordingPath = null;
    this.vodId = null;
    
    // Quality
    this.quality = options.quality || '1080p';
    this.latency = options.latency || 'normal'; // ultra_low, low, normal
    
    // Chat
    this.chatEnabled = options.chatEnabled !== false;
    this.moderationEnabled = options.moderationEnabled !== false;
    
    // Metrics
    this.metrics = {
      duration: 0,
      bitsIn: 0,
      bitsOut: 0,
      droppedFrames: 0,
      fps: 0
    };
    
    // Thumbnail
    this.thumbnailUrl = null;
    
    // Tags
    this.tags = options.tags || [];
    
    // HLS manifest
    this.hlsManifest = null;
    this.hlsUrl = null;
    
    // Cleanup timer
    this.cleanupTimer = null;
  }

  addViewer(peerId) {
    this.viewers.add(peerId);
    if (this.viewers.size > this.peakViewers) {
      this.peakViewers = this.viewers.size;
    }
    this.emit('viewer-join', { streamId: this.streamId, viewerCount: this.viewers.size });
  }

  removeViewer(peerId) {
    this.viewers.delete(peerId);
    this.emit('viewer-leave', { streamId: this.streamId, viewerCount: this.viewers.size });
  }

  getViewerCount() {
    return this.viewers.size;
  }

  updateMetrics(metrics) {
    this.metrics = { ...this.metrics, ...metrics };
  }

  end() {
    this.status = STREAM_STATUS.ENDED;
    this.endedAt = new Date();
    this.duration = (this.endedAt - this.startedAt) / 1000;
    
    // Clear all viewers
    this.viewers.clear();
    
    this.emit('ended', {
      streamId: this.streamId,
      duration: this.duration,
      peakViewers: this.peakViewers
    });
  }

  toJSON() {
    return {
      streamId: this.streamId,
      userId: this.userId,
      title: this.title,
      description: this.description,
      category: this.category,
      visibility: this.visibility,
      status: this.status,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      duration: this.duration,
      viewerCount: this.viewers.size,
      peakViewers: this.peakViewers,
      quality: this.quality,
      thumbnailUrl: this.thumbnailUrl,
      hlsUrl: this.hlsUrl,
      tags: this.tags,
      metrics: this.metrics,
      recordingEnabled: this.recordingEnabled,
      recordingStatus: this.recordingStatus
    };
  }
}

// ============================================
// TRANSCODING JOB CLASS
// ============================================

class TranscodeJob {
  constructor(options = {}) {
    this.jobId = options.jobId || crypto.randomUUID();
    this.videoId = options.videoId;
    this.sourcePath = options.sourcePath;
    this.outputDir = options.outputDir;
    this.status = TRANSCODE_STATUS.PENDING;
    this.progress = 0;
    this.resolutions = options.resolutions || ['720p', '480p', '360p'];
    this.currentResolution = null;
    this.error = null;
    this.startedAt = null;
    this.completedAt = null;
    this.process = null;
    this.onProgress = options.onProgress || (() => {});
  }

  async start() {
    this.status = TRANSCODE_STATUS.PROCESSING;
    this.startedAt = new Date();
    
    try {
      for (const resolution of this.resolutions) {
        this.currentResolution = resolution;
        await this.transcodeResolution(resolution);
        this.progress = ((this.resolutions.indexOf(resolution) + 1) / this.resolutions.length) * 100;
        this.onProgress({ jobId: this.jobId, progress: this.progress, resolution });
      }
      
      this.status = TRANSCODE_STATUS.COMPLETED;
      this.completedAt = new Date();
      await this.generateMasterPlaylist();
      
    } catch (error) {
      this.status = TRANSCODE_STATUS.FAILED;
      this.error = error.message;
    }
    
    return this;
  }

  async transcodeResolution(resolution) {
    const config = QUALITY_LEVELS[resolution];
    if (!config) {
      throw new Error(`Unsupported resolution: ${resolution}`);
    }

    const outputPath = path.join(this.outputDir, `${resolution}.m3u8`);
    
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', this.sourcePath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:v', `${config.bitrate}k`,
        '-b:a', '128k',
        '-vf', `scale=${config.width}:${config.height}`,
        '-hls_time', '6',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', path.join(this.outputDir, `${resolution}_%03d.ts`),
        '-f', 'hls',
        outputPath
      ];

      this.process = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      this.process.stderr.on('data', (data) => {
        stderr += data.toString();
        // Parse progress from FFmpeg output
        const timeMatch = data.toString().match(/time=(\d+):(\d+):(\d+)/);
        if (timeMatch) {
          const seconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
          this.onProgress({ jobId: this.jobId, progress: this.progress, resolution, seconds });
        }
      });

      this.process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      this.process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async generateMasterPlaylist() {
    const masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';
    let playlist = masterPlaylist;

    for (const resolution of this.resolutions) {
      const bandwidth = QUALITY_LEVELS[resolution].bitrate * 1000;
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${QUALITY_LEVELS[resolution].width}x${QUALITY_LEVELS[resolution].height}\n`;
      playlist += `${resolution}.m3u8\n`;
    }

    fs.writeFileSync(path.join(this.outputDir, 'master.m3u8'), playlist);
    return path.join(this.outputDir, 'master.m3u8');
  }

  cancel() {
    if (this.process) {
      this.process.kill('SIGTERM');
    }
    this.status = TRANSCODE_STATUS.FAILED;
    this.error = 'Cancelled by user';
  }

  toJSON() {
    return {
      jobId: this.jobId,
      videoId: this.videoId,
      status: this.status,
      progress: this.progress,
      resolutions: this.resolutions,
      currentResolution: this.currentResolution,
      error: this.error,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }
}

// ============================================
// STREAMING SERVICE
// ============================================

class StreamingService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Paths
      storagePath: config.storagePath || process.env.STREAMING_STORAGE_PATH || './storage/streaming',
      tempPath: config.tempPath || process.env.STREAMING_TEMP_PATH || './storage/temp',
      cdnBaseUrl: config.cdnBaseUrl || process.env.CDN_BASE_URL || 'https://cdn.nexastream.org',
      
      // RTMP
      rtmpPort: config.rtmpPort || parseInt(process.env.RTMP_PORT) || 1935,
      rtmpHost: config.rtmpHost || process.env.RTMP_HOST || 'localhost',
      
      // FFmpeg
      ffmpegPath: config.ffmpegPath || 'ffmpeg',
      ffprobePath: config.ffprobePath || 'ffprobe',
      
      // Limits
      maxConcurrentTranscodes: config.maxConcurrentTranscodes || 4,
      maxLiveStreams: config.maxLiveStreams || 1000,
      maxViewersPerStream: config.maxViewersPerStream || 100000,
      
      // Recording
      recordingEnabled: config.recordingEnabled !== false,
      recordingPath: config.recordingPath || './storage/recordings',
      
      // HLS
      hlsSegmentDuration: config.hlsSegmentDuration || 6,
      hlsPlaylistSize: config.hlsPlaylistSize || 6,
      
      // WebRTC
      webrtcEnabled: config.webrtcEnabled !== false,
      webrtcPort: config.webrtcPort || parseInt(process.env.WEBRTC_PORT) || 8000,
      
      // Chat
      chatHistoryLimit: config.chatHistoryLimit || 500,
      chatRateLimit: config.chatRateLimit || 10, // messages per minute
      
      // Monetization
      superChatEnabled: config.superChatEnabled !== false,
      minSuperChatAmount: config.minSuperChatAmount || 1, // NST
    };

    // Live streams
    this.liveStreams = new Map();
    
    // Active transcodes
    this.transcodeQueue = [];
    this.activeTranscodes = new Map();
    
    // Chat messages (in-memory, should use Redis in production)
    this.chatMessages = new Map();
    
    // Stream keys (streamKey -> streamId)
    this.streamKeys = new Map();
    
    // Super chats
    this.superChats = new Map();
    
    // Initialize
    this.initialize();
  }

  async initialize() {
    // Create directories
    const dirs = [
      this.config.storagePath,
      this.config.tempPath,
      this.config.recordingPath,
      path.join(this.config.storagePath, 'live'),
      path.join(this.config.storagePath, 'vod'),
      path.join(this.config.storagePath, 'thumbnails')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    console.log('Streaming service initialized');
  }

  // ============================================
  // LIVE STREAM MANAGEMENT
  // ============================================

  /**
   * Create a new live stream
   */
  createLiveStream(options = {}) {
    if (this.liveStreams.size >= this.config.maxLiveStreams) {
      throw new Error('Maximum number of live streams reached');
    }

    const stream = new LiveStream({
      streamId: options.streamId,
      userId: options.userId,
      title: options.title,
      description: options.description,
      category: options.category,
      visibility: options.visibility,
      quality: options.quality || '1080p',
      latency: options.latency || 'normal',
      recordingEnabled: options.recordingEnabled,
      chatEnabled: options.chatEnabled,
      moderationEnabled: options.moderationEnabled,
      tags: options.tags
    });

    // Generate stream key
    const streamKey = options.streamKey || this.generateStreamKey();
    stream.streamKey = streamKey;
    
    // Set RTMP URL
    stream.rtmpUrl = `rtmp://${this.config.rtmpHost}:${this.config.rtmpPort}/live/${streamKey}`;
    
    // Set HLS URL
    stream.hlsUrl = `${this.config.cdnBaseUrl}/live/${stream.streamId}/index.m3u8`;

    // Store mappings
    this.liveStreams.set(stream.streamId, stream);
    this.streamKeys.set(streamKey, stream.streamId);
    
    // Initialize chat
    this.chatMessages.set(stream.streamId, []);

    this.emit('stream-created', stream.toJSON());

    return stream;
  }

  /**
   * Generate a secure stream key
   */
  generateStreamKey() {
    const prefix = crypto.randomBytes(4).toString('hex');
    const secret = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${secret}`;
  }

  /**
   * Get stream by ID
   */
  getStream(streamId) {
    return this.liveStreams.get(streamId);
  }

  /**
   * Get stream by key
   */
  getStreamByKey(streamKey) {
    const streamId = this.streamKeys.get(streamKey);
    return streamId ? this.liveStreams.get(streamId) : null;
  }

  /**
   * Get all active streams
   */
  getActiveStreams() {
    const streams = [];
    for (const stream of this.liveStreams.values()) {
      if (stream.status === STREAM_STATUS.LIVE) {
        streams.push(stream.toJSON());
      }
    }
    return streams;
  }

  /**
   * Get trending streams
   */
  getTrendingStreams(limit = 20) {
    const streams = Array.from(this.liveStreams.values())
      .filter(s => s.status === STREAM_STATUS.LIVE)
      .map(s => ({
        ...s.toJSON(),
        trendingScore: s.peakViewers + s.viewers.size * 0.5
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return streams;
  }

  /**
   * Start a live stream (user goes live)
   */
  startLiveStream(streamId, options = {}) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    if (stream.status !== STREAM_STATUS.LIVE) {
      stream.status = STREAM_STATUS.LIVE;
      stream.startedAt = new Date();
      stream.peakViewers = 0;
      
      this.emit('stream-started', stream.toJSON());
    }

    return stream;
  }

  /**
   * End a live stream
   */
  endLiveStream(streamId, options = {}) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    stream.end();

    // Start VOD processing if recording enabled
    if (this.config.recordingEnabled && stream.recordingEnabled) {
      this.processRecording(stream);
    }

    // Cleanup
    this.streamKeys.delete(stream.streamKey);
    this.chatMessages.delete(streamId);

    this.emit('stream-ended', stream.toJSON());

    return stream;
  }

  /**
   * Update stream info
   */
  updateStream(streamId, updates) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    if (updates.title !== undefined) stream.title = updates.title;
    if (updates.description !== undefined) stream.description = updates.description;
    if (updates.category !== undefined) stream.category = updates.category;
    if (updates.quality !== undefined) stream.quality = updates.quality;
    if (updates.thumbnailUrl !== undefined) stream.thumbnailUrl = updates.thumbnailUrl;
    if (updates.tags !== undefined) stream.tags = updates.tags;

    this.emit('stream-updated', stream.toJSON());
    return stream;
  }

  /**
   * Delete a stream
   */
  deleteStream(streamId) {
    const stream = this.liveStreams.get(streamId);
    if (stream) {
      this.streamKeys.delete(stream.streamKey);
      this.liveStreams.delete(streamId);
      this.chatMessages.delete(streamId);
      
      this.emit('stream-deleted', { streamId });
    }
  }

  // ============================================
  // VIEWER MANAGEMENT
  // ============================================

  /**
   * Join stream as viewer
   */
  joinStream(streamId, peerId) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    if (stream.status !== STREAM_STATUS.LIVE) {
      throw new Error('Stream is not live');
    }

    stream.addViewer(peerId);

    return {
      stream: stream.toJSON(),
      streamKey: stream.streamKey,
      rtmpUrl: stream.rtmpUrl,
      hlsUrl: stream.hlsUrl
    };
  }

  /**
   * Leave stream
   */
  leaveStream(streamId, peerId) {
    const stream = this.liveStreams.get(streamId);
    if (stream) {
      stream.removeViewer(peerId);
    }
  }

  /**
   * Get viewer count
   */
  getViewerCount(streamId) {
    const stream = this.liveStreams.get(streamId);
    return stream ? stream.getViewerCount() : 0;
  }

  // ============================================
  // CHAT SYSTEM
  // ============================================

  /**
   * Send chat message
   */
  sendChatMessage(streamId, message) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    if (!stream.chatEnabled) {
      throw new Error('Chat is disabled for this stream');
    }

    const chatMessage = {
      id: crypto.randomUUID(),
      streamId,
      userId: message.userId,
      username: message.username,
      content: this.sanitizeMessage(message.content),
      timestamp: new Date(),
      type: message.type || 'message', // message, superchat, gift, moderation
      badges: message.badges || [],
      isOwner: message.isOwner || false,
      isModerator: message.isModerator || false,
      isVerified: message.isVerified || false,
      color: message.color || '#ffffff'
    };

    // Get chat history
    const chatHistory = this.chatMessages.get(streamId) || [];
    
    // Add message
    chatHistory.push(chatMessage);
    
    // Limit history
    if (chatHistory.length > this.config.chatHistoryLimit) {
      chatHistory.shift();
    }
    
    this.chatMessages.set(streamId, chatHistory);

    // Emit event
    this.emit('chat-message', chatMessage);

    return chatMessage;
  }

  /**
   * Get chat history
   */
  getChatHistory(streamId, limit = 50) {
    const chatHistory = this.chatMessages.get(streamId) || [];
    return chatHistory.slice(-limit);
  }

  /**
   * Delete chat message
   */
  deleteChatMessage(streamId, messageId) {
    const chatHistory = this.chatMessages.get(streamId);
    if (chatHistory) {
      const index = chatHistory.findIndex(m => m.id === messageId);
      if (index !== -1) {
        const deleted = chatHistory.splice(index, 1)[0];
        this.emit('chat-message-deleted', { streamId, messageId, deleted });
        return true;
      }
    }
    return false;
  }

  /**
   * Timeout user in chat
   */
  timeoutUser(streamId, userId, duration = 600) {
    // In production, store timeout in Redis with TTL
    this.emit('user-timeout', { streamId, userId, duration });
    return { userId, timeoutUntil: Date.now() + duration * 1000 };
  }

  /**
   * Ban user from chat
   */
  banUser(streamId, userId) {
    this.emit('user-banned', { streamId, userId });
    return { userId, banned: true };
  }

  /**
   * Sanitize chat message
   */
  sanitizeMessage(content) {
    // Basic sanitization - in production use DOMPurify
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .trim()
      .slice(0, 500); // Max length
  }

  // ============================================
  // SUPER CHATS & GIFTS
  // ============================================

  /**
   * Send super chat
   */
  sendSuperChat(streamId, superChat) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    if (!this.config.superChatEnabled) {
      throw new Error('Super chats are disabled');
    }

    const amount = parseFloat(superChat.amount);
    if (amount < this.config.minSuperChatAmount) {
      throw new Error(`Minimum super chat amount is ${this.config.minSuperChatAmount} NST`);
    }

    const sc = {
      id: crypto.randomUUID(),
      streamId,
      userId: superChat.userId,
      username: superChat.username,
      amount,
      message: superChat.message || '',
      color: superChat.color || '#ffd700',
      duration: superChat.duration || 300, // seconds visible
      timestamp: new Date(),
      status: 'active'
    };

    // Store super chat
    const streamSuperChats = this.superChats.get(streamId) || [];
    streamSuperChats.push(sc);
    this.superChats.set(streamId, streamSuperChats);

    // Emit event
    this.emit('super-chat', sc);

    // Auto-expire
    setTimeout(() => {
      sc.status = 'expired';
      this.emit('super-chat-expired', sc);
    }, sc.duration * 1000);

    return sc;
  }

  /**
   * Get active super chats
   */
  getActiveSuperChats(streamId) {
    const superChats = this.superChats.get(streamId) || [];
    return superChats.filter(sc => sc.status === 'active');
  }

  /**
   * Send gift
   */
  sendGift(streamId, gift) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    const giftData = {
      id: crypto.randomUUID(),
      streamId,
      userId: gift.userId,
      username: gift.username,
      giftType: gift.giftType,
      count: gift.count || 1,
      totalAmount: this.calculateGiftAmount(gift.giftType, gift.count || 1),
      timestamp: new Date()
    };

    this.emit('gift-sent', giftData);
    return giftData;
  }

  /**
   * Calculate gift amount in NST
   */
  calculateGiftAmount(giftType, count) {
    const giftPrices = {
      'heart': 1,
      'star': 5,
      'rocket': 25,
      'diamond': 100,
      'crown': 500,
      'fire': 1000
    };
    
    return (giftPrices[giftType] || 1) * count;
  }

  // ============================================
  // VIDEO ON DEMAND (VOD)
// ============================================

  /**
   * Process completed recording into VOD
   */
  async processRecording(stream) {
    if (!stream.recordingPath || !fs.existsSync(stream.recordingPath)) {
      return null;
    }

    stream.recordingStatus = RECORDING_STATUS.PROCESSING;

    try {
      const videoId = `vod_${stream.streamId}_${Date.now()}`;
      const outputDir = path.join(this.config.storagePath, 'vod', videoId);
      
      fs.mkdirSync(outputDir, { recursive: true });

      // Create transcode job
      const job = new TranscodeJob({
        videoId,
        sourcePath: stream.recordingPath,
        outputDir,
        resolutions: ['720p', '480p', '360p'],
        onProgress: (progress) => {
          this.emit('transcode-progress', { videoId, ...progress });
        }
      });

      await job.start();

      if (job.status === TRANSCODE_STATUS.COMPLETED) {
        const vod = {
          videoId,
          streamId: stream.streamId,
          userId: stream.userId,
          title: stream.title,
          description: stream.description,
          duration: stream.duration,
          status: 'available',
          masterPlaylist: `${this.config.cdnBaseUrl}/vod/${videoId}/master.m3u8`,
          thumbnail: stream.thumbnailUrl,
          createdAt: new Date()
        };

        stream.vodId = videoId;
        stream.recordingStatus = RECORDING_STATUS.AVAILABLE;

        this.emit('vod-ready', vod);
        return vod;
      }

    } catch (error) {
      console.error('Recording processing failed:', error);
      stream.recordingStatus = RECORDING_STATUS.NONE;
    }

    return null;
  }

  /**
   * Transcode video for VOD
   */
  async transcodeVideo(sourcePath, options = {}) {
    const videoId = options.videoId || `video_${Date.now()}`;
    const outputDir = path.join(this.config.storagePath, 'vod', videoId);
    
    fs.mkdirSync(outputDir, { recursive: true });

    const job = new TranscodeJob({
      videoId,
      sourcePath,
      outputDir,
      resolutions: options.resolutions || ['720p', '480p', '360p'],
      onProgress: (progress) => {
        this.emit('transcode-progress', { videoId, ...progress });
      }
    });

    // Add to queue
    this.transcodeQueue.push(job);
    this.processTranscodeQueue();

    return job;
  }

  /**
   * Process transcode queue
   */
  async processTranscodeQueue() {
    while (
      this.transcodeQueue.length > 0 &&
      this.activeTranscodes.size < this.config.maxConcurrentTranscodes
    ) {
      const job = this.transcodeQueue.shift();
      this.activeTranscodes.set(job.jobId, job);
      
      job.start().then(() => {
        this.activeTranscodes.delete(job.jobId);
        this.processTranscodeQueue();
        this.emit('transcode-completed', job.toJSON());
      }).catch((error) => {
        this.activeTranscodes.delete(job.jobId);
        this.processTranscodeQueue();
        this.emit('transcode-failed', { jobId: job.jobId, error: error.message });
      });
    }
  }

  /**
   * Get transcode job status
   */
  getTranscodeJob(jobId) {
    const job = this.activeTranscodes.get(jobId);
    return job ? job.toJSON() : null;
  }

  // ============================================
  // THUMBNAIL GENERATION
  // ============================================

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(videoPath, timestamp = '00:00:01') {
    const thumbnailId = `thumb_${Date.now()}`;
    const outputPath = path.join(this.config.storagePath, 'thumbnails', `${thumbnailId}.jpg`);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(this.config.ffmpegPath, [
        '-i', videoPath,
        '-ss', timestamp,
        '-vframes', '1',
        '-vf', 'scale=1280:720',
        '-q:v', '2',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          const thumbnailUrl = `${this.config.cdnBaseUrl}/thumbnails/${thumbnailId}.jpg`;
          resolve({ path: outputPath, url: thumbnailUrl });
        } else {
          reject(new Error(`Thumbnail generation failed with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * Generate stream thumbnail (from live stream)
   */
  async generateStreamThumbnail(streamId) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    // In production, capture from RTMP stream
    const thumbnailId = `live_${streamId}`;
    const thumbnailUrl = `${this.config.cdnBaseUrl}/thumbnails/${thumbnailId}.jpg`;
    
    stream.thumbnailUrl = thumbnailUrl;
    return { url: thumbnailUrl };
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get stream analytics
   */
  getStreamAnalytics(streamId) {
    const stream = this.liveStreams.get(streamId);
    if (!stream) {
      return null;
    }

    return {
      streamId,
      viewerCount: stream.viewers.size,
      peakViewers: stream.peakViewers,
      duration: stream.duration,
      startedAt: stream.startedAt,
      endedAt: stream.endedAt,
      status: stream.status,
      metrics: stream.metrics,
      chatMessageCount: (this.chatMessages.get(streamId) || []).length,
      superChatTotal: (this.superChats.get(streamId) || [])
        .filter(sc => sc.status === 'active')
        .reduce((sum, sc) => sum + sc.amount, 0)
    };
  }

  /**
   * Get global streaming stats
   */
  getGlobalStats() {
    const streams = Array.from(this.liveStreams.values());
    
    return {
      totalActiveStreams: streams.filter(s => s.status === STREAM_STATUS.LIVE).length,
      totalViewers: streams.reduce((sum, s) => sum + s.viewers.size, 0),
      totalRecorded: streams.filter(s => s.vodId).length,
      peakViewers: Math.max(...streams.map(s => s.peakViewers), 0),
      transcodesInProgress: this.activeTranscodes.size,
      transcodesInQueue: this.transcodeQueue.length
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Health check
   */
  async healthCheck() {
    const checks = {
      storage: { status: 'ok' },
      ffmpeg: { status: 'ok' },
      streams: { status: 'ok' }
    };

    // Check storage
    try {
      const testFile = path.join(this.config.tempPath, '.healthcheck');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
    } catch (error) {
      checks.storage.status = 'error';
      checks.storage.error = error.message;
    }

    // Check FFmpeg
    try {
      const ffmpeg = spawn(this.config.ffmpegPath, ['-version']);
      await new Promise((resolve, reject) => {
        ffmpeg.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg exited with code ${code}`));
        });
        ffmpeg.on('error', reject);
        setTimeout(resolve, 2000); // Timeout after 2s
      });
    } catch (error) {
      checks.ffmpeg.status = 'warning';
      checks.ffmpeg.error = 'FFmpeg not found or not working';
    }

    // Check streams
    checks.streams.active = this.liveStreams.size;
    checks.streams.viewers = Array.from(this.liveStreams.values())
      .reduce((sum, s) => sum + s.viewers.size, 0);

    const isHealthy = checks.storage.status === 'ok' && checks.streams.status === 'ok';

    return {
      healthy: isHealthy,
      checks,
      timestamp: new Date()
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    // End all active streams
    for (const stream of this.liveStreams.values()) {
      if (stream.status === STREAM_STATUS.LIVE) {
        stream.end();
      }
    }

    // Cancel active transcodes
    for (const job of this.activeTranscodes.values()) {
      job.cancel();
    }

    this.emit('shutdown');
    console.log('Streaming service shut down');
  }
}

// ============================================
// HLS/DASH PACKAGER
// ============================================

class HLSPackager {
  constructor(config = {}) {
    this.segmentDuration = config.segmentDuration || 6;
    this.playlistSize = config.playlistSize || 6;
  }

  /**
   * Generate HLS playlist from segments
   */
  generatePlaylist(segments, options = {}) {
    const version = options.version || 3;
    const targetDuration = options.targetDuration || this.segmentDuration;
    
    let playlist = `#EXTM3U\n#EXT-X-VERSION:${version}\n`;
    playlist += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
    playlist += `#EXT-X-MEDIA-SEQUENCE:0\n`;

    for (const segment of segments) {
      playlist += `#EXTINF:${segment.duration.toFixed(3)},\n`;
      playlist += `${segment.url}\n`;
    }

    playlist += '#EXT-X-ENDLIST\n';
    
    return playlist;
  }

  /**
   * Generate master playlist for adaptive streaming
   */
  generateMasterPlaylist(qualities) {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n';

    for (const quality of qualities) {
      const bandwidth = quality.bitrate * 1000;
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},`;
      playlist += `RESOLUTION=${quality.width}x${quality.height},`;
      playlist += `NAME="${quality.name}"\n`;
      playlist += `${quality.playlistUrl}\n`;
    }

    return playlist;
  }
}

// Export
const streamingService = new StreamingService();

module.exports = {
  StreamingService,
  streamingService,
  LiveStream,
  TranscodeJob,
  HLSPackager,
  STREAM_STATUS,
  TRANSCODE_STATUS,
  QUALITY_LEVELS,
  RECORDING_STATUS
};
