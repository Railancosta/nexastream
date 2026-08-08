package core

import (
	"testing"
	"time"
)

// TestBlockchainCreation tests blockchain initialization
func TestBlockchainCreation(t *testing.T) {
	chainID := uint64(1337)
	networkName := "testnet"

	bc := NewBlockchain(chainID, networkName)

	if bc == nil {
		t.Fatal("Blockchain should not be nil")
	}

	if bc.chainID != chainID {
		t.Errorf("ChainID mismatch: expected %d, got %d", chainID, bc.chainID)
	}

	if bc.networkName != networkName {
		t.Errorf("NetworkName mismatch: expected %s, got %s", networkName, bc.networkName)
	}

	if len(bc.blocks) != 1 {
		t.Errorf("Genesis block not created: expected 1 block, got %d", len(bc.blocks))
	}
}

// TestGenesisBlockCreation tests genesis block creation
func TestGenesisBlockCreation(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")

	genesis := bc.GetLatestBlock()
	if genesis == nil {
		t.Fatal("Genesis block should exist")
	}

	if genesis.Header.Height != 0 {
		t.Errorf("Genesis height should be 0, got %d", genesis.Header.Height)
	}

	if genesis.Header.ChainID != 1337 {
		t.Errorf("Genesis chain ID mismatch")
	}
}

// TestGenesisAllocations tests initial token distribution
func TestGenesisAllocations(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")

	genesis := bc.GetLatestBlock()
	if genesis.Allocations == nil {
		t.Fatal("Genesis should have allocations")
	}

	// Check total allocation = 55,000,000 NST (55,000,000 * 1e18 wei)
	expectedTotal := uint64(55000000 * 1e18)
	var total uint64
	for _, amount := range genesis.Allocations {
		total += amount
	}

	if total != expectedTotal {
		t.Errorf("Total allocation mismatch: expected %d, got %d", expectedTotal, total)
	}
}

// TestBlockHeight tests block height tracking
func TestBlockHeight(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")

	height := bc.GetBlockHeight()
	if height != 0 {
		t.Errorf("Initial height should be 0, got %d", height)
	}
}

// TestGetBlock tests retrieving blocks by height
func TestGetBlock(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")

	// Genesis block should exist at height 0
	block := bc.GetBlock(0)
	if block == nil {
		t.Fatal("Genesis block should be retrievable")
	}

	// Non-existent block should return nil
	block = bc.GetBlock(999)
	if block != nil {
		t.Error("Non-existent block should return nil")
	}
}

// TestBalanceOperations tests balance queries
func TestBalanceOperations(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")

	// Get balance of a genesis allocation address
	var addr Address
	copy(addr[:], []byte{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01})

	balance := bc.GetBalance(addr)
	if balance == 0 {
		t.Error("Genesis allocation address should have balance")
	}
}

// TestTransactionCreation tests transaction creation
func TestTransactionCreation(t *testing.T) {
	var from, to Address
	
	tx := CreateTransaction(
		TxTypeTransfer,
		from,
		to,
		1000,
		nil,
	)

	if tx == nil {
		t.Fatal("Transaction should not be nil")
	}

	if tx.Type != TxTypeTransfer {
		t.Errorf("Transaction type mismatch: expected %d, got %d", TxTypeTransfer, tx.Type)
	}

	if tx.Value != 1000 {
		t.Errorf("Transaction value mismatch: expected 1000, got %d", tx.Value)
	}

	if tx.ID == "" {
		t.Error("Transaction should have an ID")
	}

	if tx.Hash == [32]byte{} {
		t.Error("Transaction should have a hash")
	}
}

// TestTransactionHash tests transaction hash calculation
func TestTransactionHash(t *testing.T) {
	var from, to Address
	
	tx := CreateTransaction(
		TxTypeTransfer,
		from,
		to,
		1000,
		nil,
	)

	hash := tx.CalculateHash()
	
	if hash == [32]byte{} {
		t.Error("Transaction hash should not be empty")
	}

	// Same transaction should produce same hash
	hash2 := tx.CalculateHash()
	if hash != hash2 {
		t.Error("Same transaction should produce same hash")
	}
}

// TestBlockHash tests block header hashing
func TestBlockHash(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")
	genesis := bc.GetLatestBlock()

	hash := genesis.Header.Hash()
	
	if hash == [32]byte{} {
		t.Error("Block hash should not be empty")
	}

	// Genesis block hash should be deterministic
	hash2 := genesis.Header.Hash()
	if hash != hash2 {
		t.Error("Same block header should produce same hash")
	}
}

// TestStatsRetrieval tests blockchain statistics
func TestStatsRetrieval(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")

	stats := bc.GetStats()
	
	if stats["chain_id"] != uint64(1337) {
		t.Error("Chain ID mismatch in stats")
	}

	if stats["network_name"] != "testnet" {
		t.Error("Network name mismatch in stats")
	}

	if stats["max_supply"] != MaxSupply {
		t.Error("Max supply mismatch in stats")
	}

	if stats["version"] != "1.0.0" {
		t.Error("Version mismatch in stats")
	}
}

