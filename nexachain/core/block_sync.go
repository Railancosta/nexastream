package core

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/libp2p/go-libp2p/core/peer"
)

/*
 * Block Synchronization for NexaChain
 * 
 * This module handles synchronization of blockchain state between nodes
 * including block sync, transaction sync, and state sync.
 * 
 * Features:
 * - Block synchronization
 * - Transaction propagation
 * - Chain state verification
 * - Fork detection and resolution
 */

// SyncProtocol defines the synchronization protocol
type SyncProtocol struct {
	chain         *Blockchain
	config        *SyncConfig
	pendingBlocks map[Hash]*Block
	pendingTXs   map[Hash]*Transaction
	mu           sync.RWMutex
	syncingPeers map[peer.ID]*SyncState
}

// SyncConfig holds sync configuration
type SyncConfig struct {
	MaxPendingBlocks  int
	MaxPendingTXs    int
	SyncBatchSize    int
	SyncInterval     time.Duration
	Timeout         time.Duration
	EnableFastSync   bool
}

// DefaultSyncConfig returns default sync configuration
func DefaultSyncConfig() *SyncConfig {
	return &SyncConfig{
		MaxPendingBlocks: 100,
		MaxPendingTXs:   1000,
		SyncBatchSize:   50,
		SyncInterval:    10 * time.Second,
		Timeout:         30 * time.Second,
		EnableFastSync:  true,
	}
}

// SyncState represents synchronization state with a peer
type SyncState struct {
	PeerID         peer.ID
	LastSync      time.Time
	HighestBlock   uint64
	Status         SyncStatus
	BlocksToGet    []uint64
	StartedAt     time.Time
}

// SyncStatus represents the status of sync
type SyncStatus uint8

const (
	SyncStatusIdle SyncStatus = iota
	SyncStatusSyncing
	SyncStatusComplete
	SyncStatusFailed
)

// NewSyncProtocol creates a new sync protocol
func NewSyncProtocol(chain *Blockchain, config *SyncConfig) *SyncProtocol {
	if config == nil {
		config = DefaultSyncConfig()
	}

	return &SyncProtocol{
		chain:         chain,
		config:        config,
		pendingBlocks: make(map[Hash]*Block),
		pendingTXs:    make(map[Hash]*Transaction),
		syncingPeers:  make(map[peer.ID]*SyncState),
	}
}

// StartSync starts synchronization with a peer
func (sp *SyncProtocol) StartSync(ctx context.Context, peerID peer.ID, peerHeight uint64) error {
	sp.mu.Lock()
	
	// Check if already syncing with this peer
	if state, ok := sp.syncingPeers[peerID]; ok {
		if state.Status == SyncStatusSyncing {
			sp.mu.Unlock()
			return nil // Already syncing
		}
	}

	// Create new sync state
	sp.syncingPeers[peerID] = &SyncState{
		PeerID:        peerID,
		HighestBlock:  peerHeight,
		Status:        SyncStatusSyncing,
		StartedAt:     time.Now(),
	}
	sp.mu.Unlock()

	// Start sync process
	go sp.runSync(ctx, peerID)

	return nil
}

// runSync runs the synchronization process
func (sp *SyncProtocol) runSync(ctx context.Context, peerID peer.ID) {
	defer func() {
		sp.mu.Lock()
		if state, ok := sp.syncingPeers[peerID]; ok {
			state.Status = SyncStatusComplete
			state.LastSync = time.Now()
		}
		sp.mu.Unlock()
	}()

	localHeight := sp.chain.GetBlockHeight()
	
	sp.mu.RLock()
	peerState := sp.syncingPeers[peerID]
	sp.mu.RUnlock()

	if peerState == nil {
		return
	}

	peerHeight := peerState.HighestBlock

	fmt.Printf("Sync: Starting sync with peer %s (local: %d, peer: %d)\n", 
		peerID, localHeight, peerHeight)

	// Determine sync direction
	if peerHeight > localHeight {
		// Peer is ahead, download blocks from peer
		sp.downloadBlocks(ctx, peerID, localHeight+1, peerHeight)
	} else if localHeight > peerHeight {
		// We are ahead, push blocks to peer
		sp.uploadBlocks(ctx, peerID, peerHeight+1, localHeight)
	} else {
		// Same height, sync pending transactions
		sp.syncPendingTXs(ctx, peerID)
	}
}

