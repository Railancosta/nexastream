package core

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

const (
	MaxSupply        = 55000000 * 1e18 // 55 million NST
	BlockTime        = 3 * time.Second
	MaxTxPerBlock     = 1000
	GasLimitPerBlock = 30000000
	InitialReward     = 10 * 1e18 // 10 NST per block
	RewardHalving     = 4 * 60 * 24 * 365 // Every 4 years (assuming 1 block per 3 sec)
)

// ZeroHash is the hash of an empty string
var ZeroHash = sha256.Sum256([]byte{})

// ZeroAddress is the zero address
var ZeroAddress = Address{}

// Address represents a blockchain address
type Address [20]byte

// Hash represents a 256-bit hash
type Hash [32]byte

// Header represents a block header
type Header struct {
	Version      uint32  `json:"version"`
	ChainID      uint64  `json:"chain_id"`
	Timestamp    uint64  `json:"timestamp"`
	Height       uint64  `json:"height"`
	PrevHash     Hash    `json:"prev_hash"`
	StateRoot    Hash    `json:"state_root"`
	TxRoot       Hash    `json:"tx_root"`
	ReceiptRoot  Hash    `json:"receipt_root"`
	GasUsed      uint64  `json:"gas_used"`
	GasLimit     uint64  `json:"gas_limit"`
	Difficulty   uint64  `json:"difficulty"`
	Validator    Address `json:"validator"`
	Signature    []byte  `json:"signature,omitempty"`
}

// Block represents a block in the blockchain
type Block struct {
	Header       Header       `json:"header"`
	Transactions []*Transaction `json:"transactions"`
	Allocations  map[string]uint64 `json:"allocations,omitempty"`
}

// Transaction represents a blockchain transaction
type Transaction struct {
	ID        string   `json:"id"`
	Type      TxType   `json:"type"`
	From      Address  `json:"from"`
	To        Address  `json:"to"`
	Value     uint64   `json:"value"`
	TokenID   string   `json:"token_id,omitempty"`
	Data      []byte   `json:"data,omitempty"`
	GasLimit  uint64   `json:"gas_limit"`
	GasPrice  uint64   `json:"gas_price"`
	Nonce     uint64   `json:"nonce"`
	ChainID   uint64   `json:"chain_id"`
	Timestamp uint64   `json:"timestamp"`
	Hash      Hash     `json:"hash"`
	Signature []byte   `json:"signature,omitempty"`
	Receipt   *Receipt `json:"receipt,omitempty"`
}

// TxType represents the type of transaction
type TxType uint8

const (
	TxTypeTransfer TxType = iota
	TxTypeStake
	TxTypeUnstake
	TxTypeReward
	TxTypeContract
	TxTypeNFTMint
	TxTypeNFTTransfer
	TxTypeGovernance
)

// Receipt represents a transaction receipt
type Receipt struct {
	TxHash      Hash   `json:"tx_hash"`
	BlockHash   Hash   `json:"block_hash"`
	BlockNumber uint64 `json:"block_number"`
	Status      uint64 `json:"status"` // 1 = success, 0 = failure
	GasUsed     uint64 `json:"gas_used"`
	Logs        []Log  `json:"logs"`
}

// Log represents a contract event log
type Log struct {
	Address Address `json:"address"`
	Topics  []Hash  `json:"topics"`
	Data    []byte  `json:"data"`
}

// State represents the world state
type State struct {
	Balances     map[Address]uint64 `json:"balances"`
	StakeAmounts map[Address]uint64 `json:"stake_amounts"`
	Nonces       map[Address]uint64 `json:"nonces"`
	Contracts    map[Address]*Contract `json:"contracts"`
}

// Contract represents a smart contract
type Contract struct {
	Address    Address   `json:"address"`
	Code       []byte    `json:"code"`
	Storage    map[Hash]Hash `json:"storage"`
	Owner      Address   `json:"owner"`
	Name       string    `json:"name"`
	Symbol     string    `json:"symbol"`
	TotalSupply uint64   `json:"total_supply"`
}

// Blockchain represents the blockchain
type Blockchain struct {
	chainID     uint64
	networkName string
	blocks      []*Block
	state       *State
	validators  map[Address]uint64
	mu          sync.RWMutex
}

