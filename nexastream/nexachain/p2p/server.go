package p2p

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/discovery/mdns"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	"github.com/libp2p/go-libp2p-kad-dht/opts"
	"github.com/multiformats/go-multiaddr"

	"github.com/nexastream/nexachain/core"
	"github.com/nexastream/nexachain/wallet"
)

// Protocol IDs for NexaChain
const (
	ProtocolID         = "/nexachain/1.0.0"
	BlockSyncProtocol  = "/nexachain/block/1.0.0"
	TxSyncProtocol     = "/nexachain/tx/1.0.0"
	ChainSyncProtocol  = "/nexachain/chain/1.0.0"
)

// BootstrapPeers are the initial peers to connect to
var BootstrapPeers = []string{
	"/dnsaddr/bootstrap.libp2p.io/ipfs/QmNnooDu7bfjPFoTZYxMNLGSQJfxmiS5XXEQbBQjHb8Hq9",
	"/dnsaddr/bootstrap.libp2p.io/ipfs/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUdqanjGy6G",
	"/dnsaddr/bootstrap.libp2p.io/ipfs/QmQCU2EcMqAqjqPRNFa9mpS2zXmNLJpBvGcpUG3keBV8XE",
	"/dnsaddr/bootstrap.libp2p.io/ipfs/QmcqU8QU3T5LCJDFe4FL7WDGfz7X3zLxK3DHQwnSJHvPxE",
}

// Server represents the P2P server with full libp2p implementation
type Server struct {
	chain           *core.Blockchain
	walletManager   *wallet.WalletManager
	host            core.Host
	dht             *dht.IpfsDHT
	mdns            *mdns.Service
	port            int
	peers           map[peer.ID]*PeerInfo
	mu              sync.RWMutex
	running         bool
	ctx             context.Context
	cancel          context.CancelFunc
	discoveryLock   sync.Mutex
	peerUpdated     chan struct{}
	blockReceived   chan *core.Block
	txReceived      chan *core.Transaction
}

// PeerInfo holds information about a connected peer
type PeerInfo struct {
	ID        peer.ID
	Address   string
	Connected bool
	Latency   time.Duration
	AddedAt   time.Time
	IsUseful  bool // Whether this peer contributes to the network
}

// Config holds P2P server configuration
type Config struct {
	ListenAddr    string
	BootstrapPeers []string
	EnableDHT     bool
	EnableMDNS    bool
}

// DefaultConfig returns default P2P configuration
func DefaultConfig() *Config {
	return &Config{
		ListenAddr:     "/ip4/0.0.0.0/tcp/30303",
		BootstrapPeers: BootstrapPeers,
		EnableDHT:      true,
		EnableMDNS:     true,
	}
}

// NewServer creates a new P2P server
func NewServer(chain *core.Blockchain, walletManager *wallet.WalletManager) *Server {
	return &Server{
		chain:         chain,
		walletManager: walletManager,
		port:          30303,
		peers:         make(map[peer.ID]*PeerInfo),
		peerUpdated:   make(chan struct{}, 10),
		blockReceived: make(chan *core.Block, 100),
		txReceived:    make(chan *core.Transaction, 100),
	}
}

// Start starts the P2P server with full libp2p implementation
func (s *Server) Start(ctx context.Context) error {
	s.ctx, s.cancel = context.WithCancel(ctx)
	
	s.mu.Lock()
	s.running = true
	s.mu.Unlock()

	config := DefaultConfig()
	
	// Convert bootstrap addresses
	var bootstrapAddrs []multiaddr.Multiaddr
	for _, addr := range config.BootstrapPeers {
		maddr, err := multiaddr.NewMultiaddr(addr)
		if err != nil {
			fmt.Printf("Failed to parse bootstrap addr %s: %v\n", addr, err)
			continue
		}
		bootstrapAddrs = append(bootstrapAddrs, maddr)
	}

	// Build libp2p host options
	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(config.ListenAddr),
		libp2p.EnableNATService(),
		libp2p.EnableRelay(),
		libp2p.DefaultTransport,
	}

	host, err := libp2p.New(opts...)
	if err != nil {
		return fmt.Errorf("failed to create libp2p host: %w", err)
	}

	s.host = host

	fmt.Printf("P2P Server starting...\n")
	fmt.Printf("  Listen addresses: %s\n", host.Addrs())
	fmt.Printf("  Peer ID: %s\n", host.ID())
	fmt.Printf("  Protocol: %s\n", ProtocolID)

	// Start DHT for peer and content discovery
	if config.EnableDHT {
		if err := s.startDHT(bootstrapAddrs); err != nil {
			fmt.Printf("Warning: Failed to start DHT: %v\n", err)
		}
	}

	// Start mDNS for local peer discovery
	if config.EnableMDNS {
		if err := s.startMDNS(); err != nil {
			fmt.Printf("Warning: Failed to start mDNS: %v\n", err)
		}
	}

	// Set up stream handlers for blockchain protocols
	s.setupStreamHandlers()

	// Connect to bootstrap peers
	go s.connectToBootstrapPeers(bootstrapAddrs)

	// Start peer management
	go s.peerManager()

	// Start block/TX relayer
	go s.relayer()

	fmt.Println("P2P Server started successfully")
	
	<-s.ctx.Done()
	return nil
}