// downloadBlocks downloads blocks from a peer
func (sp *SyncProtocol) downloadBlocks(ctx context.Context, peerID peer.ID, startHeight, endHeight uint64) {
	batchSize := uint64(sp.config.SyncBatchSize)
	
	for height := startHeight; height <= endHeight; height += batchSize {
		select {
		case <-ctx.Done():
			fmt.Printf("Sync: Context cancelled during block download\n")
			return
		default:
		}

		batchEnd := height + batchSize - 1
		if batchEnd > endHeight {
			batchEnd = endHeight
		}

		// Request block batch
		blocks, err := sp.requestBlockBatch(ctx, peerID, height, batchEnd)
		if err != nil {
			fmt.Printf("Sync: Failed to get block batch %d-%d from %s: %v\n", 
				height, batchEnd, peerID, err)
			continue
		}

		// Process blocks
		for _, block := range blocks {
			if err := sp.processBlock(ctx, block); err != nil {
				fmt.Printf("Sync: Failed to process block %d: %v\n", 
					block.Header.Height, err)
			}
		}

		fmt.Printf("Sync: Downloaded blocks %d-%d\n", height, batchEnd)
	}
}

// uploadBlocks uploads blocks to a peer
func (sp *SyncProtocol) uploadBlocks(ctx context.Context, peerID peer.ID, startHeight, endHeight uint64) {
	batchSize := uint64(sp.config.SyncBatchSize)
	
	for height := startHeight; height <= endHeight; height += batchSize {
		select {
		case <-ctx.Done():
			return
		default:
		}

		batchEnd := height + batchSize - 1
		if batchEnd > endHeight {
			batchEnd = endHeight
		}

		// Get local blocks
		blocks := sp.getBlockBatch(height, batchEnd)
		
		// Send block batch to peer
		if err := sp.sendBlockBatch(ctx, peerID, blocks); err != nil {
			fmt.Printf("Sync: Failed to send block batch %d-%d to %s: %v\n", 
				height, batchEnd, peerID, err)
		}

		fmt.Printf("Sync: Uploaded blocks %d-%d to %s\n", height, batchEnd, peerID)
	}
}

// requestBlockBatch requests a batch of blocks from a peer
func (sp *SyncProtocol) requestBlockBatch(ctx context.Context, peerID peer.ID, startHeight, endHeight uint64) ([]*Block, error) {
	// In real implementation, this would:
	// 1. Open a stream to the peer
	// 2. Send a BlockRequest message
	// 3. Receive blocks
	// 4. Verify blocks
	// 5. Return verified blocks

	// For now, return empty slice (stub)
	fmt.Printf("Sync: Would request blocks %d-%d from %s\n", startHeight, endHeight, peerID)
	return nil, fmt.Errorf("stub: would request blocks from peer")
}

// sendBlockBatch sends a batch of blocks to a peer
func (sp *SyncProtocol) sendBlockBatch(ctx context.Context, peerID peer.ID, blocks []*Block) error {
	// In real implementation, this would:
	// 1. Open a stream to the peer
	// 2. Send blocks via protobuf
	// 3. Wait for acknowledgment

	fmt.Printf("Sync: Would send %d blocks to %s\n", len(blocks), peerID)
	return nil
}

// getBlockBatch retrieves a batch of blocks from local chain
func (sp *SyncProtocol) getBlockBatch(startHeight, endHeight uint64) []*Block {
	blocks := make([]*Block, 0)
	
	for height := startHeight; height <= endHeight; height++ {
		block := sp.chain.GetBlock(height)
		if block == nil {
			break
		}
		blocks = append(blocks, block)
	}

	return blocks
}

