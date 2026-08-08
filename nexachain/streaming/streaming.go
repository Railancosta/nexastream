package streaming

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

const (
	// Video resolutions
	Resolution144p  = "144p"
	Resolution240p  = "240p"
	Resolution360p  = "360p"
	Resolution480p  = "480p"
	Resolution720p  = "720p"
	Resolution1080p = "1080p"
	Resolution1440p = "1440p"
	Resolution4K    = "4k"
	Resolution8K    = "8k"

	// Video formats
	FormatHLS  = "hls"
	FormatDASH = "dash"

	// Segment duration
	DefaultSegmentDuration = 6 // seconds
)

// ResolutionConfig defines video resolution settings
type ResolutionConfig struct {
	Name      string
	Width     int
	Height    int
	Bitrate   int // kbps
	FPS       int
	Profile   string
}

// GetResolutions returns all supported resolutions
func GetResolutions() []ResolutionConfig {
	return []ResolutionConfig{
		{Name: Resolution144p, Width: 256, Height: 144, Bitrate: 400, FPS: 30, Profile: "baseline"},
		{Name: Resolution240p, Width: 426, Height: 240, Bitrate: 700, FPS: 30, Profile: "baseline"},
		{Name: Resolution360p, Width: 640, Height: 360, Bitrate: 1000, FPS: 30, Profile: "main"},
		{Name: Resolution480p, Width: 854, Height: 480, Bitrate: 2500, FPS: 30, Profile: "main"},
		{Name: Resolution720p, Width: 1280, Height: 720, Bitrate: 5000, FPS: 30, Profile: "high"},
		{Name: Resolution1080p, Width: 1920, Height: 1080, Bitrate: 8000, FPS: 30, Profile: "high"},
		{Name: Resolution1440p, Width: 2560, Height: 1440, Bitrate: 16000, FPS: 30, Profile: "high"},
		{Name: Resolution4K, Width: 3840, Height: 2160, Bitrate: 35000, FPS: 30, Profile: "high"},
		{Name: Resolution8K, Width: 7680, Height: 4320, Bitrate: 80000, FPS: 30, Profile: "high"},
	}
}

// VideoMetadata contains video metadata
type VideoMetadata struct {
	VideoID       string
	Title         string
	Description   string
	Duration      time.Duration
	FileSize      int64
	Format        string
	Resolutions   []string
	UploadedAt    time.Time
	UploadedBy    string
	ThumbnailURL  string
	HLSManifest   string
	DASHManifest  string
	Segments      map[string][]string // resolution -> segment URLs
	Captions      map[string]string   // language -> caption URL
	Chapters      []Chapter
	Tags          []string
	Category      string
	License       string
	Visibility    string // public, private, unlisted
}

// Chapter represents a video chapter
type Chapter struct {
	Title     string
	StartTime time.Duration
	EndTime   time.Duration
}

// TranscodingJob represents a transcoding job
type TranscodingJob struct {
	JobID       string
	VideoID     string
	Status      string // pending, processing, completed, failed
	Progress    float64
	SourceFile  string
	OutputDir   string
	Resolutions []string
	Error       string
	StartedAt   time.Time
	CompletedAt time.Time
	Mu          sync.RWMutex
}

// StreamingService handles video streaming
type StreamingService struct {
	config        StreamingConfig
	storagePath   string
	cdnBaseURL    string
	transcoder    *Transcoder
	segmentCache  *SegmentCache
	liveStreams   map[string]*LiveStream
	mu            sync.RWMutex
}

// StreamingConfig holds streaming configuration
type StreamingConfig struct {
	StoragePath       string
	CDNBaseURL        string
	SegmentDuration   int
	EnableAdaptiveBitrate bool
	MaxConcurrentTranscodes int
	TempPath          string
	FFmpegPath        string
}

// DefaultStreamingConfig returns the default streaming configuration
func DefaultStreamingConfig() StreamingConfig {
	return StreamingConfig{
		StoragePath:           "./storage/videos",
		CDNBaseURL:           "https://cdn.nexastream.org",
		SegmentDuration:      DefaultSegmentDuration,
		EnableAdaptiveBitrate: true,
		MaxConcurrentTranscodes: 4,
		TempPath:             "./storage/temp",
		FFmpegPath:           "ffmpeg",
	}
}

// NewStreamingService creates a new streaming service
func NewStreamingService(config StreamingConfig) *StreamingService {
	ss := &StreamingService{
		config:       config,
		storagePath:  config.StoragePath,
		cdnBaseURL:   config.CDNBaseURL,
		transcoder:   NewTranscoder(config),
		segmentCache: NewSegmentCache(1000),
		liveStreams: make(map[string]*LiveStream),
	}

	// Create directories
	os.MkdirAll(config.StoragePath, 0755)
	os.MkdirAll(config.TempPath, 0755)

	return ss
}

