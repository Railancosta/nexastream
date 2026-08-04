package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nexastream/nexachain/core"
	"github.com/nexastream/nexachain/api"
	"github.com/nexastream/nexachain/p2p"
	"github.com/nexastream/nexachain/wallet"
)

var (
	Version     = "1.0.0"
	ChainID     = uint64(1010101)
	NetworkName = "NexaChain Mainnet"
)

func main() {
	fmt.Println(`
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
╚═══════════════════════════════════════════════════════════╝
`)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize blockchain
	chain := core.NewBlockchain(ChainID, NetworkName)
	
	// Initialize wallet manager
	walletManager := wallet.NewWalletManager(chain)
	
	// Initialize P2P server
	p2pServer := p2p.NewServer(chain, walletManager)
	
	// Initialize API server
	apiServer := api.NewServer(chain, walletManager, p2pServer)

	// Start P2P server
	go func() {
		if err := p2pServer.Start(ctx); err != nil {
			log.Printf("P2P Server error: %v", err)
		}
	}()

	// Start API server
	go func() {
		apiAddr := ":8080"
		if addr := os.Getenv("API_ADDR"); addr != "" {
			apiAddr = addr
		}
		log.Printf("API Server starting on %s", apiAddr)
		if err := apiServer.Start(apiAddr); err != nil {
			log.Printf("API Server error: %v", err)
		}
	}()

	// Print node info
	fmt.Printf("\n📡 NexaChain Node v%s\n", Version)
	fmt.Printf("🌐 Network: %s (Chain ID: %d)\n", NetworkName, ChainID)
	fmt.Printf("📦 Block Height: %d\n", chain.GetBlockHeight())
	fmt.Printf("🔗 P2P Port: %d\n", p2pServer.GetPort())
	fmt.Printf("🌐 API Port: 8080\n")
	fmt.Printf("\n✅ Node is running!\n")
	fmt.Printf("\nUseful endpoints:\n")
	fmt.Printf("  curl http://localhost:8080/api/v1/health\n")
	fmt.Printf("  curl http://localhost:8080/api/v1/chain/stats\n")
	fmt.Printf("  curl http://localhost:8080/api/v1/blocks/latest\n")
	fmt.Printf("\nPress Ctrl+C to stop\n\n")

	// Wait for interrupt signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	fmt.Println("\n🛑 Shutting down...")
	cancel()
	p2pServer.Stop()
	apiServer.Stop()
	fmt.Println("✅ Node stopped")
}