// startDHT starts the Distributed Hash Table
func (s *Server) startDHT(bootstraps []multiaddr.Multiaddr) error {
	var opts []opts.Option
	if len(bootstraps) > 0 {
		opts = append(opts, opts.BootstrapPeers(bootstraps...))
	}

	dht, err := dht.New(s.ctx, s.host, opts...)
	if err != nil {
		return err
	}

	s.dht = dht

	// Bootstrap the DHT
	if len(bootstraps) > 0 {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
			defer cancel()
			if err := dht.Bootstrap(ctx); err != nil {
				fmt.Printf("DHT bootstrap error: %v\n", err)
			}
		}()
	}

	fmt.Println("DHT started for peer/content discovery")
	return nil
}

// startMDNS starts mDNS for local network discovery
func (s *Server) startMDNS() error {
	m, err := mdns.New(
		s.host,
		mdns.ServiceTag("nexachain"),
		mdns.NotifyBackoff(time.Second),
	)
	if err != nil {
		return err
	}

	s.mdns = m

	// Set up peer found handler
	m.RegisterHandler(func(pi peer.AddrInfo) {
		fmt.Printf("mDNS: Found peer %s at %s\n", pi.ID, pi.Addrs)
		go s.connectToPeer(pi)
	})

	fmt.Println("mDNS started for local peer discovery")
	return nil
}

// setupStreamHandlers sets up protocol handlers for blockchain sync
func (s *Server) setupStreamHandlers() {
	// Block sync handler
	s.host.SetStreamHandler(BlockSyncProtocol, func(stream core.Stream) {
		buf := make([]byte, 1024)
		n, _ := stream.Read(buf)
		fmt.Printf("Received block data: %s\n", string(buf[:n]))
		stream.Close()
	})

	// Transaction sync handler
	s.host.SetStreamHandler(TxSyncProtocol, func(stream core.Stream) {
		buf := make([]byte, 1024)
		n, _ := stream.Read(buf)
		fmt.Printf("Received tx data: %s\n", string(buf[:n]))
		stream.Close()
	})

	// Chain sync handler
	s.host.SetStreamHandler(ChainSyncProtocol, func(stream core.Stream) {
		buf := make([]byte, 1024)
		n, _ := stream.Read(buf)
		fmt.Printf("Received chain data: %s\n", string(buf[:n]))
		stream.Close()
	})

	fmt.Println("Stream handlers registered")
}

// connectToBootstrapPeers connects to initial bootstrap peers
func (s *Server) connectToBootstrapPeers(bootstraps []multiaddr.Multiaddr) {
	for _, addr := range bootstraps {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		pi := peer.AddrInfo{Addrs: []multiaddr.Multiaddr{addr}}
		if err := s.host.Connect(ctx, pi); err != nil {
			fmt.Printf("Failed to connect to bootstrap %s: %v\n", addr, err)
		} else {
			fmt.Printf("Connected to bootstrap peer: %s\n", pi.ID)
			s.addPeer(pi)
		}
		cancel()
	}
}

// connectToPeer connects to a discovered peer
func (s *Server) connectToPeer(pi peer.AddrInfo) {
	s.discoveryLock.Lock()
	defer s.discoveryLock.Unlock()

	// Don't connect to self
	if pi.ID == s.host.ID() {
		return
	}

	// Check if already connected
	if s.host.Network().Connectedness(pi.ID) == core.Connected {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := s.host.Connect(ctx, pi); err != nil {
		fmt.Printf("Failed to connect to peer %s: %v\n", pi.ID, err)
		return
	}

	s.addPeer(pi)
	fmt.Printf("Connected to peer: %s\n", pi.ID)
}

// addPeer adds a peer to the peer list
func (s *Server) addPeer(pi peer.AddrInfo) {
	s.mu.Lock()
	defer s.mu.Unlock()

	addr := ""
	if len(pi.Addrs) > 0 {
		addr = pi.Addrs[0].String()
	}

	s.peers[pi.ID] = &PeerInfo{
		ID:        pi.ID,
		Address:   addr,
		Connected: true,
		AddedAt:   time.Now(),
		IsUseful:  true,
	}

	// Notify of peer update
	select {
	case s.peerUpdated <- struct{}{}:
	default:
	}
}

// removePeer removes a peer from the peer list
func (s *Server) removePeer(id peer.ID) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if p, ok := s.peers[id]; ok {
		p.Connected = false
	}
	delete(s.peers, id)

	// Notify of peer update
	select {
	case s.peerUpdated <- struct{}{}:
	default:
	}
}

// peerManager manages peer connections and handles disconnections
func (s *Server) peerManager() {
	notif := s.host.Network().Notify(nil)
	
	for {
		select {
		case e := <-notif.Connected():
			fmt.Printf("Peer connected: %s\n", e.Conn().RemotePeer())
			s.addPeer(peer.AddrInfo{
				ID:    e.Conn().RemotePeer(),
				Addrs: []multiaddr.Multiaddr{e.Conn().RemoteMultiaddr()},
			})

		case e := <-notif.Disconnected():
			fmt.Printf("Peer disconnected: %s\n", e.Conn().RemotePeer())
			s.removePeer(e.Conn().RemotePeer())

		case e := <-notif.Listen():
			fmt.Printf("Listening on: %s\n", e.Multiaddr())

		case <-s.ctx.Done():
			return
		}
	}
}

