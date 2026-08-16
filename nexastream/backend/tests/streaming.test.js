/**
 * NexaStream Streaming Service Tests
 */

const {
  StreamingService,
  LiveStream,
  TranscodeJob,
  HLSPackager,
  STREAM_STATUS,
  TRANSCODE_STATUS,
  QUALITY_LEVELS
} = require('../src/services/streaming');

describe('StreamingService', () => {
  let service;

  beforeEach(() => {
    service = new StreamingService({
      storagePath: '/tmp/test-streaming',
      tempPath: '/tmp/test-temp',
      recordingPath: '/tmp/test-recordings',
      maxConcurrentTranscodes: 2,
      maxLiveStreams: 100
    });
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('LiveStream', () => {
    test('should create a live stream', () => {
      const stream = new LiveStream({
        userId: 'user123',
        title: 'Test Stream',
        description: 'A test stream'
      });

      expect(stream.streamId).toBeDefined();
      expect(stream.userId).toBe('user123');
      expect(stream.title).toBe('Test Stream');
      expect(stream.status).toBe(STREAM_STATUS.LIVE);
      expect(stream.startedAt).toBeInstanceOf(Date);
    });

    test('should manage viewers', () => {
      const stream = new LiveStream({ userId: 'user1', title: 'Test' });

      stream.addViewer('viewer1');
      expect(stream.getViewerCount()).toBe(1);

      stream.addViewer('viewer2');
      expect(stream.getViewerCount()).toBe(2);
      expect(stream.peakViewers).toBe(2);

      stream.removeViewer('viewer1');
      expect(stream.getViewerCount()).toBe(1);
    });

    test('should end stream', () => {
      const stream = new LiveStream({ userId: 'user1', title: 'Test' });

      stream.addViewer('viewer1');
      stream.end();

      expect(stream.status).toBe(STREAM_STATUS.ENDED);
      expect(stream.endedAt).toBeInstanceOf(Date);
      expect(stream.getViewerCount()).toBe(0);
    });

    test('should serialize to JSON', () => {
      const stream = new LiveStream({
        userId: 'user123',
        title: 'Test Stream',
        category: 'gaming'
      });

      const json = stream.toJSON();

      expect(json.streamId).toBeDefined();
      expect(json.userId).toBe('user123');
      expect(json.title).toBe('Test Stream');
      expect(json.category).toBe('gaming');
      expect(json.viewerCount).toBe(0);
    });
  });

  describe('StreamingService - Stream Management', () => {
    test('should create a live stream', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'My Stream',
        category: 'gaming'
      });

      expect(stream).toBeInstanceOf(LiveStream);
      expect(stream.streamId).toBeDefined();
      expect(stream.streamKey).toBeDefined();
      expect(stream.rtmpUrl).toContain('rtmp://');
      expect(stream.hlsUrl).toContain('/live/');
    });

    test('should get stream by ID', () => {
      const created = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      const retrieved = service.getStream(created.streamId);
      expect(retrieved).toBeDefined();
      expect(retrieved.streamId).toBe(created.streamId);
    });

    test('should get stream by key', () => {
      const created = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      const retrieved = service.getStreamByKey(created.streamKey);
      expect(retrieved).toBeDefined();
      expect(retrieved.streamId).toBe(created.streamId);
    });

    test('should get active streams', () => {
      service.createLiveStream({ userId: 'user1', title: 'Stream 1' });
      service.createLiveStream({ userId: 'user2', title: 'Stream 2' });

      const active = service.getActiveStreams();
      expect(active.length).toBe(2);
    });

    test('should delete stream', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'To Delete'
      });

      service.deleteStream(stream.streamId);

      const retrieved = service.getStream(stream.streamId);
      expect(retrieved).toBeUndefined();
    });

    test('should enforce max streams limit', () => {
      const limitedService = new StreamingService({
        maxLiveStreams: 2,
        storagePath: '/tmp/test',
        tempPath: '/tmp/test'
      });

      limitedService.createLiveStream({ userId: 'u1', title: 'S1' });
      limitedService.createLiveStream({ userId: 'u2', title: 'S2' });

      expect(() => {
        limitedService.createLiveStream({ userId: 'u3', title: 'S3' });
      }).toThrow('Maximum number of live streams reached');
    });
  });

  describe('StreamingService - Viewer Management', () => {
    test('should join stream as viewer', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      const result = service.joinStream(stream.streamId, 'peer123');

      expect(result.stream).toBeDefined();
      expect(result.hlsUrl).toBeDefined();
    });

    test('should throw error for non-existent stream', () => {
      expect(() => {
        service.joinStream('nonexistent', 'peer123');
      }).toThrow('Stream not found');
    });

    test('should leave stream', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      service.joinStream(stream.streamId, 'peer123');
      service.leaveStream(stream.streamId, 'peer123');

      expect(stream.getViewerCount()).toBe(0);
    });
  });

  describe('StreamingService - Chat', () => {
    test('should send chat message', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      const message = service.sendChatMessage(stream.streamId, {
        userId: 'viewer1',
        username: 'viewer_one',
        content: 'Hello world!'
      });

      expect(message.id).toBeDefined();
      expect(message.content).toBe('Hello world!');
      expect(message.userId).toBe('viewer1');
    });

    test('should sanitize chat messages', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      const message = service.sendChatMessage(stream.streamId, {
        userId: 'viewer1',
        username: 'viewer_one',
        content: '<script>alert("xss")</script>'
      });

      expect(message.content).not.toContain('<script>');
      expect(message.content).toContain('&lt;script&gt;');
    });

    test('should get chat history', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      service.sendChatMessage(stream.streamId, {
        userId: 'u1',
        username: 'user1',
        content: 'Message 1'
      });
      service.sendChatMessage(stream.streamId, {
        userId: 'u2',
        username: 'user2',
        content: 'Message 2'
      });

      const history = service.getChatHistory(stream.streamId, 10);
      expect(history.length).toBe(2);
    });

    test('should delete chat message', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      const message = service.sendChatMessage(stream.streamId, {
        userId: 'viewer1',
        username: 'viewer_one',
        content: 'To delete'
      });

      const deleted = service.deleteChatMessage(stream.streamId, message.id);
      expect(deleted).toBe(true);

      const history = service.getChatHistory(stream.streamId);
      expect(history.find(m => m.id === message.id)).toBeUndefined();
    });

    test('should throw for chat when disabled', () => {
      const stream = new LiveStream({
        userId: 'user123',
        title: 'Test',
        chatEnabled: false
      });
      service.liveStreams.set(stream.streamId, stream);
      service.chatMessages.set(stream.streamId, []);

      expect(() => {
        service.sendChatMessage(stream.streamId, {
          userId: 'viewer1',
          username: 'viewer_one',
          content: 'Hello'
        });
      }).toThrow('Chat is disabled');
    });
  });

  describe('StreamingService - Super Chats & Gifts', () => {
    test('should send super chat', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      const superChat = service.sendSuperChat(stream.streamId, {
        userId: 'viewer1',
        username: 'generous_viewer',
        amount: 10,
        message: 'Great stream!',
        color: '#ffd700'
      });

      expect(superChat.id).toBeDefined();
      expect(superChat.amount).toBe(10);
      expect(superChat.message).toBe('Great stream!');
    });

    test('should enforce minimum super chat amount', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      expect(() => {
        service.sendSuperChat(stream.streamId, {
          userId: 'viewer1',
          username: 'viewer',
          amount: 0.5
        });
      }).toThrow(`Minimum super chat amount is 1 NST`);
    });

    test('should get active super chats', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      service.sendSuperChat(stream.streamId, {
        userId: 'u1',
        username: 'user1',
        amount: 5
      });
      service.sendSuperChat(stream.streamId, {
        userId: 'u2',
        username: 'user2',
        amount: 10
      });

      const superChats = service.getActiveSuperChats(stream.streamId);
      expect(superChats.length).toBe(2);
    });

    test('should send gift', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      const gift = service.sendGift(stream.streamId, {
        userId: 'viewer1',
        username: 'viewer_one',
        giftType: 'rocket',
        count: 2
      });

      expect(gift.id).toBeDefined();
      expect(gift.giftType).toBe('rocket');
      expect(gift.count).toBe(2);
      expect(gift.totalAmount).toBe(50); // rocket = 25, count = 2
    });

    test('should calculate gift amount correctly', () => {
      const heartAmount = service.calculateGiftAmount('heart', 10);
      expect(heartAmount).toBe(10);

      const diamondAmount = service.calculateGiftAmount('diamond', 5);
      expect(diamondAmount).toBe(500);
    });
  });

  describe('StreamingService - Analytics', () => {
    test('should get stream analytics', () => {
      const stream = service.createLiveStream({
        userId: 'user123',
        title: 'Test'
      });

      service.joinStream(stream.streamId, 'viewer1');
      service.joinStream(stream.streamId, 'viewer2');
      service.sendChatMessage(stream.streamId, {
        userId: 'v1',
        username: 'viewer1',
        content: 'Hello'
      });

      const analytics = service.getStreamAnalytics(stream.streamId);

      expect(analytics.streamId).toBe(stream.streamId);
      expect(analytics.viewerCount).toBe(2);
      expect(analytics.peakViewers).toBe(2);
      expect(analytics.chatMessageCount).toBe(1);
    });

    test('should return null for non-existent stream analytics', () => {
      const analytics = service.getStreamAnalytics('nonexistent');
      expect(analytics).toBeNull();
    });

    test('should get global stats', () => {
      service.createLiveStream({ userId: 'u1', title: 'S1' });
      service.createLiveStream({ userId: 'u2', title: 'S2' });

      const stats = service.getGlobalStats();

      expect(stats.totalActiveStreams).toBe(2);
      expect(stats.transcodesInProgress).toBe(0);
    });
  });

  describe('HLSPackager', () => {
    test('should generate HLS playlist', () => {
      const packager = new HLSPackager();
      
      const segments = [
        { url: 'segment0.ts', duration: 6 },
        { url: 'segment1.ts', duration: 6 },
        { url: 'segment2.ts', duration: 6 }
      ];

      const playlist = packager.generatePlaylist(segments);

      expect(playlist).toContain('#EXTM3U');
      expect(playlist).toContain('#EXT-X-VERSION:3');
      expect(playlist).toContain('#EXT-X-TARGETDURATION:6');
      expect(playlist).toContain('#EXTINF:6.000,');
      expect(playlist).toContain('segment0.ts');
      expect(playlist).toContain('#EXT-X-ENDLIST');
    });

    test('should generate master playlist', () => {
      const packager = new HLSPackager();
      
      const qualities = [
        { name: '720p', width: 1280, height: 720, bitrate: 5000, playlistUrl: '720p.m3u8' },
        { name: '480p', width: 854, height: 480, bitrate: 2500, playlistUrl: '480p.m3u8' }
      ];

      const master = packager.generateMasterPlaylist(qualities);

      expect(master).toContain('#EXTM3U');
      expect(master).toContain('RESOLUTION=1280x720');
      expect(master).toContain('BANDWIDTH=5000000');
      expect(master).toContain('720p.m3u8');
    });
  });

  describe('Quality Levels', () => {
    test('should have all standard resolutions', () => {
      expect(QUALITY_LEVELS['144p']).toBeDefined();
      expect(QUALITY_LEVELS['240p']).toBeDefined();
      expect(QUALITY_LEVELS['360p']).toBeDefined();
      expect(QUALITY_LEVELS['480p']).toBeDefined();
      expect(QUALITY_LEVELS['720p']).toBeDefined();
      expect(QUALITY_LEVELS['1080p']).toBeDefined();
      expect(QUALITY_LEVELS['1440p']).toBeDefined();
      expect(QUALITY_LEVELS['4k']).toBeDefined();
    });

    test('should have correct dimensions', () => {
      expect(QUALITY_LEVELS['720p'].width).toBe(1280);
      expect(QUALITY_LEVELS['720p'].height).toBe(720);
      expect(QUALITY_LEVELS['1080p'].width).toBe(1920);
      expect(QUALITY_LEVELS['1080p'].height).toBe(1080);
    });

    test('should have increasing bitrates', () => {
      const resolutions = ['144p', '240p', '360p', '480p', '720p', '1080p'];
      let prevBitrate = 0;

      for (const res of resolutions) {
        expect(QUALITY_LEVELS[res].bitrate).toBeGreaterThan(prevBitrate);
        prevBitrate = QUALITY_LEVELS[res].bitrate;
      }
    });
  });

  describe('TranscodeJob', () => {
    test('should create transcode job', () => {
      const job = new TranscodeJob({
        videoId: 'video123',
        sourcePath: '/path/to/video.mp4',
        outputDir: '/path/to/output',
        resolutions: ['720p', '480p']
      });

      expect(job.jobId).toBeDefined();
      expect(job.videoId).toBe('video123');
      expect(job.status).toBe(TRANSCODE_STATUS.PENDING);
      expect(job.resolutions).toEqual(['720p', '480p']);
    });

    test('should serialize to JSON', () => {
      const job = new TranscodeJob({
        videoId: 'video123',
        sourcePath: '/path/to/video.mp4',
        outputDir: '/path/to/output'
      });

      const json = job.toJSON();

      expect(json.jobId).toBeDefined();
      expect(json.videoId).toBe('video123');
      expect(json.status).toBe(TRANSCODE_STATUS.PENDING);
    });
  });
});
