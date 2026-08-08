package storage

import (
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/google/uuid"
)

/*
 * NexaStream Video Storage
 * 
 * This module provides video storage using IPFS for content addressing
 * and distributed storage across the network.
 * 
 * Features:
 * - Video chunking and upload to IPFS
 * - Content addressing with CIDs
 * - Replication across storage nodes
 * - Content availability tracking
 * - HLS manifest generation
 */

// VideoChunk represents a chunk of a video file
type VideoChunk struct {
	ID          string
	Index       int
	CID         string // IPFS Content ID
	Size        int64
	Hash        []byte
	UploadedAt  time.Time
	StorageNode string
}

// VideoMetadata contains video metadata stored on IPFS
type VideoMetadata struct {
	ID            string
	Title         string
	Description   string
	CID           string // Root CID for video chunks
	Chunks        []string // CIDs for all chunks
	ThumbnailCID  string
	Duration      int // in seconds
	Size          int64 // total size in bytes
	MimeType      string
	UploadedBy    string
	UploadedAt    time.Time
	Category      string
	Tags          []string
	Language      string
	License       string
	Views         uint64
	Likes         uint64
	Reputation    float64 // Content quality score
}

// VideoStore provides video storage functionality
type VideoStore struct {
	ipfs        *IPFSClient
	metadata    map[string]*VideoMetadata
	chunks      map[string][]*VideoChunk
	mu          sync.RWMutex
	config      *VideoStoreConfig
	replication int
}

// VideoStoreConfig holds video store configuration
type VideoStoreConfig struct {
	ChunkSize       int // Size of each chunk in bytes
	MinReplicas     int // Minimum number of replicas
	TargetReplicas  int // Target number of replicas
	MaxFileSize     int64 // Maximum file size
	EnableTranscode bool // Enable video transcoding
}

// DefaultVideoStoreConfig returns default configuration
func DefaultVideoStoreConfig() *VideoStoreConfig {
	return &VideoStoreConfig{
		ChunkSize:       4 * 1024 * 1024, // 4MB
		MinReplicas:     3,
		TargetReplicas:  5,
		MaxFileSize:     10 * 1024 * 1024 * 1024, // 10GB
		EnableTranscode: true,
	}
}

// NewVideoStore creates a new video store
func NewVideoStore(ipfs *IPFSClient, config *VideoStoreConfig) *VideoStore {
	if config == nil {
		config = DefaultVideoStoreConfig()
	}

	return &VideoStore{
		ipfs:        ipfs,
		metadata:    make(map[string]*VideoMetadata),
		chunks:      make(map[string][]*VideoChunk),
		config:      config,
		replication: config.TargetReplicas,
	}
}

// UploadVideo uploads a video to IPFS storage
func (vs *VideoStore) UploadVideo(ctx context.Context, reader io.Reader, metadata *VideoMetadata) (*VideoMetadata, error) {
	// Generate video ID
	if metadata.ID == "" {
		metadata.ID = fmt.Sprintf("video_%s", uuid.New().String())
	}
	metadata.UploadedAt = time.Now()

	// Read all data
	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read video data: %w", err)
	}

	// Check file size
	if int64(len(data)) > vs.config.MaxFileSize {
		return nil, fmt.Errorf("file too large: %d bytes (max: %d)", len(data), vs.config.MaxFileSize)
	}

	// Calculate total size
	metadata.Size = int64(len(data))

	// Chunk the video
	chunkSize := vs.config.ChunkSize
	var chunks []string

	for i := 0; i < len(data); i += chunkSize {
		end := i + chunkSize
		if end > len(data) {
			end = len(data)
		}

		chunkData := data[i:end]
		
		// Upload chunk to IPFS
		cid, err := vs.ipfs.Upload(ctx, chunkData)
		if err != nil {
			return nil, fmt.Errorf("failed to upload chunk %d: %w", i/chunkSize, err)
		}

		chunks = append(chunks, cid)
		metadata.Chunks = append(metadata.Chunks, cid)

		// Pin chunk for persistence
		if err := vs.ipfs.Pin(ctx, cid); err != nil {
			fmt.Printf("Warning: Failed to pin chunk %s: %v\n", cid, err)
		}
	}

	// Upload metadata to IPFS
	metadata.CID = chunks[0] // Use first chunk as root
	metadata.Duration = metadata.Duration // Set from caller

	// Store metadata locally
	vs.mu.Lock()
	vs.metadata[metadata.ID] = metadata
	vs.mu.Unlock()

	fmt.Printf("VideoStore: Uploaded %s with %d chunks\n", metadata.ID, len(chunks))

	return metadata, nil
}

// UploadThumbnail uploads a video thumbnail to IPFS
func (vs *VideoStore) UploadThumbnail(ctx context.Context, reader io.Reader) (string, error) {
	data, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read thumbnail: %w", err)
	}

	cid, err := vs.ipfs.Upload(ctx, data)
	if err != nil {
		return "", fmt.Errorf("failed to upload thumbnail: %w", err)
	}

	// Pin for persistence
	if err := vs.ipfs.Pin(ctx, cid); err != nil {
		fmt.Printf("Warning: Failed to pin thumbnail %s: %v\n", cid, err)
	}

	return cid, nil
}

