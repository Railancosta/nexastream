package storage

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"sync"
	"time"

	"github.com/nexastream/nexachain/crypto"
)

const (
	// Storage constants
	DefaultFragmentSize     = 1024 * 1024 * 4 // 4MB fragments
	MinReplicationFactor    = 3
	MaxReplicationFactor    = 10
	DefaultReplicationFactor = 5
	ChunkSize               = 256 * 1024 // 256KB chunks
	MaxStorageNodes         = 30000
)

// StorageNode represents a node in the distributed storage network
type StorageNode struct {
	ID            string
	Address       string
	Port          int
	PublicKey     []byte
	StorageCapacity uint64 // in bytes
	UsedStorage   uint64  // in bytes
	Reputation    float64
	LastPing      time.Time
	IsOnline      bool
	Region        string
	Bandwidth     uint64 // bytes per second
	mu            sync.RWMutex
}

// NewStorageNode creates a new storage node
func NewStorageNode(id, address string, port int, capacity uint64) *StorageNode {
	return &StorageNode{
		ID:              id,
		Address:         address,
		Port:            port,
		StorageCapacity: capacity,
		Reputation:      100.0,
		LastPing:        time.Now(),
		IsOnline:        true,
		Bandwidth:       100 * 1024 * 1024, // 100 MB/s default
	}
}

// Fragment represents a data fragment stored across the network
type Fragment struct {
	ID          string
	Data        []byte
	Checksum    []byte
	Index       int
	TotalCount  int
	OriginalHash []byte
	CreatedAt   time.Time
	ExpiresAt   time.Time
	StorageNode string
}

// FileMetadata contains metadata about a stored file
type FileMetadata struct {
	FileID          string
	FileName        string
	FileSize        uint64
	MimeType        string
	Fragments       []string // Fragment IDs
	ReedSolomonData []byte   // Reed-Solomon parity data
	TotalFragments  int
	ReplicationFactor int
	UploadedAt      time.Time
	ExpiresAt       time.Time
	Owner           []byte
	EncryptionKey   []byte
	Metadata        map[string]string
}

// DistributedStorage represents the distributed storage system
type DistributedStorage struct {
	nodes      map[string]*StorageNode
	files      map[string]*FileMetadata
	fragments  map[string]*Fragment
	mu         sync.RWMutex
	config     StorageConfig
	networkID  uint64
}

// StorageConfig holds storage configuration
type StorageConfig struct {
	FragmentSize       int
	ReplicationFactor  int
	MinNodesRequired   int
	ChecksumAlgorithm  string
	EnableCompression  bool
	EnableEncryption   bool
	MaxFileSize        uint64
	CacheSize          uint64
}

// DefaultStorageConfig returns the default storage configuration
func DefaultStorageConfig() StorageConfig {
	return StorageConfig{
		FragmentSize:       DefaultFragmentSize,
		ReplicationFactor:  DefaultReplicationFactor,
		MinNodesRequired:   3,
		ChecksumAlgorithm:  "sha256",
		EnableCompression:  true,
		EnableEncryption:   true,
		MaxFileSize:        100 * 1024 * 1024 * 1024, // 100GB
		CacheSize:          10 * 1024 * 1024 * 1024, // 10GB
	}
}

// NewDistributedStorage creates a new distributed storage instance
func NewDistributedStorage(networkID uint64) *DistributedStorage {
	return &DistributedStorage{
		nodes:     make(map[string]*StorageNode),
		files:     make(map[string]*FileMetadata),
		fragments: make(map[string]*Fragment),
		config:    DefaultStorageConfig(),
		networkID: networkID,
	}
}

// RegisterNode registers a new storage node
func (ds *DistributedStorage) RegisterNode(node *StorageNode) error {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	if len(ds.nodes) >= MaxStorageNodes {
		return errors.New("maximum storage nodes reached")
	}

	node.PublicKey = crypto.Hash256([]byte(node.ID))
	ds.nodes[node.ID] = node
	return nil
}

// UnregisterNode removes a storage node
func (ds *DistributedStorage) UnregisterNode(nodeID string) error {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	if _, ok := ds.nodes[nodeID]; !ok {
		return errors.New("node not found")
	}

	delete(ds.nodes, nodeID)
	return nil
}

// GetActiveNodes returns all active storage nodes
func (ds *DistributedStorage) GetActiveNodes() []*StorageNode {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	nodes := make([]*StorageNode, 0)
	for _, node := range ds.nodes {
		if node.IsOnline {
			nodes = append(nodes, node)
		}
	}
	return nodes
}