// relayer handles block and transaction broadcasting
func (s *Server) relayer() {
	for {
		select {
		case block := <-s.blockReceived:
			s.broadcastBlock(block)
		case tx := <-s.txReceived:
			s.broadcastTransaction(tx)
		case <-s.ctx.Done():
			return
		}
	}
}

// broadcastBlock broadcasts a block to all connected peers
func (s *Server) broadcastBlock(block *core.Block) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, peer := range s.peers {
		if !peer.Connected {
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		
		stream, err := s.host.NewStream(ctx, peer.ID, BlockSyncProtocol)
		if err != nil {
			fmt.Printf("Failed to open stream to %s: %v\n", peer.ID, err)
			cancel()
			continue
		}

		// Send block (simplified - real implementation would use protobuf)
		_, err = stream.Write([]byte(fmt.Sprintf("BLOCK:%d", block.Header.Height)))
		if err != nil {
			fmt.Printf("Failed to send block to %s: %v\n", peer.ID, err)
		}

		stream.Close()
		cancel()
	}
}

// broadcastTransaction broadcasts a transaction to all connected peers
func (s *Server) broadcastTransaction(tx *core.Transaction) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, peer := range s.peers {
		if !peer.Connected {
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		
		stream, err := s.host.NewStream(ctx, peer.ID, TxSyncProtocol)
		if err != nil {
			fmt.Printf("Failed to open stream to %s: %v\n", peer.ID, err)
			cancel()
			continue
		}

		// Send transaction
		_, err = stream.Write([]byte(fmt.Sprintf("TX:%s", tx.ID)))
		if err != nil {
			fmt.Printf("Failed to send tx to %s: %v\n", peer.ID, err)
		}

		stream.Close()
		cancel()
	}
}

// Stop stops the P2P server
func (s *Server) Stop() {
	s.mu.Lock()
	s.running = false
	s.mu.Unlock()

	if s.cancel != nil {
		s.cancel()
	}

	if s.host != nil {
		s.host.Close()
	}

	if s.dht != nil {
		s.dht.Close()
	}

	fmt.Println("P2P Server stopped")
}

// GetPort returns the listening port
func (s *Server) GetPort() int {
	return s.port
}

// GetPeerCount returns the number of connected peers
func (s *Server) GetPeerCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	count := 0
	for _, p := range s.peers {
		if p.Connected {
			count++
		}
	}
	return count
}

// GetPeers returns information about connected peers
func (s *Server) GetPeers() []*PeerInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	peers := make([]*PeerInfo, 0, len(s.peers))
	for _, p := range s.peers {
		peers = append(peers, p)
	}
	return peers
}

// AddPeer adds a peer (for testing)
func (s *Server) AddPeer(peerInfo *PeerInfo) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.peers[peerInfo.ID] = peerInfo
}

// RemovePeer removes a peer
func (s *Server) RemovePeer(id peer.ID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.peers, id)
}

// BroadcastTransaction queues a transaction for broadcasting
func (s *Server) BroadcastTransaction(tx *core.Transaction) {
	select {
	case s.txReceived <- tx:
	default:
		fmt.Println("Transaction broadcast queue full, dropping tx")
	}
}

// BroadcastBlock queues a block for broadcasting
func (s *Server) BroadcastBlock(block *core.Block) {
	select {
	case s.blockReceived <- block:
	default:
		fmt.Println("Block broadcast queue full, dropping block")
	}
}

// FindPeers finds peers providing specific content
func (s *Server) FindPeers(key string) ([]peer.AddrInfo, error) {
	if s.dht == nil {
		return nil, fmt.Errorf("DHT not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return s.dht.FindProviders(ctx, []byte(key))
}

// FindPeersByKey finds peers with specific key in DHT
func (s *Server) FindPeersByKey(ctx context.Context, key string) ([]peer.AddrInfo, error) {
	if s.dht == nil {
		return nil, fmt.Errorf("DHT not initialized")
	}

	return s.dht.FindProviders(ctx, []byte(key))
}

// Provide announces content to the network
func (s *Server) Provide(ctx context.Context, key string) error {
	if s.dht == nil {
		return fmt.Errorf("DHT not initialized")
	}

	return s.dht.Provide(ctx, []byte(key), true)
}

// GetPeerInfo returns information about a specific peer
func (s *Server) GetPeerInfo(id peer.ID) *PeerInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.peers[id]
}

// IsConnected checks if connected to a specific peer
func (s *Server) IsConnected(id peer.ID) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	p, ok := s.peers[id]
	return ok && p.Connected
}

// GetHost returns the libp2p host
func (s *Server) GetHost() core.Host {
	return s.host
}

// GetDHT returns the DHT instance
func (s *Server) GetDHT() *dht.IpfsDHT {
	return s.dht
}