// GetVideo retrieves a video by ID
func (vs *VideoStore) GetVideo(ctx context.Context, videoID string) (*VideoMetadata, error) {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	metadata, ok := vs.metadata[videoID]
	if !ok {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	return metadata, nil
}

// GetVideoChunk retrieves a specific chunk of a video
func (vs *VideoStore) GetVideoChunk(ctx context.Context, videoID string, chunkIndex int) ([]byte, error) {
	vs.mu.RLock()
	metadata, ok := vs.metadata[videoID]
	vs.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	if chunkIndex < 0 || chunkIndex >= len(metadata.Chunks) {
		return nil, fmt.Errorf("invalid chunk index: %d", chunkIndex)
	}

	return vs.ipfs.Download(ctx, metadata.Chunks[chunkIndex])
}

// GetAllChunks retrieves all chunks of a video
func (vs *VideoStore) GetAllChunks(ctx context.Context, videoID string) ([][]byte, error) {
	vs.mu.RLock()
	metadata, ok := vs.metadata[videoID]
	vs.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	var chunks [][]byte
	for _, cid := range metadata.Chunks {
		data, err := vs.ipfs.Download(ctx, cid)
		if err != nil {
			return nil, fmt.Errorf("failed to download chunk %s: %w", cid, err)
		}
		chunks = append(chunks, data)
	}

	return chunks, nil
}

// CheckAvailability checks how many replicas are available for a video
func (vs *VideoStore) CheckAvailability(ctx context.Context, videoID string) (*AvailabilityStatus, error) {
	vs.mu.RLock()
	metadata, ok := vs.metadata[videoID]
	vs.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	available := 0
	for _, cid := range metadata.Chunks {
		providers, err := vs.ipfs.FindProviders(ctx, cid)
		if err == nil && len(providers) > 0 {
			available++
		}
	}

	return &AvailabilityStatus{
		VideoID:          videoID,
		TotalChunks:      len(metadata.Chunks),
		AvailableReplicas: available,
		MinRequired:      vs.config.MinReplicas,
		IsAvailable:      available >= vs.config.MinReplicas,
	}, nil
}

// AvailabilityStatus represents content availability
type AvailabilityStatus struct {
	VideoID           string
	TotalChunks       int
	AvailableReplicas int
	MinRequired       int
	IsAvailable       bool
}

// ReplicateContent requests replication of content
func (vs *VideoStore) ReplicateContent(ctx context.Context, videoID string) error {
	vs.mu.RLock()
	metadata, ok := vs.metadata[videoID]
	vs.mu.RUnlock()

	if !ok {
		return fmt.Errorf("video not found: %s", videoID)
	}

	// Announce content to network
	for _, cid := range metadata.Chunks {
		if err := vs.ipfs.Provide(ctx, cid); err != nil {
			fmt.Printf("Warning: Failed to announce %s: %v\n", cid, err)
		}
	}

	fmt.Printf("VideoStore: Announced content %s for replication\n", videoID)
	return nil
}

// DeleteVideo removes a video from storage
func (vs *VideoStore) DeleteVideo(ctx context.Context, videoID string) error {
	vs.mu.Lock()
	defer vs.mu.Unlock()

	metadata, ok := vs.metadata[videoID]
	if !ok {
		return fmt.Errorf("video not found: %s", videoID)
	}

	// Unpin all chunks
	for _, cid := range metadata.Chunks {
		if err := vs.ipfs.Unpin(ctx, cid); err != nil {
			fmt.Printf("Warning: Failed to unpin %s: %v\n", cid, err)
		}
	}

	// Unpin thumbnail
	if metadata.ThumbnailCID != "" {
		if err := vs.ipfs.Unpin(ctx, metadata.ThumbnailCID); err != nil {
			fmt.Printf("Warning: Failed to unpin thumbnail %s: %v\n", metadata.ThumbnailCID, err)
		}
	}

	// Remove from local storage
	delete(vs.metadata, videoID)
	delete(vs.chunks, videoID)

	fmt.Printf("VideoStore: Deleted video %s\n", videoID)
	return nil
}

// ListVideos returns all videos
func (vs *VideoStore) ListVideos() []*VideoMetadata {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	videos := make([]*VideoMetadata, 0, len(vs.metadata))
	for _, metadata := range vs.metadata {
		videos = append(videos, metadata)
	}

	return videos
}

// GetStorageStats returns storage statistics
func (vs *VideoStore) GetStorageStats() *StorageStats {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	var totalSize int64
	var totalChunks int

	for _, metadata := range vs.metadata {
		totalSize += metadata.Size
		totalChunks += len(metadata.Chunks)
	}

	return &StorageStats{
		TotalVideos:    len(vs.metadata),
		TotalChunks:   totalChunks,
		TotalSize:     totalSize,
		Replicas:      vs.replication,
		MinReplicas:   vs.config.MinReplicas,
	}
}

// StorageStats holds storage statistics
type StorageStats struct {
	TotalVideos  int
	TotalChunks  int
	TotalSize    int64
	Replicas     int
	MinReplicas  int
}

// GenerateHLSManifest generates an HLS manifest for adaptive streaming
func (vs *VideoStore) GenerateHLSManifest(videoID string, chunkDuration int) (string, error) {
	vs.mu.RLock()
	metadata, ok := vs.metadata[videoID]
	vs.mu.RUnlock()

	if !ok {
		return "", fmt.Errorf("video not found: %s", videoID)
	}

	// Generate simple HLS manifest
	manifest := "#EXTM3U\n"
	manifest += "#EXT-X-VERSION:3\n"
	manifest += "#EXT-X-TARGETDURATION:" + fmt.Sprintf("%d\n", chunkDuration)
	manifest += "#EXT-X-MEDIA-SEQUENCE:0\n"

	for i, cid := range metadata.Chunks {
		manifest += fmt.Sprintf("#EXTINF:%.1f,\n", float64(chunkDuration))
		manifest += fmt.Sprintf("/api/video/%s/chunk/%d?cid=%s\n", videoID, i, cid)
	}

	manifest += "#EXT-X-ENDLIST\n"

	return manifest, nil
}
