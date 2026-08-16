package api

import (
"encoding/json"
"fmt"
"net/http"
"time"

"github.com/gorilla/mux"
"github.com/nexastream/nexachain/core"
"github.com/nexastream/nexachain/p2p"
"github.com/nexastream/nexachain/wallet"
)

/*
 * NexaChain RPC API Server
 * 
 * Provides HTTP endpoints for blockchain operations:
 * - Blockchain queries (blocks, transactions, stats)
 * - Wallet operations (create, import, balance, send)
 * - Token operations (supply, staking)
 * - P2P network info
 */

type Server struct {
chain         *core.Blockchain
walletManager *wallet.WalletManager
p2pServer     *p2p.Server
httpServer    *http.Server
}

func NewServer(chain *core.Blockchain, walletManager *wallet.WalletManager, p2pServer *p2p.Server) *Server {
return &Server{
chain:         chain,
walletManager: walletManager,
p2pServer:     p2pServer,
}
}

func (s *Server) Start(addr string) error {
router := mux.NewRouter()

// CORS middleware
router.Use(func(next http.Handler) http.Handler {
return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
if r.Method == "OPTIONS" {
w.WriteHeader(http.StatusOK)
return
}
next.ServeHTTP(w, r)
})
})

// Health check
router.HandleFunc("/api/v1/health", s.handleHealth).Methods("GET")
router.HandleFunc("/health", s.handleHealth).Methods("GET")
router.HandleFunc("/status", s.handleStatus).Methods("GET")

// Blockchain endpoints
router.HandleFunc("/api/v1/chain/stats", s.handleChainStats).Methods("GET")
router.HandleFunc("/api/v1/blocks/latest", s.handleLatestBlock).Methods("GET")
router.HandleFunc("/api/v1/blocks/{height}", s.handleBlockByHeight).Methods("GET")
router.HandleFunc("/api/v1/transactions/{hash}", s.handleTransaction).Methods("GET")

// Wallet endpoints
router.HandleFunc("/api/v1/wallet/create", s.handleCreateWallet).Methods("POST")
router.HandleFunc("/api/v1/wallet/import", s.handleImportWallet).Methods("POST")
router.HandleFunc("/api/v1/wallet/{address}", s.handleGetWallet).Methods("GET")
router.HandleFunc("/api/v1/wallet/{address}/balance", s.handleGetBalance).Methods("GET")
router.HandleFunc("/api/v1/wallet/transactions", s.handleCreateTransaction).Methods("POST")

// Token endpoints
router.HandleFunc("/api/v1/token/stats", s.handleTokenStats).Methods("GET")
router.HandleFunc("/api/v1/token/supply", s.handleTokenSupply).Methods("GET")

// Staking endpoints
router.HandleFunc("/api/v1/staking/stats", s.handleStakingStats).Methods("GET")
router.HandleFunc("/api/v1/staking/stake", s.handleStake).Methods("POST")
router.HandleFunc("/api/v1/staking/unstake", s.handleUnstake).Methods("POST")

// P2P endpoints
router.HandleFunc("/api/v1/p2p/peers", s.handleGetPeers).Methods("GET")
router.HandleFunc("/api/v1/p2p/info", s.handleP2PInfo).Methods("GET")
router.HandleFunc("/api/v1/peers", s.handleGetPeers).Methods("GET")

// Send transaction endpoint
router.HandleFunc("/api/v1/send", s.handleSendTransaction).Methods("POST")

s.httpServer = &http.Server{
Addr:         addr,
Handler:      router,
ReadTimeout:  15 * time.Second,
WriteTimeout: 15 * time.Second,
}

return s.httpServer.ListenAndServe()
}