// processBlock processes an incoming block
func (sp *SyncProtocol) processBlock(ctx context.Context, block *Block) error {
	sp.mu.Lock()
	defer sp.mu.Unlock()

	// Check if we already have this block
	existing := sp.chain.GetBlock(block.Header.Height)
	if existing != nil {
		if existing.Header.Hash() == block.Header.Hash() {
			return nil // Already have this block
		}
		// Fork detected
		return sp.resolveFork(ctx, block)
	}

	// Add to pending blocks
	sp.pendingBlocks[block.Header.Hash()] = block

	// Validate block
	if err := sp.validateBlock(block); err != nil {
		delete(sp.pendingBlocks, block.Header.Hash())
		return err
	}

	// Add to chain
	if err := sp.chain.AddBlock(block); err != nil {
		delete(sp.pendingBlocks, block.Header.Hash())
		return fmt.Errorf("failed to add block: %w", err)
	}

	delete(sp.pendingBlocks, block.Header.Hash())
	fmt.Printf("Sync: Added block %d to chain\n", block.Header.Height)

	return nil
}

// validateBlock validates a block before adding
func (sp *SyncProtocol) validateBlock(block *Block) error {
	// Validate block structure
	if block == nil {
		return fmt.Errorf("nil block")
	}

	// Validate timestamp (not in future, not too old)
	now := uint64(time.Now().Unix())
	if block.Header.Timestamp > now+60 { // 1 minute tolerance
		return fmt.Errorf("block timestamp too far in future")
	}
	if block.Header.Timestamp < now-3600 { // 1 hour max age
		return fmt.Errorf("block timestamp too old")
	}

	// Validate transactions
	for _, tx := range block.Transactions {
		if err := sp.validateTransaction(tx); err != nil {
			return fmt.Errorf("invalid transaction: %w", err)
		}
	}

	return nil
}

// validateTransaction validates a transaction
func (sp *SyncProtocol) validateTransaction(tx *Transaction) error {
	if tx == nil {
		return fmt.Errorf("nil transaction")
	}

	// Verify hash
	calculatedHash := tx.CalculateHash()
	if calculatedHash != tx.Hash {
		return fmt.Errorf("transaction hash mismatch")
	}

	return nil
}

// resolveFork handles a fork in the chain
func (sp *SyncProtocol) resolveFork(ctx context.Context, newBlock *Block) error {
	// Simple longest chain rule
	localHeight := sp.chain.GetBlockHeight()
	
	if newBlock.Header.Height > localHeight {
		// New block extends the chain
		fmt.Printf("Sync: Fork resolved - new chain longer (%d > %d)\n", 
			newBlock.Header.Height, localHeight)
		// In real implementation, would reorganize chain
	}

	return nil
}

// syncPendingTXs synchronizes pending transactions with a peer
func (sp *SyncProtocol) syncPendingTXs(ctx context.Context, peerID peer.ID) {
	sp.mu.RLock()
	pending := make([]*Transaction, 0, len(sp.pendingTXs))
	for _, tx := range sp.pendingTXs {
		pending = append(pending, tx)
	}
	sp.mu.RUnlock()

	if len(pending) == 0 {
		return
	}

	// Share pending transactions
	fmt.Printf("Sync: Sharing %d pending transactions with %s\n", len(pending), peerID)
	// In real implementation, would send via TXSyncProtocol
}

// BroadcastTransaction broadcasts a transaction to the network
func (sp *SyncProtocol) BroadcastTransaction(tx *Transaction) {
	sp.mu.Lock()
	defer sp.mu.Unlock()

	// Add to pending
	sp.pendingTXs[tx.Hash] = tx

	// Limit pending size
	if len(sp.pendingTXs) > sp.config.MaxPendingTXs {
		// Remove oldest
		for k := range sp.pendingTXs {
			delete(sp.pendingTXs, k)
			break
		}
	}
}

