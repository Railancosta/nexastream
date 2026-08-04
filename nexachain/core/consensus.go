package core

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"math/rand"
	"sync"
	"time"
)

const (
	// Consensus constants
	PoWBlockInterval    = 60  // 1 PoW block every 60 seconds
	PoSBlockInterval    = 3   // 1 PoS block every 3 seconds
	PoWTargetBlocks      = 10 // PoW blocks needed for difficulty adjustment
	MinStakeAmount       = 100 * 1e18 // Minimum 100 NST to stake
	ValidatorReward      = 2 * 1e18   // 2 NST per validated block
	PoWReward           = 10 * 1e18  // 10 NST per PoW block
)

// Consensus represents the hybrid PoW+PoS consensus mechanism
type Consensus struct {
	chain              *Blockchain
	posEnabled         bool
	difficulty         uint64
	lastPoWBlock       uint64
	validatorSet       map[Address]uint64
	currentValidators  []Address
	mu                sync.RWMutex
}

// NewConsensus creates a new consensus mechanism
func NewConsensus(chain *Blockchain) *Consensus {
	return &Consensus{
		chain:         chain,
		posEnabled:    true,
		difficulty:    1000000, // Initial difficulty
		lastPoWBlock:  0,
		validatorSet:  make(map[Address]uint64),
		currentValidators: make([]Address, 0),
	}
}

// PoWResult represents the result of PoW mining
type PoWResult struct {
	Block        *Block
	Nonce        uint64
	MixDigest    Hash
	SolutionTime time.Duration
}

// MinePoW performs Proof of Work mining
func (c *Consensus) MinePoW(transactions []*Transaction, validator Address) (*PoWResult, error) {
	startTime := time.Now()
	
	latestBlock := c.chain.GetLatestBlock()
	height := latestBlock.Header.Height + 1
	
	// Create candidate block
	block := &Block{
		Header: Header{
			Version:     1,
			ChainID:     c.chain.chainID,
			Timestamp:   uint64(time.Now().Unix()),
			Height:      height,
			PrevHash:    latestBlock.Header.Hash(),
			GasLimit:    GasLimitPerBlock,
			Difficulty:  c.difficulty,
			Validator:   validator,
		},
		Transactions: transactions,
	}
	
	// PoW mining loop (simplified - real implementation would be more intensive)
	target := getTarget(c.difficulty)
	var nonce uint64
	
	for nonce < 0xFFFFFFFFFFFFFFFF {
		block.Header.Nonce = nonce
		
		// Calculate PoW hash
		hash := c.calculatePoWHash(&block.Header)
		
		// Check if solution meets target
		if meetsTarget(hash, target) {
			block.Header.Hash = hash
			
			solutionTime := time.Since(startTime)
			return &PoWResult{
				Block:        block,
				Nonce:        nonce,
				MixDigest:    hash,
				SolutionTime: solutionTime,
			}, nil
		}
		
		nonce++
		
		// Update hash every 1000000 iterations for progress
		if nonce%1000000 == 0 {
			block.Header.Timestamp = uint64(time.Now().Unix())
		}
	}
	
	return nil, fmt.Errorf("failed to find valid nonce")
}

// calculatePoWHash calculates the PoW hash of a block header
func (c *Consensus) calculatePoWHash(header *Header) Hash {
	data := make([]byte, 0)
	
	// Serialize header fields
	data = append(data, uint64ToBytes(header.Version)...)
	data = append(data, uint64ToBytes(header.ChainID)...)
	data = append(data, uint64ToBytes(header.Timestamp)...)
	data = append(data, uint64ToBytes(header.Height)...)
	data = append(data, header.PrevHash[:]...)
	data = append(data, uint64ToBytes(header.Nonce)...)
	data = append(data, uint64ToBytes(header.Difficulty)...)
	data = append(data, header.Validator[:]...)
	
	hash := sha256.Sum256(data)
	return sha256.Sum256(hash[:])
}

// getTarget calculates the target based on difficulty
func getTarget(difficulty uint64) []byte {
	target := make([]byte, 32)
	maxDifficulty := uint64(0xFFFFFFFFFFFFFFFF)
	
	factor := maxDifficulty / difficulty
	if factor < 1 {
		factor = 1
	}
	
	binary.BigEndian.PutUint64(target[24:], factor)
	return target
}

// meetsTarget checks if a hash meets the target
func meetsTarget(hash Hash, target []byte) bool {
	for i := 0; i < 32; i++ {
		if hash[i] < target[i] {
			return true
		} else if hash[i] > target[i] {
			return false
		}
	}
	return true
}