// NewBlockchain creates a new blockchain instance
func NewBlockchain(chainID uint64, networkName string) *Blockchain {
	bc := &Blockchain{
		chainID:     chainID,
		networkName: networkName,
		blocks:      make([]*Block, 0),
		state: &State{
			Balances:     make(map[Address]uint64),
			StakeAmounts: make(map[Address]uint64),
			Nonces:       make(map[Address]uint64),
			Contracts:    make(map[Address]*Contract),
		},
		validators: make(map[Address]uint64),
	}

	// Initialize genesis block
	genesis := bc.CreateGenesisBlock()
	bc.blocks = append(bc.blocks, genesis)

	return bc
}

// CreateGenesisBlock creates the genesis block
func (bc *Blockchain) CreateGenesisBlock() *Block {
	allocations := map[string]uint64{
		"0x0000000000000000000000000000000000000001": 27500000 * 1e18, // Ecosystem (50%)
		"0x0000000000000000000000000000000000000002": 16500000 * 1e18, // Rewards (30%)
		"0x0000000000000000000000000000000000000003": 5500000 * 1e18,  // Team (10%)
		"0x0000000000000000000000000000000000000004": 2750000 * 1e18,  // Public Sale (5%)
		"0x0000000000000000000000000000000000000005": 2750000 * 1e18,  // Liquidity (5%)
	}

	genesis := &Block{
		Header: Header{
			Version:    1,
			ChainID:    bc.chainID,
			Timestamp:  uint64(time.Now().Unix()),
			Height:     0,
			PrevHash:   ZeroHash,
			GasLimit:   GasLimitPerBlock,
			Difficulty: 1,
		},
		Transactions: []*Transaction{},
		Allocations:  allocations,
	}

	// Apply genesis allocations to state
	for addrStr, amount := range allocations {
		var addr Address
		copy(addr[:], addrStr[2:])
		bc.state.Balances[addr] = amount
	}

	genesis.Header.StateRoot = genesis.CalcStateRoot()
	genesis.Header.TxRoot = genesis.CalcTxRoot()

	return genesis
}

// GetBlockHeight returns the current block height
func (bc *Blockchain) GetBlockHeight() uint64 {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	return uint64(len(bc.blocks) - 1)
}

// GetBlock returns a block by height
func (bc *Blockchain) GetBlock(height uint64) *Block {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	if int(height) >= len(bc.blocks) {
		return nil
	}
	return bc.blocks[height]
}

// GetLatestBlock returns the latest block
func (bc *Blockchain) GetLatestBlock() *Block {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	if len(bc.blocks) == 0 {
		return nil
	}
	return bc.blocks[len(bc.blocks)-1]
}

// AddBlock adds a new block to the chain
func (bc *Blockchain) AddBlock(block *Block) error {
	bc.mu.Lock()
	defer bc.mu.Unlock()

	// Verify block
	if len(bc.blocks) != int(block.Header.Height) {
		return fmt.Errorf("invalid block height: expected %d, got %d", len(bc.blocks), block.Header.Height)
	}

	expectedPrevHash := bc.blocks[len(bc.blocks)-1].Header.Hash()
	if block.Header.PrevHash != expectedPrevHash {
		return fmt.Errorf("invalid previous hash")
	}

	// Execute transactions
	for _, tx := range block.Transactions {
		if err := bc.executeTransaction(tx); err != nil {
			return fmt.Errorf("transaction failed: %v", err)
		}
	}

	bc.blocks = append(bc.blocks, block)
	return nil
}

// executeTransaction executes a transaction
func (bc *Blockchain) executeTransaction(tx *Transaction) error {
	switch tx.Type {
	case TxTypeTransfer:
		return bc.executeTransfer(tx)
	case TxTypeStake:
		return bc.executeStake(tx)
	case TxTypeUnstake:
		return bc.executeUnstake(tx)
	default:
		return fmt.Errorf("unknown transaction type")
	}
}

// executeTransfer executes a transfer transaction
func (bc *Blockchain) executeTransfer(tx *Transaction) error {
	if bc.state.Balances[tx.From] < tx.Value {
		return fmt.Errorf("insufficient balance")
	}
	bc.state.Balances[tx.From] -= tx.Value
	bc.state.Balances[tx.To] += tx.Value
	return nil
}

