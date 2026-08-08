package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nexastream/nexachain/core"
	"github.com/nexastream/nexachain/storage"
	"github.com/nexastream/nexachain/p2p"
	"github.com/nexastream/nexachain/wallet"
)

/*
 * NexaChain Node
 * 
 * Full-featured NexaStream blockchain node with:
 * - Blockchain consensus (PoW + PoS)
 * - P2P networking
 * - Block production
 * - Transaction processing
 * - IPFS integration
 * - Video storage
 */

var (
	Version      = "0.1.0-dev"
	BuildTime    = time.Now().Format(time.RFC3339)
)

// Config holds node configuration
type Config struct {
	ChainID      uint64
	NetworkName  string
	P2PPort      int
	RPCPort      int
	IsValidator  bool
	IsMiner      bool
	IsBootstrap  bool
	StoragePath  string
	GenesisFile  string
}

func main() {
	fmt.Printf(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███╗   ██╗██╗ ██████╗ ██╗  ██╗████████╗██╗  ██╗       ║
║   ████╗  ██║██║██╔════╝ ██║  ██║╚══██╔══╝██║  ██║       ║
║   ██╔██╗ ██║██║██║  ███╗███████║   ██║   ███████║       ║
║   ██║╚██╗██║██║██║   ██║██╔══██║   ██║   ██╔══██║       ║
║   ██║ ╚████║██║╚██████╔╝██║  ██║   ██║   ██║  ██║       ║
║   ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝       ║
║                                                           ║
║   🚀 NexaStream Decentralized Video Platform               ║
║                                                           ║
║   Version: %s                                           ║
║   Build: %s                                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`, Version, BuildTime)

	// Parse configuration
	config := parseConfig()

	// Create context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize components
	fmt.Println("\n📦 Initializing components...")

	// Initialize blockchain
	fmt.Print("   ├── Blockchain... ")
	chain := core.NewBlockchain(config.ChainID, config.NetworkName)
	fmt.Println("OK")

	// Initialize consensus
	fmt.Print("   ├── Consensus (PoW + PoS)... ")
	consensus := core.NewConsensus(chain)
	fmt.Println("OK")

	// Initialize wallet manager
	fmt.Print("   ├── Wallet Manager... ")
	walletManager := wallet.NewWalletManager(chain)
	fmt.Println("OK")

	// Initialize storage
	fmt.Print("   ├── Video Storage (IPFS)... ")
	videoStore := storage.NewVideoStore(nil, nil) // Will connect to IPFS
	fmt.Println("OK")

	// Initialize P2P server
	fmt.Print("   ├── P2P Networking (libp2p)... ")
	p2pServer := p2p.NewServer(chain, walletManager)
	fmt.Println("OK")

	// Initialize block sync
	fmt.Print("   ├── Block Synchronization... ")
	blockSync := core.NewSyncProtocol(chain, nil)
	fmt.Println("OK")

	// Print node configuration
	fmt.Printf(`
╔═══════════════════════════════════════════════════════════╗
║                    NODE CONFIGURATION                       ║
╠═══════════════════════════════════════════════════════════╣
║  Network:     %s (ID: %d)                          ║
║  P2P Port:    %d                                       ║
║  RPC Port:    %d                                       ║
║  Validator:   %v                                         ║
║  Miner:       %v                                         ║
║  Bootstrap:   %v                                         ║
╚═══════════════════════════════════════════════════════════╝
`, config.NetworkName, config.ChainID, config.P2PPort, config.RPCPort, 
	   config.IsValidator, config.IsMiner, config.IsBootstrap)

	// Start P2P networking
	fmt.Println("\n🔗 Starting P2P networking...")
	go func() {
		if err := p2pServer.Start(ctx); err != nil {
			log.Printf("P2P error: %v", err)
		}
	}()

	// Wait for P2P to initialize
	time.Sleep(2 * time.Second)

	// Start block production if miner
	if config.IsMiner {
		fmt.Println("\n⛏️  Starting block production (PoW)...")
		go runMiner(ctx, chain, consensus, p2pServer)
	}

	// Start validation if validator
	if config.IsValidator {
		fmt.Println("\n✅ Starting validation (PoS)...")
		go runValidator(ctx, chain, consensus, p2pServer)
	}

	// Start block sync
	fmt.Println("\n📡 Starting block synchronization...")
	go runBlockSync(ctx, chain, blockSync, p2pServer)

	// Print running status
	stats := chain.GetStats()
	fmt.Printf(`
╔═══════════════════════════════════════════════════════════╗
║                    NODE STATUS                             ║
╠═══════════════════════════════════════════════════════════╣
║  Status:        RUNNING                                   ║
║  Block Height:  %d                                         ║
║  Peers:         %d                                          ║
║  Total TXs:    %d                                          ║
║                                                           ║
║  Available endpoints:                                      ║
║  • GET  http://localhost:%d/api/v1/health                 ║
║  • GET  http://localhost:%d/api/v1/chain/stats            ║
║  • GET  http://localhost:%d/api/v1/blocks/latest          ║
║  • GET  http://localhost:%d/api/v1/peers                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`, int(stats["block_height"].(uint64)), p2pServer.GetPeerCount(), 
	   int(stats["total_transactions"].(uint64)), config.RPCPort, config.RPCPort, config.RPCPort, config.RPCPort)

	// Block production ticker for demo
	ticker := time.NewTicker(10 * time.Second)
	go func() {
		for {
			select {
			case <-ticker.C:
				stats := chain.GetStats()
				fmt.Printf("\r[%s] Height: %d | Peers: %d | Peers: %d", 
					time.Now().Format("15:04:05"),
					int(stats["block_height"].(uint64)),
					p2pServer.GetPeerCount(),
					int(stats["total_transactions"].(uint64)))
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()

	// Wait for interrupt
	fmt.Println("\n\n🟢 Node is running!")
	fmt.Println("Press Ctrl+C to stop\n")

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	fmt.Println("\n🛑 Shutting down...")
	cancel()
	p2pServer.Stop()
	videoStore = nil
	fmt.Println("✅ Node stopped")
}

// parseConfig parses command line configuration
func parseConfig() *Config {
	config := &Config{
		ChainID:     1337, // Local testnet
		NetworkName: "nexastream-local",
		P2PPort:     30303,
		RPCPort:     26657,
		IsValidator: os.Getenv("IS_VALIDATOR") == "true",
		IsMiner:      os.Getenv("IS_MINER") == "true",
		IsBootstrap:  os.Getenv("NODE_TYPE") == "bootstrap",
		StoragePath:  os.Getenv("STORAGE_PATH"),
	}

	// Override from environment
	if chainID := os.Getenv("CHAIN_ID"); chainID != "" {
		fmt.Sscanf(chainID, "%d", &config.ChainID)
	}
	if p2pPort := os.Getenv("P2P_PORT"); p2pPort != "" {
		fmt.Sscanf(p2pPort, "%d", &config.P2PPort)
	}
	if rpcPort := os.Getenv("RPC_PORT"); rpcPort != "" {
		fmt.Sscanf(rpcPort, "%d", &config.RPCPort)
	}

	// Default to miner + validator for bootstrap
	if config.IsBootstrap {
		config.IsValidator = true
		config.IsMiner = true
	}

	return config
}

// runMiner runs the PoW miner
func runMiner(ctx context.Context, chain *core.Blockchain, consensus *core.Consensus, p2pServer *p2p.Server) {
	ticker := time.NewTicker(60 * time.Second) // PoW block every 60 seconds
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if !consensus.IsPoSBlock(chain.GetBlockHeight() + 1) {
				// Time for PoW block
				fmt.Printf("\n⛏️  Mining PoW block...\n")
				
				// Get pending transactions (empty for now)
				txs := make([]*core.Transaction, 0)
				
				// Mine the block
				result, err := consensus.MinePoW(txs, core.ZeroAddress)
				if err != nil {
					log.Printf("Mining failed: %v", err)
					continue
				}

				// Add block to chain
				if err := chain.AddBlock(result.Block); err != nil {
					log.Printf("Failed to add PoW block: %v", err)
					continue
				}

				fmt.Printf("⛏️  PoW block mined: #%d (nonce: %d, time: %v)\n", 
					result.Block.Header.Height, result.Nonce, result.SolutionTime)

				// Broadcast to peers
				p2pServer.BroadcastBlock(result.Block)
			}
		}
	}
}

// runValidator runs the PoS validator
func runValidator(ctx context.Context, chain *core.Blockchain, consensus *core.Consensus, p2pServer *p2p.Server) {
	ticker := time.NewTicker(3 * time.Second) // PoS block every 3 seconds
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if consensus.IsPoSBlock(chain.GetBlockHeight() + 1) {
				// Time for PoS block
				validator := consensus.SelectValidator()
				if validator != core.ZeroAddress {
					// Create PoS block (simplified)
					fmt.Printf("✅ Validator selected: %x\n", validator[:4])
				}
			}
		}
	}
}

// runBlockSync runs block synchronization
func runBlockSync(ctx context.Context, chain *core.Blockchain, blockSync *core.SyncProtocol, p2pServer *p2p.Server) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Check sync status
			status := blockSync.GetSyncStatus()
			if status.ActiveSyncPeers > 0 {
				fmt.Printf("\n📡 Syncing with %d peers...\n", status.ActiveSyncPeers)
			}
		}
	}
}