// ValidatePoSBlock validates a PoS block
func (c *Consensus) ValidatePoSBlock(block *Block) error {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	// Check if validator is in active set
	stakeAmount := c.chain.state.StakeAmounts[block.Header.Validator]
	if stakeAmount < MinStakeAmount {
		return fmt.Errorf("validator has insufficient stake: %d < %d", stakeAmount, MinStakeAmount)
	}
	
	// Verify signature (simplified)
	if len(block.Header.Signature) == 0 {
		return fmt.Errorf("missing validator signature")
	}
	
	// Verify block timestamp
	latestBlock := c.chain.GetLatestBlock()
	if block.Header.Timestamp <= latestBlock.Header.Timestamp {
		return fmt.Errorf("invalid block timestamp")
	}
	
	// Verify height
	if block.Header.Height != latestBlock.Header.Height+1 {
		return fmt.Errorf("invalid block height")
	}
	
	// Verify previous hash
	if block.Header.PrevHash != latestBlock.Header.Hash() {
		return fmt.Errorf("invalid previous hash")
	}
	
	return nil
}

// SelectValidator selects the next validator using weighted random selection
func (c *Consensus) SelectValidator() Address {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	if len(c.chain.validators) == 0 {
		return Address{}
	}
	
	// Calculate total stake
	totalStake := uint64(0)
	for _, stake := range c.chain.validators {
		totalStake += stake
	}
	
	if totalStake == 0 {
		return Address{}
	}
	
	// Weighted random selection
	rand.Seed(time.Now().UnixNano())
	randomValue := rand.Uint64() % totalStake
	
	cumulative := uint64(0)
	for validator, stake := range c.chain.validators {
		cumulative += stake
		if randomValue <= cumulative {
			return validator
		}
	}
	
	// Fallback to first validator
	for validator := range c.chain.validators {
		return validator
	}
	
	return Address{}
}

// SubmitPoSBlock submits a PoS block (produced by validator)
func (c *Consensus) SubmitPoSBlock(block *Block) error {
	// Validate the block
	if err := c.ValidatePoSBlock(block); err != nil {
		return err
	}
	
	// Add to chain
	if err := c.chain.AddBlock(block); err != nil {
		return err
	}
	
	// Distribute validator reward
	c.chain.state.Balances[block.Header.Validator] += ValidatorReward
	
	return nil
}

// AdjustDifficulty adjusts difficulty based on block times
func (c *Consensus) AdjustDifficulty() {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	blockHeight := c.chain.GetBlockHeight()
	if blockHeight < PoWTargetBlocks {
		return
	}
	
	// Get first and last blocks of the period
	firstBlock := c.chain.GetBlock(blockHeight - PoWTargetBlocks)
	lastBlock := c.chain.GetBlock(blockHeight)
	
	// Calculate actual time
	actualTime := lastBlock.Header.Timestamp - firstBlock.Header.Timestamp
	expectedTime := PoWTargetBlocks * uint64(PoWBlockInterval/time.Second)
	
	// Adjust difficulty
	if actualTime < expectedTime/2 {
		c.difficulty = c.difficulty * 11 / 10 // Increase by 10%
	} else if actualTime > expectedTime*2 {
		c.difficulty = c.difficulty * 9 / 10 // Decrease by 10%
	}
	
	// Cap difficulty
	if c.difficulty < 100000 {
		c.difficulty = 100000
	}
	if c.difficulty > 100000000 {
		c.difficulty = 100000000
	}
}

// GetCurrentDifficulty returns the current difficulty
func (c *Consensus) GetCurrentDifficulty() uint64 {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.difficulty
}

// IsPoSBlock checks if the current block should be PoS or PoW
func (c *Consensus) IsPoSBlock(height uint64) bool {
	// Every 10th block is PoW, rest are PoS
	return height%10 != 0
}

// GetValidatorReward returns the validator reward
func (c *Consensus) GetValidatorReward() uint64 {
	return ValidatorReward
}

// GetPoWReward returns the PoW reward
func (c *Consensus) GetPoWReward() uint64 {
	return PoWReward
}

// UpdateValidatorSet updates the validator set based on stake
func (c *Consensus) UpdateValidatorSet() {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.chain.validators = make(map[Address]uint64)
	for addr, stake := range c.chain.state.StakeAmounts {
		if stake >= MinStakeAmount {
			c.chain.validators[addr] = stake
		}
	}
}

// GetValidatorCount returns the number of active validators
func (c *Consensus) GetValidatorCount() int {
	return len(c.chain.validators)
}

// GetTotalStake returns the total staked amount
func (c *Consensus) GetTotalStake() uint64 {
	total := uint64(0)
	for _, stake := range c.chain.validators {
		total += stake
	}
	return total
}

// uint64ToBytes converts uint64 to bytes
func uint64ToBytes(n uint64) []byte {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, n)
	return b
}

// GetConsensusInfo returns consensus information
func (c *Consensus) GetConsensusInfo() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	return map[string]interface{}{
		"mode":               "hybrid_pow_pos",
		"pos_enabled":       c.posEnabled,
		"current_difficulty": c.difficulty,
		"validator_count":    len(c.chain.validators),
		"total_stake":       c.GetTotalStake(),
		"pow_block_interval": PoWBlockInterval,
		"pos_block_interval": PoSBlockInterval,
		"min_stake_amount":  MinStakeAmount,
		"validator_reward":   ValidatorReward,
		"pow_reward":         PoWReward,
		"last_pow_block":    c.lastPoWBlock,
	}
}