// UploadVideo processes and stores a video
func (ss *StreamingService) UploadVideo(ctx context.Context, videoID string, input io.Reader, metadata *VideoMetadata) error {
	// Create video directory
	videoDir := filepath.Join(ss.storagePath, videoID)
	if err := os.MkdirAll(videoDir, 0755); err != nil {
		return fmt.Errorf("failed to create video directory: %w", err)
	}

	// Save original file
	inputPath := filepath.Join(videoDir, "original")
	file, err := os.Create(inputPath)
	if err != nil {
		return fmt.Errorf("failed to create input file: %w", err)
	}
	defer file.Close()

	written, err := io.Copy(file, input)
	if err != nil {
		return fmt.Errorf("failed to write video: %w", err)
	}
	metadata.FileSize = written

	// Start transcoding jobs
	go ss.transcoder.Transcode(ctx, videoID, inputPath, videoDir, metadata.Resolutions)

	return nil
}

// Transcode starts video transcoding for all resolutions
func (ss *StreamingService) Transcode(ctx context.Context, videoID, inputPath, outputDir string, resolutions []string) error {
	return ss.transcoder.Transcode(ctx, videoID, inputPath, outputDir, resolutions)
}

// GenerateHLS generates HLS manifest
func (ss *StreamingService) GenerateHLS(videoID, resolution, segmentDir string) (string, error) {
	manifestPath := filepath.Join(segmentDir, resolution, "playlist.m3u8")

	// In production, this would use FFmpeg to generate the manifest
	// For now, we return a placeholder path
	return manifestPath, nil
}

// GetStreamURL returns the stream URL for a video
func (ss *StreamingService) GetStreamURL(videoID, resolution, format string) string {
	if format == FormatDASH {
		return fmt.Sprintf("%s/videos/%s/%s/manifest.mpd", ss.cdnBaseURL, videoID, resolution)
	}
	return fmt.Sprintf("%s/videos/%s/%s/playlist.m3u8", ss.cdnBaseURL, videoID, resolution)
}

// SegmentCache caches video segments
type SegmentCache struct {
	segments map[string]*CachedSegment
	maxSize  int
	mu       sync.RWMutex
}

// CachedSegment represents a cached video segment
type CachedSegment struct {
	VideoID   string
	SegmentID string
	Data      []byte
	ExpiresAt time.Time
	AccessAt  time.Time
}

// NewSegmentCache creates a new segment cache
func NewSegmentCache(maxSize int) *SegmentCache {
	return &SegmentCache{
		segments: make(map[string]*CachedSegment),
		maxSize:  maxSize,
	}
}

// Get retrieves a segment from cache
func (sc *SegmentCache) Get(videoID, segmentID string) []byte {
	key := sc.makeKey(videoID, segmentID)
	sc.mu.RLock()
	defer sc.mu.RUnlock()

	segment, ok := sc.segments[key]
	if !ok {
		return nil
	}

	if time.Now().After(segment.ExpiresAt) {
		return nil
	}

	segment.AccessAt = time.Now()
	return segment.Data
}

// Put stores a segment in cache
func (sc *SegmentCache) Put(videoID, segmentID string, data []byte, ttl time.Duration) {
	key := sc.makeKey(videoID, segmentID)
	sc.mu.Lock()
	defer sc.mu.Unlock()

	sc.evictIfNeeded()

	sc.segments[key] = &CachedSegment{
		VideoID:   videoID,
		SegmentID: segmentID,
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
		AccessAt:  time.Now(),
	}
}

// evictIfNeeded removes old segments if cache is full
func (sc *SegmentCache) evictIfNeeded() {
	if len(sc.segments) < sc.maxSize {
		return
	}

	var oldest *CachedSegment
	oldestKey := ""

	for key, segment := range sc.segments {
		if oldest == nil || segment.AccessAt.Before(oldest.AccessAt) {
			oldest = segment
			oldestKey = key
		}
	}

	if oldestKey != "" {
		delete(sc.segments, oldestKey)
	}
}

// makeKey creates a cache key
func (sc *SegmentCache) makeKey(videoID, segmentID string) string {
	return fmt.Sprintf("%s:%s", videoID, segmentID)
}

// Transcoder handles video transcoding
type Transcoder struct {
	config StreamingConfig
	mu     sync.RWMutex
}

// NewTranscoder creates a new transcoder
func NewTranscoder(config StreamingConfig) *Transcoder {
	return &Transcoder{config: config}
}