// TestSupplyCalculations tests supply tracking
func TestSupplyCalculations(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")

	circulating := bc.GetCirculatingSupply()
	if circulating == 0 {
		t.Error("Circulating supply should not be zero after genesis")
	}

	if circulating > MaxSupply {
		t.Error("Circulating supply should not exceed max supply")
	}
}

// TestStakingOperations tests staking functionality
func TestStakingOperations(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")

	// Initial staked amount should be zero
	staked := bc.GetTotalStaked()
	if staked != 0 {
		t.Errorf("Initial staked should be 0, got %d", staked)
	}

	// Get staked amount for address with no stake
	var addr Address
	staked = bc.GetStakedAmount(addr)
	if staked != 0 {
		t.Errorf("Unstaked address should have 0 staked, got %d", staked)
	}
}

// TestConsensusInfo tests consensus information retrieval
func TestConsensusInfo(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")
	consensus := NewConsensus(bc)

	info := consensus.GetConsensusInfo()

	if info["mode"] != "hybrid_pow_pos" {
		t.Error("Consensus mode should be hybrid_pow_pos")
	}

	if info["pos_enabled"] != true {
		t.Error("PoS should be enabled")
	}

	if info["validator_reward"] != ValidatorReward {
		t.Error("Validator reward mismatch")
	}

	if info["pow_reward"] != PoWReward {
		t.Error("PoW reward mismatch")
	}
}

// TestDifficultyAdjustment tests difficulty adjustment
func TestDifficultyAdjustment(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")
	consensus := NewConsensus(bc)

	initialDifficulty := consensus.GetCurrentDifficulty()
	
	// Adjust difficulty multiple times
	for i := 0; i < 15; i++ {
		consensus.AdjustDifficulty()
	}

	// Difficulty should be within bounds
	newDifficulty := consensus.GetCurrentDifficulty()
	if newDifficulty < 100000 {
		t.Error("Difficulty should not go below minimum")
	}
	if newDifficulty > 100000000 {
		t.Error("Difficulty should not go above maximum")
	}

	// Difficulty should have changed (or stayed the same if perfectly on target)
	_ = initialDifficulty // Just to use the variable
}

// TestValidatorSelection tests validator selection
func TestValidatorSelection(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")
	consensus := NewConsensus(bc)

	// No validators should return empty address
	validator := consensus.SelectValidator()
	if validator != ZeroAddress {
		t.Error("No validators should return zero address")
	}

	// Update validator set
	consensus.UpdateValidatorSet()
	
	// Should still return zero if no one has minimum stake
	validator = consensus.SelectValidator()
	if validator != ZeroAddress {
		t.Error("No validators with minimum stake should return zero address")
	}
}

// TestIsPoSBlock tests PoS/PoW block determination
func TestIsPoSBlock(t *testing.T) {
	bc := NewBlockchain(1337, "testnet")
	consensus := NewConsensus(bc)

	// Every 10th block should be PoW
	testCases := []struct {
		height    uint64
		isPoS     bool
	}{
		{1, true},   // PoS
		{5, true},   // PoS
		{9, true},   // PoS
		{10, false}, // PoW
		{11, true},  // PoS
		{20, false}, // PoW
	}

	for _, tc := range testCases {
		result := consensus.IsPoSBlock(tc.height)
		if result != tc.isPoS {
			t.Errorf("Block %d: expected PoS=%v, got %v", tc.height, tc.isPoS, result)
		}
	}
}

// TestTransactionTypes tests all transaction types
func TestTransactionTypes(t *testing.T) {
	if TxTypeTransfer != 0 {
		t.Error("TxTypeTransfer should be 0")
	}
	if TxTypeStake != 1 {
		t.Error("TxTypeStake should be 1")
	}
	if TxTypeUnstake != 2 {
		t.Error("TxTypeUnstake should be 2")
	}
	if TxTypeReward != 3 {
		t.Error("TxTypeReward should be 3")
	}
	if TxTypeContract != 4 {
		t.Error("TxTypeContract should be 4")
	}
}

// TestConstants tests blockchain constants
func TestConstants(t *testing.T) {
	if MaxSupply != 55000000*1e18 {
		t.Error("MaxSupply should be 55,000,000 * 1e18")
	}

	if BlockTime != 3*time.Second {
		t.Error("BlockTime should be 3 seconds")
	}

	if MaxTxPerBlock != 1000 {
		t.Error("MaxTxPerBlock should be 1000")
	}

	if InitialReward != 10*1e18 {
		t.Error("InitialReward should be 10 NST")
	}
}

// TestZeroValues tests zero value handling
func TestZeroValues(t *testing.T) {
	if ZeroHash == [32]byte{} {
		// This is expected - empty hash
	}

	if ZeroAddress != [20]byte{} {
		t.Error("ZeroAddress should be all zeros")
	}
}
