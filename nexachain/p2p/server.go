package p2p

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/nexastream/nexachain/core"
	"github.com/nexastream/nexachain/wallet"
)

type Server struct {
	chain         *core.Blockchain
	walletManager *wallet.WalletManager
	port          int
	peers         map[string]*Peer
	mu            sync.RWMutex
	running       bool
}

type Peer struct {
	ID        string
	Address   string
	Connected bool
	Latency   time.Duration
}

func NewServer(chain *core.Blockchain, walletManager *wallet.WalletManager) *Server {
	return &Server{
		chain:         chain,
		walletManager: walletManager,
		port:          30303,
		peers:         make(map[string]*Peer),
	}
}

func (s *Server) Start(ctx context.Context) error {
	s.mu.Lock()
	s.running = true
	s.mu.Unlock()

	fmt.Printf("P2P Server starting on port %d...\n", s.port)
	
	// In production, this would:
	// 1. Listen for incoming connections
	// 2. Connect to bootnodes
	// 3. Sync blocks with peers
	// 4. Broadcast new transactions and blocks
	
	<-ctx.Done()
	return nil
}

func (s *Server) Stop() {
	s.mu.Lock()
	s.running = false
	s.mu.Unlock()
	fmt.Println("P2P Server stopped")
}

func (s *Server) GetPort() int {
	return s.port
}

func (s *Server) GetPeers() []*Peer {
	s.mu.RLock()
	defer s.mu.RUnlock()

	peers := make([]*Peer, 0, len(s.peers))
	for _, p := range s.peers {
		peers = append(peers, p)
	}
	return peers
}

func (s *Server) AddPeer(peer *Peer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.peers[peer.ID] = peer
}

func (s *Server) RemovePeer(peerID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.peers, peerID)
}

func (s *Server) BroadcastTransaction(tx *core.Transaction) {
	// Broadcast transaction to all connected peers
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, peer := range s.peers {
		if peer.Connected {
			// In production, send tx to peer
			fmt.Printf("Broadcasting tx %s to peer %s\n", tx.ID, peer.ID)
		}
	}
}

func (s *Server) BroadcastBlock(block *core.Block) {
	// Broadcast block to all connected peers
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, peer := range s.peers {
		if peer.Connected {
			// In production, send block to peer
			fmt.Printf("Broadcasting block %d to peer %s\n", block.Header.Height, peer.ID)
		}
	}
}