// executeStake executes a stake transaction
func (bc *Blockchain) executeStake(tx *Transaction) error {
	if bc.state.Balances[tx.From] < tx.Value {
		return fmt.Errorf("insufficient balance to stake")
	}
	bc.state.Balances[tx.From] -= tx.Value
	bc.state.StakeAmounts[tx.From] += tx.Value
	bc.validators[tx.From] = bc.state.StakeAmounts[tx.From]
	return nil
}

// executeUnstake executes an unstake transaction
func (bc *Blockchain) executeUnstake(tx *Transaction) error {
	stakedAmount := bc.state.StakeAmounts[tx.From]
	if stakedAmount < tx.Value {
		return fmt.Errorf("insufficient staked amount")
	}
	bc.state.StakeAmounts[tx.From] -= tx.Value
	bc.state.Balances[tx.From] += tx.Value
	bc.validators[tx.From] = bc.state.StakeAmounts[tx.From]
	if bc.validators[tx.From] == 0 {
		delete(bc.validators, tx.From)
	}
	return nil
}

// GetBalance returns the balance of an address
func (bc *Blockchain) GetBalance(addr Address) uint64 {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	return bc.state.Balances[addr]
}

// GetStakedAmount returns the staked amount of an address
func (bc *Blockchain) GetStakedAmount(addr Address) uint64 {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	return bc.state.StakeAmounts[addr]
}

// GetTotalStaked returns the total staked amount
func (bc *Blockchain) GetTotalStaked() uint64 {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	total := uint64(0)
	for _, amount := range bc.state.StakeAmounts {
		total += amount
	}
	return total
}

// GetCirculatingSupply returns the circulating supply
func (bc *Blockchain) GetCirculatingSupply() uint64 {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	total := uint64(0)
	for _, balance := range bc.state.Balances {
		total += balance
	}
	return total
}

// Hash returns the hash of the header
func (h *Header) Hash() Hash {
	data, _ := json.Marshal(h)
	hash := sha256.Sum256(data)
	return hash
}

// CalcStateRoot calculates the state root hash
func (b *Block) CalcStateRoot() Hash {
	data, _ := json.Marshal(b.Allocations)
	return sha256.Sum256(data)
}

// CalcTxRoot calculates the transaction root hash
func (b *Block) CalcTxRoot() Hash {
	if len(b.Transactions) == 0 {
		return ZeroHash
	}
	data, _ := json.Marshal(b.Transactions)
	return sha256.Sum256(data)
}

// CreateTransaction creates a new transaction
func CreateTransaction(txType TxType, from, to Address, value uint64, data []byte) *Transaction {
	tx := &Transaction{
		ID:        uuid.New().String(),
		Type:      txType,
		From:      from,
		To:        to,
		Value:     value,
		Data:      data,
		GasLimit:  21000,
		GasPrice:  1e9, // 1 Gwei
		Timestamp: uint64(time.Now().Unix()),
	}
	tx.Hash = tx.CalculateHash()
	return tx
}

// CalculateHash calculates the transaction hash
func (tx *Transaction) CalculateHash() Hash {
	data, _ := json.Marshal(tx)
	return sha256.Sum256(data)
}

// GetStats returns blockchain statistics
func (bc *Blockchain) GetStats() map[string]interface{} {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	
	totalSupply := MaxSupply
	circulating := uint64(0)
	for _, balance := range bc.state.Balances {
		circulating += balance
	}
	
	totalStaked := uint64(0)
	for _, amount := range bc.state.StakeAmounts {
		totalStaked += amount
	}

	return map[string]interface{}{
		"chain_id":              bc.chainID,
		"network_name":           bc.networkName,
		"block_height":          len(bc.blocks) - 1,
		"total_transactions":    bc.getTotalTransactions(),
		"total_supply":          totalSupply,
		"circulating_supply":    circulating,
		"total_staked":         totalStaked,
		"staking_percentage":     float64(totalStaked) / float64(totalSupply) * 100,
		"validators_count":      len(bc.validators),
		"block_time_seconds":    BlockTime.Seconds(),
		"gas_limit":            GasLimitPerBlock,
		"version":              "1.0.0",
	}
}

func (bc *Blockchain) getTotalTransactions() uint64 {
	total := uint64(0)
	for _, block := range bc.blocks {
		total += uint64(len(block.Transactions))
	}
	return total
}