// Transcode transcode a video to multiple resolutions
func (t *Transcoder) Transcode(ctx context.Context, videoID, inputPath, outputDir string, resolutions []string) error {
	if len(resolutions) == 0 {
		resolutions = []string{Resolution360p, Resolution480p, Resolution720p, Resolution1080p}
	}

	var wg sync.WaitGroup
	errors := make([]error, 0)
	errorMu := sync.Mutex{}

	for _, res := range resolutions {
		wg.Add(1)
		go func(resolution string) {
			defer wg.Done()
			if err := t.transcodeToResolution(ctx, videoID, inputPath, outputDir, resolution); err != nil {
				errorMu.Lock()
				errors = append(errors, err)
				errorMu.Unlock()
			}
		}(res)
	}

	wg.Wait()

	if len(errors) > 0 {
		return fmt.Errorf("transcoding errors: %v", errors)
	}

	return nil
}

// transcodeToResolution transcode video to a specific resolution
func (t *Transcoder) transcodeToResolution(ctx context.Context, videoID, inputPath, outputDir, resolution string) error {
	resConfig := t.getResolutionConfig(resolution)
	if resConfig == nil {
		return fmt.Errorf("unsupported resolution: %s", resolution)
	}

	outputSubDir := filepath.Join(outputDir, resolution)
	if err := os.MkdirAll(outputSubDir, 0755); err != nil {
		return err
	}

	// Check if FFmpeg is available
	ffmpegPath := t.config.FFmpegPath
	cmd := exec.Command(ffmpegPath, "-version")
	if err := cmd.Run(); err != nil {
		// FFmpeg not available, create placeholder manifest
		manifestPath := filepath.Join(outputSubDir, "playlist.m3u8")
		return t.createPlaceholderManifest(manifestPath, resolution)
	}

	// Build FFmpeg command
	outputFile := filepath.Join(outputSubDir, "playlist.m3u8")
	args := []string{
		"-i", inputPath,
		"-vf", fmt.Sprintf("scale=%d:%d", resConfig.Width, resConfig.Height),
		"-c:v", "libx264",
		"-preset", "medium",
		"-crf", "23",
		"-b:v", fmt.Sprintf("%dk", resConfig.Bitrate),
		"-c:a", "aac",
		"-b:a", "128k",
		"-f", "hls",
		"-hls_time", fmt.Sprintf("%d", t.config.SegmentDuration),
		"-hls_list_size", "0",
		"-hls_segment_filename", filepath.Join(outputSubDir, "segment_%03d.ts"),
		outputFile,
	}

	cmd = exec.CommandContext(ctx, ffmpegPath, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// getResolutionConfig returns resolution configuration
func (t *Transcoder) getResolutionConfig(resolution string) *ResolutionConfig {
	for _, res := range GetResolutions() {
		if res.Name == resolution {
			return &res
		}
	}
	return nil
}

// createPlaceholderManifest creates a placeholder HLS manifest
func (t *Transcoder) createPlaceholderManifest(manifestPath, resolution string) error {
	content := fmt.Sprintf(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:%d
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:%.1f,
segment_000.ts
#EXT-X-ENDLIST
`, t.config.SegmentDuration, float64(t.config.SegmentDuration))

	return os.WriteFile(manifestPath, []byte(content), 0644)
}

// LiveStream represents a live streaming session
type LiveStream struct {
	StreamID     string
	Title        string
	 Broadcaster string
	Status       string // idle, live, ended
	Key          string
	Viewers      int
	StartedAt    time.Time
	EndedAt      time.Time
	Quality      string
	Mu           sync.RWMutex
}

// AdaptiveBitrate manages adaptive bitrate streaming
type AdaptiveBitrate struct {
	segments map[string]*SegmentQuality
	mu       sync.RWMutex
}

// SegmentQuality represents segment quality information
type SegmentQuality struct {
	Resolution string
	Bitrate   int
	URL       string
	Buffer    time.Duration
	Latency   time.Duration
}

// NewAdaptiveBitrate creates a new ABR manager
func NewAdaptiveBitrate() *AdaptiveBitrate {
	return &AdaptiveBitrate{
		segments: make(map[string]*SegmentQuality),
	}
}

// GetBestQuality returns the best quality for current bandwidth
func (abr *AdaptiveBitrate) GetBestQuality(availableBandwidth int64, qualityOptions []ResolutionConfig) *ResolutionConfig {
	if len(qualityOptions) == 0 {
		return nil
	}

	// Sort by bitrate descending
	for i := 0; i < len(qualityOptions)-1; i++ {
		for j := i + 1; j < len(qualityOptions); j++ {
			if qualityOptions[i].Bitrate > qualityOptions[j].Bitrate {
				qualityOptions[i], qualityOptions[j] = qualityOptions[j], qualityOptions[i]
			}
		}
	}

	// Find highest quality that fits bandwidth
	bandwidthKbps := availableBandwidth * 8 / 1000

	for _, quality := range qualityOptions {
		if quality.Bitrate <= int(bandwidthKbps) {
			return &quality
		}
	}

	// Return lowest quality as fallback
	return &qualityOptions[len(qualityOptions)-1]
}

// CalculateHealth calculates streaming health metrics
func (abr *AdaptiveBitrate) CalculateHealth() map[string]interface{} {
	abr.mu.RLock()
	defer abr.mu.RUnlock()

	totalSegments := len(abr.segments)
	avgBitrate := 0
	avgBuffer := time.Duration(0)

	for _, seg := range abr.segments {
		avgBitrate += seg.Bitrate
		avgBuffer += seg.Buffer
	}

	if totalSegments > 0 {
		avgBitrate /= totalSegments
		avgBuffer /= time.Duration(totalSegments)
	}

	return map[string]interface{}{
		"total_segments": totalSegments,
		"avg_bitrate_kbps": avgBitrate,
		"avg_buffer_sec": avgBuffer.Seconds(),
		"health_score": calculateHealthScore(avgBitrate, avgBuffer),
	}
}

// calculateHealthScore calculates overall health score
func calculateHealthScore(avgBitrate int, avgBuffer time.Duration) float64 {
	// Simple health calculation
	bitrateScore := math.Min(float64(avgBitrate)/8000.0, 1.0) * 50
	bufferScore := math.Min(avgBuffer.Seconds()/30.0, 1.0) * 50
	return bitrateScore + bufferScore
}

// StreamManager manages streaming sessions
type StreamManager struct {
	streams map[string]*StreamingService
	mu      sync.RWMutex
}

// NewStreamManager creates a new stream manager
func NewStreamManager() *StreamManager {
	return &StreamManager{
		streams: make(map[string]*StreamingService),
	}
}

// Register registers a streaming service
func (sm *StreamManager) Register(id string, service *StreamingService) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.streams[id] = service
}

// Get retrieves a streaming service
func (sm *StreamManager) Get(id string) *StreamingService {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.streams[id]
}

// StreamingStats holds streaming statistics
type StreamingStats struct {
	TotalVideos     int
	TotalViews      int64
	TotalBandwidth  int64
	ActiveStreams    int
	TranscodingJobs  int
	AvgLatency      time.Duration
	CacheHitRate    float64
}

// GetStats returns streaming statistics
func (ss *StreamingService) GetStats() *StreamingStats {
	return &StreamingStats{
		TotalVideos:     len(ss.liveStreams),
		TotalViews:      0,
		TotalBandwidth:  0,
		ActiveStreams:   ss.getActiveStreamCount(),
		TranscodingJobs: ss.transcoder.getJobCount(),
		AvgLatency:      0,
		CacheHitRate:    ss.segmentCache.getHitRate(),
	}
}

// getActiveStreamCount returns the number of active streams
func (ss *StreamingService) getActiveStreamCount() int {
	ss.mu.RLock()
	defer ss.mu.RUnlock()

	count := 0
	for _, stream := range ss.liveStreams {
		if stream.Status == "live" {
			count++
		}
	}
	return count
}

// getJobCount returns the number of active transcoding jobs
func (t *Transcoder) getJobCount() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return 0 // Placeholder
}

// getHitRate returns the cache hit rate
func (sc *SegmentCache) getHitRate() float64 {
	return 0.0 // Placeholder
}

// EncodeVideoMetadata encodes video metadata to JSON
func EncodeVideoMetadata(metadata *VideoMetadata) ([]byte, error) {
	return json.Marshal(metadata)
}

// DecodeVideoMetadata decodes video metadata from JSON
func DecodeVideoMetadata(data []byte) (*VideoMetadata, error) {
	var metadata VideoMetadata
	err := json.Unmarshal(data, &metadata)
	return &metadata, err
}

// GenerateVideoID generates a unique video ID
func GenerateVideoID(title string, timestamp time.Time) string {
	data := fmt.Sprintf("%s-%d", title, timestamp.UnixNano())
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])[:16]
}

// ValidateResolution checks if a resolution is supported
func ValidateResolution(resolution string) bool {
	for _, res := range GetResolutions() {
		if res.Name == resolution {
			return true
		}
	}
	return false
}

// CalculateBitrate calculates recommended bitrate for resolution
func CalculateBitrate(resolution string) int {
	for _, res := range GetResolutions() {
		if res.Name == resolution {
			return res.Bitrate
		}
	}
	return 1000 // Default 1 Mbps
}

// EstimateTranscodingTime estimates transcoding time based on duration and resolutions
func EstimateTranscodingTime(duration time.Duration, resolutions []string) time.Duration {
	// Rough estimate: 1x for first resolution, 0.7x for each additional
	baseTime := duration
	if len(resolutions) > 0 {
		baseTime = duration
		for i := 1; i < len(resolutions); i++ {
			baseTime += time.Duration(float64(duration) * 0.7)
		}
	}
	return baseTime
}