func (s *Server) Stop() {
if s.httpServer != nil {
s.httpServer.Close()
}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(map[string]interface{}{
"status":     "ok",
"timestamp":  time.Now().Unix(),
"version":    "0.1.0-dev",
"blockchain": "NexaChain",
})
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Content-Type", "application/json")

stats := s.chain.GetStats()
peerCount := 0
if s.p2pServer != nil {
peerCount = s.p2pServer.GetPeerCount()
}

json.NewEncoder(w).Encode(map[string]interface{}{
"jsonrpc": "2.0",
"id": 1,
"result": map[string]interface{}{
"node_info": map[string]interface{}{
"protocol_version": map[string]string{
"p2p": "7",
"block": "10",
"app": "0",
},
"id":         "nexachain-node",
"listen_addr": "0.0.0.0:26656",
"network":    "nexastream-local",
"version":    "0.1.0",
"channels":   "4020212223303800",
"moniker":    "local-node",
"other": map[string]interface{}{
"tx_index":    "on",
"rpc_address": "tcp://0.0.0.0:26657",
},
},
"sync_info": map[string]interface{}{
"latest_block_hash":   fmt.Sprintf("%x", stats["block_height"]),
"latest_app_hash":     "",
"latest_block_height": stats["block_height"],
"catching_up":         false,
},
"validator_info": map[string]interface{}{
"address": fmt.Sprintf("0x%x", core.ZeroAddress),
"pub_key": "",
"voting_power": "0",
},
},
})
}

func (s *Server) handleChainStats(w http.ResponseWriter, r *http.Request) {
stats := s.chain.GetStats()

// Add P2P info
peerCount := 0
if s.p2pServer != nil {
peerCount = s.p2pServer.GetPeerCount()
}
stats["peer_count"] = peerCount

json.NewEncoder(w).Encode(stats)
}

func (s *Server) handleLatestBlock(w http.ResponseWriter, r *http.Request) {
block := s.chain.GetLatestBlock()
if block == nil {
http.Error(w, "No blocks found", http.StatusNotFound)
return
}
json.NewEncoder(w).Encode(map[string]interface{}{
"block": block,
})
}

func (s *Server) handleBlockByHeight(w http.ResponseWriter, r *http.Request) {
var height uint64
fmt.Sscanf(mux.Vars(r)["height"], "%d", &height)

block := s.chain.GetBlock(height)
if block == nil {
http.Error(w, "Block not found", http.StatusNotFound)
return
}
json.NewEncoder(w).Encode(block)
}

func (s *Server) handleTransaction(w http.ResponseWriter, r *http.Request) {
tx := &core.Transaction{
ID:        mux.Vars(r)["hash"],
Type:      core.TxTypeTransfer,
Timestamp: uint64(time.Now().Unix()),
}
json.NewEncoder(w).Encode(tx)
}

func (s *Server) handleCreateWallet(w http.ResponseWriter, r *http.Request) {
wlt, err := s.walletManager.CreateWallet()
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(map[string]interface{}{
"address":    fmt.Sprintf("0x%x", wlt.Address),
"public_key": fmt.Sprintf("0x%x", wlt.PublicKey.X),
})
}

func (s *Server) handleImportWallet(w http.ResponseWriter, r *http.Request) {
var req struct {
PrivateKey string `json:"private_key"`
}
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
http.Error(w, "Invalid request", http.StatusBadRequest)
return
}

wlt, err := s.walletManager.ImportWallet(req.PrivateKey)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(map[string]interface{}{
"address":    fmt.Sprintf("0x%x", wlt.Address),
"success":    true,
})
}

func (s *Server) handleGetWallet(w http.ResponseWriter, r *http.Request) {
addrStr := mux.Vars(r)["address"]
var addr core.Address
fmt.Sscanf(addrStr, "0x%x", &addr)

balance := s.chain.GetBalance(addr)
staked := s.chain.GetStakedAmount(addr)

json.NewEncoder(w).Encode(map[string]interface{}{
"address": addrStr,
"balance": balance,
"staked":  staked,
})
}

func (s *Server) handleGetBalance(w http.ResponseWriter, r *http.Request) {
addrStr := mux.Vars(r)["address"]
var addr core.Address
fmt.Sscanf(addrStr, "0x%x", &addr)

balance := s.chain.GetBalance(addr)
json.NewEncoder(w).Encode(map[string]interface{}{
"address": addrStr,
"balance": balance,
})
}

func (s *Server) handleCreateTransaction(w http.ResponseWriter, r *http.Request) {
var req struct {
To    string `json:"to"`
Value uint64 `json:"value"`
}
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
http.Error(w, "Invalid request", http.StatusBadRequest)
return
}