// SelectNodesForStorage selects the best nodes for storing fragments
func (ds *DistributedStorage) SelectNodesForStorage(count int, excludeIDs []string) ([]*StorageNode, error) {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	excludeMap := make(map[string]bool)
	for _, id := range excludeIDs {
		excludeMap[id] = true
	}

	available := make([]*StorageNode, 0)
	for _, node := range ds.nodes {
		if node.IsOnline && !excludeMap[node.ID] {
			if node.StorageCapacity-node.UsedStorage > uint64(ds.config.FragmentSize) {
				available = append(available, node)
			}
		}
	}

	if len(available) < count {
		return nil, fmt.Errorf("insufficient nodes: need %d, have %d", count, len(available))
	}

	// Sort by reputation and select top nodes
	shuffleNodes(available)
	sortByReputation(available)
	
	if len(available) > count {
		available = available[:count]
	}

	return available, nil
}

// shuffleNodes shuffles nodes for random selection
func shuffleNodes(nodes []*StorageNode) {
	rand.Shuffle(len(nodes), func(i, j int) {
		nodes[i], nodes[j] = nodes[j], nodes[i]
	})
}

// sortByReputation sorts nodes by reputation (highest first)
func sortByReputation(nodes []*StorageNode) {
	for i := 0; i < len(nodes)-1; i++ {
		for j := i + 1; j < len(nodes); j++ {
			if nodes[i].Reputation < nodes[j].Reputation {
				nodes[i], nodes[j] = nodes[j], nodes[i]
			}
		}
	}
}

// StoreFile stores a file across the distributed network
func (ds *DistributedStorage) StoreFile(ctx context.Context, data []byte, metadata *FileMetadata) error {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	if uint64(len(data)) > ds.config.MaxFileSize {
		return errors.New("file too large")
	}

	// Calculate checksum
	checksum := crypto.Hash256(data)
	metadata.OriginalHash = checksum

	// Fragment the data
	fragments, err := ds.fragmentData(data, metadata)
	if err != nil {
		return err
	}

	// Select storage nodes
	excludeIDs := make([]string, 0)
	for _, f := range fragments {
		if f.StorageNode != "" {
			excludeIDs = append(excludeIDs, f.StorageNode)
		}
	}

	nodes, err := ds.SelectNodesForStorage(len(fragments), excludeIDs)
	if err != nil {
		return err
	}

	// Store fragments on selected nodes
	for i, fragment := range fragments {
		fragment.ID = ds.generateFragmentID(metadata.FileID, i)
		fragment.Index = i
		fragment.TotalCount = len(fragments)
		fragment.OriginalHash = checksum
		fragment.CreatedAt = time.Now()
		fragment.ExpiresAt = metadata.ExpiresAt

		if i < len(nodes) {
			fragment.StorageNode = nodes[i].ID
			nodes[i].UsedStorage += uint64(len(fragment.Data))
		}

		ds.fragments[fragment.ID] = fragment
		metadata.Fragments = append(metadata.Fragments, fragment.ID)
	}

	metadata.TotalFragments = len(fragments)
	metadata.ReplicationFactor = ds.config.ReplicationFactor
	metadata.UploadedAt = time.Now()
	ds.files[metadata.FileID] = metadata

	return nil
}

// fragmentData splits data into fragments
func (ds *DistributedStorage) fragmentData(data []byte, metadata *FileMetadata) ([]*Fragment, error) {
	fragments := make([]*Fragment, 0)
	fragmentSize := ds.config.FragmentSize

	for i := 0; i < len(data); i += fragmentSize {
		end := i + fragmentSize
		if end > len(data) {
			end = len(data)
		}

		fragmentData := data[i:end]
		
		// Calculate fragment checksum
		checksum := crypto.Hash256(fragmentData)

		fragment := &Fragment{
			Data:     fragmentData,
			Checksum: checksum,
		}

		fragments = append(fragments, fragment)
	}

	return fragments, nil
}