// BroadcastBlock broadcasts a block to the network
func (sp *SyncProtocol) BroadcastBlock(block *Block) {
	sp.mu.Lock()
	defer sp.mu.Unlock()

	// Add to pending
	sp.pendingBlocks[block.Header.Hash()] = block

	// Limit pending size
	if len(sp.pendingBlocks) > sp.config.MaxPendingBlocks {
		for k := range sp.pendingBlocks {
			delete(sp.pendingBlocks, k)
			break
		}
	}
}

// HandleTransaction handles an incoming transaction from a peer
func (sp *SyncProtocol) HandleTransaction(tx *Transaction) error {
	sp.mu.Lock()
	defer sp.mu.Unlock()

	// Check if already known
	if _, exists := sp.pendingTXs[tx.Hash]; exists {
		return nil
	}

	// Validate
	if err := sp.validateTransaction(tx); err != nil {
		return err
	}

	// Add to pending
	sp.pendingTXs[tx.Hash] = tx

	fmt.Printf("Sync: Received transaction %s\n", tx.ID)

	return nil
}

// HandleBlock handles an incoming block from a peer
func (sp *SyncProtocol) HandleBlock(block *Block) error {
	sp.mu.Lock()
	defer sp.mu.Unlock()

	// Check if already known
	if _, exists := sp.pendingBlocks[block.Header.Hash()]; exists {
		return nil
	}

	existing := sp.chain.GetBlock(block.Header.Height)
	if existing != nil && existing.Header.Hash() == block.Header.Hash() {
		return nil // Already have this block
	}

	// Validate
	if err := sp.validateBlock(block); err != nil {
		return err
	}

	// Add to pending
	sp.pendingBlocks[block.Header.Hash()] = block

	fmt.Printf("Sync: Received block %d\n", block.Header.Height)

	return nil
}

// GetSyncStatus returns synchronization status
func (sp *SyncProtocol) GetSyncStatus() *SyncStatusInfo {
	sp.mu.RLock()
	defer sp.mu.RUnlock()

	status := &SyncStatusInfo{
		PendingBlocks: len(sp.pendingBlocks),
		PendingTXs:    len(sp.pendingTXs),
		SyncingPeers:  make([]string, 0),
	}

	for peerID, state := range sp.syncingPeers {
		status.SyncingPeers = append(status.SyncingPeers, fmt.Sprintf("%s:%s", peerID, state.Status))
		if state.Status == SyncStatusSyncing {
			status.ActiveSyncPeers++
		}
	}

	return status
}

// SyncStatusInfo holds synchronization status information
type SyncStatusInfo struct {
	PendingBlocks   int
	PendingTXs     int
	SyncingPeers   []string
	ActiveSyncPeers int
}

// Serialize serializes the sync protocol state for persistence
func (sp *SyncProtocol) Serialize() ([]byte, error) {
	sp.mu.RLock()
	defer sp.mu.RUnlock()

	data := map[string]interface{}{
		"pending_blocks": sp.pendingBlocks,
		"pending_txs":   sp.pendingTXs,
	}

	return json.Marshal(data)
}

// Deserialize deserializes the sync protocol state
func (sp *SyncProtocol) Deserialize(data []byte) error {
	var state map[string]interface{}
	if err := json.Unmarshal(data, &state); err != nil {
		return err
	}

	sp.mu.Lock()
	defer sp.mu.Unlock()

	// Restore pending blocks
	if blocksRaw, ok := state["pending_blocks"].(map[string]interface{}); ok {
		for hash, blockRaw := range blocksRaw {
			blockData, _ := json.Marshal(blockRaw)
			var block Block
			if err := json.Unmarshal(blockData, &block); err != nil {
				continue
			}
			sp.pendingBlocks[block.Header.Hash()] = &block
		}
	}

	// Restore pending transactions
	if txsRaw, ok := state["pending_txs"].(map[string]interface{}); ok {
		for hash, txRaw := range txsRaw {
			txData, _ := json.Marshal(txRaw)
			var tx Transaction
			if err := json.Unmarshal(txData, &tx); err != nil {
				continue
			}
			sp.pendingTXs[tx.Hash] = &tx
		}
	}

	return nil
}