var to core.Address
fmt.Sscanf(req.To, "0x%x", &to)

tx, err := s.walletManager.CreateTransaction(to, req.Value)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}

json.NewEncoder(w).Encode(tx)
}

func (s *Server) handleSendTransaction(w http.ResponseWriter, r *http.Request) {
var req struct {
From       string `json:"from"`
To         string `json:"to"`
Value      uint64 `json:"value"`
PrivateKey string `json:"private_key"`
}
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
http.Error(w, "Invalid request", http.StatusBadRequest)
return
}

var from, to core.Address
fmt.Sscanf(req.From, "0x%x", &from)
fmt.Sscanf(req.To, "0x%x", &to)

tx := core.CreateTransaction(core.TxTypeTransfer, from, to, req.Value, nil)

wlt, err := s.walletManager.ImportWallet(req.PrivateKey)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}

tx.From = wlt.Address
s.walletManager.SignTransaction(tx)

json.NewEncoder(w).Encode(map[string]interface{}{
"tx_hash": fmt.Sprintf("0x%x", tx.Hash),
"success": true,
})
}

func (s *Server) handleTokenStats(w http.ResponseWriter, r *http.Request) {
stats := s.chain.GetStats()
stats["name"] = "NexaStream Token"
stats["symbol"] = "NST"
stats["decimals"] = 18
json.NewEncoder(w).Encode(stats)
}

func (s *Server) handleTokenSupply(w http.ResponseWriter, r *http.Request) {
json.NewEncoder(w).Encode(map[string]interface{}{
"max_supply":         core.MaxSupply,
"circulating_supply":  s.chain.GetCirculatingSupply(),
"total_supply":       s.chain.GetCirculatingSupply(),
})
}

func (s *Server) handleStakingStats(w http.ResponseWriter, r *http.Request) {
totalStaked := s.chain.GetTotalStaked()
maxSupply := core.MaxSupply

apy := 12.5

json.NewEncoder(w).Encode(map[string]interface{}{
"total_staked":          totalStaked,
"staking_percentage":    float64(totalStaked) / float64(maxSupply) * 100,
"annual_percentage_yield": apy,
"min_stake_amount":      100 * 1e18,
"unbonding_period":     "7 days",
})
}

func (s *Server) handleStake(w http.ResponseWriter, r *http.Request) {
var req struct {
Amount      uint64 `json:"amount"`
PrivateKey string `json:"private_key"`
}
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
http.Error(w, "Invalid request", http.StatusBadRequest)
return
}

json.NewEncoder(w).Encode(map[string]interface{}{
"success": true,
"message": "Stake request submitted",
"amount":  req.Amount,
})
}

func (s *Server) handleUnstake(w http.ResponseWriter, r *http.Request) {
var req struct {
Amount      uint64 `json:"amount"`
PrivateKey string `json:"private_key"`
}
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
http.Error(w, "Invalid request", http.StatusBadRequest)
return
}

json.NewEncoder(w).Encode(map[string]interface{}{
"success":           true,
"message":          "Unstake request submitted",
"amount":           req.Amount,
"unbonding_period": "7 days",
})
}

func (s *Server) handleGetPeers(w http.ResponseWriter, r *http.Request) {
peerCount := 0
peers := make([]map[string]interface{}, 0)

if s.p2pServer != nil {
peerCount = s.p2pServer.GetPeerCount()
peerInfos := s.p2pServer.GetPeers()
for _, p := range peerInfos {
peers = append(peers, map[string]interface{}{
"id":      p.ID.String(),
"address": p.Address,
"online":  p.Connected,
})
}
}

json.NewEncoder(w).Encode(map[string]interface{}{
"peer_count": peerCount,
"peers":     peers,
})
}

func (s *Server) handleP2PInfo(w http.ResponseWriter, r *http.Request) {
peerCount := 0
nodeID := "local-node"

if s.p2pServer != nil {
peerCount = s.p2pServer.GetPeerCount()
host := s.p2pServer.GetHost()
if host != nil {
nodeID = host.ID().String()
}
}

json.NewEncoder(w).Encode(map[string]interface{}{
"node_id":    nodeID,
"peer_count": peerCount,
"version":    "0.1.0",
})
}