// RetrieveFile retrieves a file from the distributed storage
func (ds *DistributedStorage) RetrieveFile(ctx context.Context, fileID string) ([]byte, error) {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	metadata, ok := ds.files[fileID]
	if !ok {
		return nil, errors.New("file not found")
	}

	// Collect fragments from storage nodes
	data := make([]byte, 0)
	for i := 0; i < metadata.TotalFragments; i++ {
		fragmentID := ds.generateFragmentID(fileID, i)
		fragment, ok := ds.fragments[fragmentID]
		if !ok {
			return nil, fmt.Errorf("fragment %d not found", i)
		}

		// Verify checksum
		checksum := crypto.Hash256(fragment.Data)
		if !bytes.Equal(checksum, fragment.Checksum) {
			return nil, fmt.Errorf("fragment %d checksum mismatch", i)
		}

		data = append(data, fragment.Data...)
	}

	// Verify file checksum
	fileChecksum := crypto.Hash256(data)
	if !bytes.Equal(fileChecksum, metadata.OriginalHash) {
		return nil, errors.New("file checksum mismatch")
	}

	return data, nil
}

// VerifyFragment verifies the integrity of a fragment
func (ds *DistributedStorage) VerifyFragment(fragmentID string) (bool, error) {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	fragment, ok := ds.fragments[fragmentID]
	if !ok {
		return false, errors.New("fragment not found")
	}

	checksum := crypto.Hash256(fragment.Data)
	return bytes.Equal(checksum, fragment.Checksum), nil
}

// RecoverFragment recovers a fragment using Reed-Solomon decoding
func (ds *DistributedStorage) RecoverFragment(fileID string, index int) error {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	// In a full implementation, this would use Reed-Solomon decoding
	// to recover missing fragments from parity data
	return nil
}

// GetFileMetadata returns metadata for a file
func (ds *DistributedStorage) GetFileMetadata(fileID string) (*FileMetadata, error) {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	metadata, ok := ds.files[fileID]
	if !ok {
		return nil, errors.New("file not found")
	}

	return metadata, nil
}

// ListFiles lists all stored files
func (ds *DistributedStorage) ListFiles() []*FileMetadata {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	files := make([]*FileMetadata, 0, len(ds.files))
	for _, f := range ds.files {
		files = append(files, f)
	}

	return files
}

// DeleteFile removes a file from storage
func (ds *DistributedStorage) DeleteFile(fileID string) error {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	metadata, ok := ds.files[fileID]
	if !ok {
		return errors.New("file not found")
	}

	// Delete all fragments
	for _, fragmentID := range metadata.Fragments {
		delete(ds.fragments, fragmentID)
	}

	delete(ds.files, fileID)
	return nil
}

// UpdateNodeHealth updates the health status of a node
func (ds *DistributedStorage) UpdateNodeHealth(nodeID string, isOnline bool) error {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	node, ok := ds.nodes[nodeID]
	if !ok {
		return errors.New("node not found")
	}

	node.IsOnline = isOnline
	node.LastPing = time.Now()
	return nil
}

// UpdateNodeReputation updates a node's reputation score
func (ds *DistributedStorage) UpdateNodeReputation(nodeID string, delta float64) error {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	node, ok := ds.nodes[nodeID]
	if !ok {
		return errors.New("node not found")
	}

	node.Reputation += delta
	if node.Reputation < 0 {
		node.Reputation = 0
	}
	if node.Reputation > 100 {
		node.Reputation = 100
	}

	return nil
}

// GetStorageStats returns storage statistics
func (ds *DistributedStorage) GetStorageStats() map[string]interface{} {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	totalCapacity := uint64(0)
	totalUsed := uint64(0)
	onlineNodes := 0

	for _, node := range ds.nodes {
		totalCapacity += node.StorageCapacity
		totalUsed += node.UsedStorage
		if node.IsOnline {
			onlineNodes++
		}
	}

	totalFiles := len(ds.files)
	totalFragments := len(ds.fragments)

	return map[string]interface{}{
		"network_id":          ds.networkID,
		"total_nodes":         len(ds.nodes),
		"online_nodes":        onlineNodes,
		"total_capacity_bytes": totalCapacity,
		"used_capacity_bytes": totalUsed,
		"available_bytes":     totalCapacity - totalUsed,
		"total_files":        totalFiles,
		"total_fragments":    totalFragments,
		"replication_factor": ds.config.ReplicationFactor,
		"fragment_size":      ds.config.FragmentSize,
	}
}

// generateFragmentID generates a unique fragment ID
func (ds *DistributedStorage) generateFragmentID(fileID string, index int) string {
	data := fmt.Sprintf("%s-%d-%d", fileID, index, ds.networkID)
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// HealthCheck performs health checks on all nodes
func (ds *DistributedStorage) HealthCheck() map[string]interface{} {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	healthyNodes := 0
	unhealthyNodes := 0
	nodeHealth := make(map[string]interface{})

	for _, node := range ds.nodes {
		status := "healthy"
		if !node.IsOnline {
			status = "offline"
			unhealthyNodes++
		} else if time.Since(node.LastPing) > 5*time.Minute {
			status = "unresponsive"
			unhealthyNodes++
		} else {
			healthyNodes++
		}

		nodeHealth[node.ID] = map[string]interface{}{
			"status":      status,
			"reputation":  node.Reputation,
			"last_ping":   node.LastPing,
			"capacity":    node.StorageCapacity,
			"used":        node.UsedStorage,
		}
	}

	return map[string]interface{}{
		"healthy_nodes":    healthyNodes,
		"unhealthy_nodes":  unhealthyNodes,
		"total_nodes":      len(ds.nodes),
		"node_health":      nodeHealth,
	}
}

// DistributeContent distributes content across the network
func (ds *DistributedStorage) DistributeContent(ctx context.Context, contentID string, data []byte) error {
	metadata := &FileMetadata{
		FileID:     contentID,
		FileSize:   uint64(len(data)),
		MimeType:   "application/octet-stream",
		ExpiresAt:  time.Now().Add(365 * 24 * time.Hour), // 1 year default
	}

	return ds.StoreFile(ctx, data, metadata)
}

// P2PStorageProtocol implements the P2P storage protocol
type P2PStorageProtocol struct {
	storage    *DistributedStorage
	nodeID     string
	peers      map[string]*P2PPeer
	downloadQueue chan *DownloadRequest
	uploadQueue   chan *UploadRequest
	mu          sync.RWMutex
}

// P2PPeer represents a peer in the P2P network
type P2PPeer struct {
	ID       string
	Address  string
	IsOnline bool
}

// DownloadRequest represents a download request
type DownloadRequest struct {
	FileID    string
	ChunkSize int
	Result    chan []byte
	Error     chan error
}

// UploadRequest represents an upload request
type UploadRequest struct {
	Data     []byte
	FileID   string
	Metadata *FileMetadata
	Result   chan bool
	Error    chan error
}

// NewP2PStorageProtocol creates a new P2P storage protocol
func NewP2PStorageProtocol(storage *DistributedStorage, nodeID string) *P2PStorageProtocol {
	return &P2PStorageProtocol{
		storage:       storage,
		nodeID:        nodeID,
		peers:         make(map[string]*P2PPeer),
		downloadQueue: make(chan *DownloadRequest, 100),
		uploadQueue:   make(chan *UploadRequest, 100),
	}
}

// AddPeer adds a peer to the P2P network
func (p *P2PStorageProtocol) AddPeer(peer *P2PPeer) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.peers[peer.ID] = peer
}

// RemovePeer removes a peer from the P2P network
func (p *P2PStorageProtocol) RemovePeer(peerID string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.peers, peerID)
}

// RequestDownload requests a file download
func (p *P2PStorageProtocol) RequestDownload(ctx context.Context, fileID string) ([]byte, error) {
	req := &DownloadRequest{
		FileID:    fileID,
		ChunkSize: ChunkSize,
		Result:    make(chan []byte, 1),
		Error:     make(chan error, 1),
	}

	select {
	case p.downloadQueue <- req:
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	select {
	case data := <-req.Result:
		return data, nil
	case err := <-req.Error:
		return nil, err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// Upload uploads data to the network
func (p *P2PStorageProtocol) Upload(ctx context.Context, fileID string, data []byte) error {
	metadata := &FileMetadata{
		FileID:    fileID,
		FileSize:  uint64(len(data)),
		ExpiresAt: time.Now().Add(365 * 24 * time.Hour),
	}

	req := &UploadRequest{
		Data:     data,
		FileID:   fileID,
		Metadata: metadata,
		Result:   make(chan bool, 1),
		Error:    make(chan error, 1),
	}

	select {
	case p.uploadQueue <- req:
	case <-ctx.Done():
		return ctx.Err()
	}

	select {
	case success := <-req.Result:
		if !success {
			return errors.New("upload failed")
		}
		return nil
	case err := <-req.Error:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

// StartProtocol starts the P2P storage protocol handlers
func (p *P2PStorageProtocol) StartProtocol(ctx context.Context) {
	go func() {
		for {
			select {
			case req := <-p.downloadQueue:
				data, err := p.storage.RetrieveFile(ctx, req.FileID)
				if err != nil {
					req.Error <- err
				} else {
					req.Result <- data
				}
			case req := <-p.uploadQueue:
				err := p.storage.StoreFile(ctx, req.Data, req.Metadata)
				if err != nil {
					req.Error <- err
				} else {
					req.Result <- true
				}
			case <-ctx.Done():
				return
			}
		}
	}()
}

// StorageLayer provides an interface for the storage layer
type StorageLayer interface {
	Store(ctx context.Context, data []byte, metadata *FileMetadata) error
	Retrieve(ctx context.Context, fileID string) ([]byte, error)
	Delete(fileID string) error
	GetStats() map[string]interface{}
}

// Ensure DistributedStorage implements StorageLayer
var _ StorageLayer = (*DistributedStorage)(nil)

// Store implements StorageLayer interface
func (ds *DistributedStorage) Store(ctx context.Context, data []byte, metadata *FileMetadata) error {
	return ds.StoreFile(ctx, data, metadata)
}

// Retrieve implements StorageLayer interface
func (ds *DistributedStorage) Retrieve(ctx context.Context, fileID string) ([]byte, error) {
	return ds.RetrieveFile(ctx, fileID)
}

// Delete implements StorageLayer interface
func (ds *DistributedStorage) Delete(fileID string) error {
	return ds.DeleteFile(fileID)
}

// GetStats implements StorageLayer interface
func (ds *DistributedStorage) GetStats() map[string]interface{} {
	return ds.GetStorageStats()
}

// CDNNode represents a CDN edge node
type CDNNode struct {
	ID        string
	URL       string
	Region    string
	CacheSize uint64
	UsedCache uint64
	Latency   time.Duration
}

// CDNManager manages CDN nodes for content delivery
type CDNManager struct {
	nodes map[string]*CDNNode
	mu    sync.RWMutex
}

// NewCDNManager creates a new CDN manager
func NewCDNManager() *CDNManager {
	return &CDNManager{
		nodes: make(map[string]*CDNNode),
	}
}

// AddNode adds a CDN node
func (cdn *CDNManager) AddNode(node *CDNNode) {
	cdn.mu.Lock()
	defer cdn.mu.Unlock()
	cdn.nodes[node.ID] = node
}

// GetBestNode returns the best CDN node for a region
func (cdn *CDNManager) GetBestNode(region string) *CDNNode {
	cdn.mu.RLock()
	defer cdn.mu.RUnlock()

	var best *CDNNode
	for _, node := range cdn.nodes {
		if node.Region == region {
			if best == nil || node.Latency < best.Latency {
				best = node
			}
		}
	}

	if best == nil {
		// Fallback to any available node
		for _, node := range cdn.nodes {
			if best == nil || node.Latency < best.Latency {
				best = node
			}
		}
	}

	return best
}

// CacheContent caches content on CDN nodes
func (cdn *CDNManager) CacheContent(contentID string, data []byte) error {
	cdn.mu.RLock()
	defer cdn.mu.RUnlock()

	for _, node := range cdn.nodes {
		if node.CacheSize-node.UsedCache >= uint64(len(data)) {
			node.UsedCache += uint64(len(data))
			// In production, this would actually cache the content
		}
	}

	return nil
}

// ReadSeeker interface for random access
type ReadSeeker interface {
	io.Reader
	io.Seeker
}

// IntegrityChecker verifies data integrity
type IntegrityChecker struct{}

// NewIntegrityChecker creates a new integrity checker
func NewIntegrityChecker() *IntegrityChecker {
	return &IntegrityChecker{}
}

// ComputeChecksum computes checksum for data
func (ic *IntegrityChecker) ComputeChecksum(data []byte, algorithm string) ([]byte, error) {
	switch algorithm {
	case "sha256":
		hash := sha256.Sum256(data)
		return hash[:], nil
	default:
		return nil, fmt.Errorf("unsupported algorithm: %s", algorithm)
	}
}

// VerifyIntegrity verifies data integrity
func (ic *IntegrityChecker) VerifyIntegrity(data, expectedChecksum []byte, algorithm string) bool {
	checksum, err := ic.ComputeChecksum(data, algorithm)
	if err != nil {
		return false
	}

	return bytes.Equal(checksum, expectedChecksum)
}
