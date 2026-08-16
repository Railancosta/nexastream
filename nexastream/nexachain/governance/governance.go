package governance

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"sort"
	"sync"
	"time"
)

// ProposalType represents the type of governance proposal
type ProposalType string

const (
	ProposalTypeText      ProposalType = "text"       // Informational
	ProposalTypeUpgrade   ProposalType = "upgrade"   // Protocol upgrade
	ProposalTypeTreasury  ProposalType = "treasury"  // Treasury allocation
	ProposalTypeParameter ProposalType = "parameter"  // Parameter change
	ProposalTypeEmergency  ProposalType = "emergency" // Emergency action
)

// ProposalStatus represents the status of a proposal
type ProposalStatus string

const (
	ProposalStatusPending  ProposalStatus = "pending"
	ProposalStatusActive   ProposalStatus = "active"
	ProposalStatusPassed   ProposalStatus = "passed"
	ProposalStatusFailed   ProposalStatus = "failed"
	ProposalStatusQueued   ProposalStatus = "queued"
	ProposalStatusExecuted ProposalStatus = "executed"
	ProposalStatusCanceled ProposalStatus = "canceled"
)

// VoteOption represents voting options
type VoteOption uint8

const (
	VoteOptionAgainst VoteOption = 0
	VoteOptionFor    VoteOption = 1
	VoteOptionAbstain VoteOption = 2
)

// Proposal represents a governance proposal
type Proposal struct {
	ProposalID     string
	ProposalType   ProposalType
	Title          string
	Description    string
	Proposer       []byte
	Targets        [][]byte   // Target addresses
	Values         []uint64   // ETH values
	Signatures     []string   // Function signatures
	Calldatas      [][]byte   // Encoded calldata
	StartBlock     uint64     // Block when voting starts
	EndBlock       uint64     // Block when voting ends
	ExecutionBlock uint64     // Block when proposal can be executed
	QuorumVotes    uint64     // Minimum votes required
	Status         ProposalStatus
	ForVotes       uint64
	AgainstVotes   uint64
	AbstainVotes   uint64
	TotalVotes     uint64
	DiscussionURL  string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// Vote represents a vote on a proposal
type Vote struct {
	Voter       []byte
	ProposalID  string
	Option      VoteOption
	Weight      uint64 // Voting power
	Reason      string
	Timestamp   time.Time
}

// Delegation represents a voting power delegation
type Delegation struct {
	Delegator   []byte
	Delegatee  []byte
	Amount     uint64
	Block      uint64
	Timestamp  time.Time
}

// Guardian represents a security guardian
type Guardian struct {
	Address      []byte
	IsActive     bool
	AddedBy      []byte
	AddedAt      time.Time
	Votes        uint64
	EmergencyCount uint64
}

// TreasuryAction represents a treasury transaction
type TreasuryAction struct {
	ActionID    string
	Type        string // "transfer", "mint", "burn"
	Recipient   []byte
	Amount      uint64
	Currency    string
	ProposalID  string
	ExecutedBy  []byte
	ExecutedAt  time.Time
	Status      string
}

// GovernanceConfig holds governance parameters
type GovernanceConfig struct {
	VotingPeriod      uint64 // Blocks
	QuorumPercent     uint16 // Percentage
	ProposalThreshold uint64 // Minimum NST to create proposal
	ExecutionDelay    uint64 // Blocks before execution
	GuardianCount    uint8  // Number of guardians
	EmergencyQuorum   uint16 // Quorum for emergency proposals
	VoteLockPeriod   uint64 // Blocks after proposal ends
}

// DefaultGovernanceConfig returns default configuration
func DefaultGovernanceConfig() *GovernanceConfig {
	return &GovernanceConfig{
		VotingPeriod:      262980, // ~15 days (assuming 15s blocks)
		QuorumPercent:     400,   // 4%
		ProposalThreshold:  1000000000000000000000, // 1000 NST
		ExecutionDelay:     17280, // ~1 day
		GuardianCount:     5,
		EmergencyQuorum:   500, // 5%
		VoteLockPeriod:    262980, // ~15 days
	}
}

// DAO represents the governance DAO
type DAO struct {
	proposals    map[string]*Proposal
	votes        map[string][]*Vote     // proposalID -> votes
	delegations  map[string]*Delegation // delegator -> delegation
	guardians    map[string]*Guardian
	treasury     map[string]uint64     // currency -> balance
	config       *GovernanceConfig
	events       []GovernanceEvent
	mu           sync.RWMutex
}

// GovernanceEvent represents a governance event
type GovernanceEvent struct {
	Type      string
	Timestamp time.Time
	Data      map[string]interface{}
}

// NewDAO creates a new DAO instance
func NewDAO(cfg *GovernanceConfig) *DAO {
	if cfg == nil {
		cfg = DefaultGovernanceConfig()
	}
	return &DAO{
		proposals:   make(map[string]*Proposal),
		votes:       make(map[string][]*Vote),
		delegations: make(map[string]*Delegation),
		guardians:   make(map[string]*Guardian),
		treasury:    make(map[string]uint64),
		config:      cfg,
		events:      make([]GovernanceEvent, 0),
	}
}

// CreateProposal creates a new governance proposal
func (d *DAO) CreateProposal(ctx context.Context, proposer []byte, proposalType ProposalType, title, description string, targets [][]byte, values []uint64, signatures []string, calldatas [][]byte, votingPower uint64) (*Proposal, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Check proposal threshold
	if votingPower < d.config.ProposalThreshold {
		return nil, fmt.Errorf("voting power below threshold: %d < %d", votingPower, d.config.ProposalThreshold)
	}

	// Check if proposer has active proposal
	for _, p := range d.proposals {
		if bytesEqual(p.Proposer, proposer) && p.Status == ProposalStatusActive {
			return nil, fmt.Errorf("proposer already has an active proposal")
		}
	}

	proposalID := generateProposalID()

	// Set quorum based on proposal type
	quorumPercent := d.config.QuorumPercent
	if proposalType == ProposalTypeEmergency {
		quorumPercent = d.config.EmergencyQuorum
	}

	proposal := &Proposal{
		ProposalID:     proposalID,
		ProposalType:   proposalType,
		Title:          title,
		Description:    description,
		Proposer:       proposer,
		Targets:        targets,
		Values:         values,
		Signatures:     signatures,
		Calldatas:      calldatas,
		Status:         ProposalStatusPending,
		QuorumVotes:    uint64(quorumPercent) * votingPower / 10000,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	d.proposals[proposalID] = proposal
	d.votes[proposalID] = make([]*Vote, 0)

	d.recordEvent("ProposalCreated", map[string]interface{}{
		"proposal_id": proposalID,
		"proposer":    hex.EncodeToString(proposer),
		"type":        proposalType,
	})

	return proposal, nil
}

// ActivateProposal activates a proposal for voting
func (d *DAO) ActivateProposal(ctx context.Context, proposalID string, currentBlock uint64) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	proposal, ok := d.proposals[proposalID]
	if !ok {
		return fmt.Errorf("proposal not found")
	}

	if proposal.Status != ProposalStatusPending {
		return fmt.Errorf("proposal not pending")
	}

	proposal.Status = ProposalStatusActive
	proposal.StartBlock = currentBlock
	proposal.EndBlock = currentBlock + d.config.VotingPeriod
	proposal.ExecutionBlock = proposal.EndBlock + d.config.ExecutionDelay
	proposal.UpdatedAt = time.Now()

	d.recordEvent("ProposalActivated", map[string]interface{}{
		"proposal_id":  proposalID,
		"start_block":  proposal.StartBlock,
		"end_block":    proposal.EndBlock,
	})

	return nil
}

// CastVote casts a vote on a proposal
func (d *DAO) CastVote(ctx context.Context, proposalID string, voter []byte, option VoteOption, weight uint64, reason string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	proposal, ok := d.proposals[proposalID]
	if !ok {
		return fmt.Errorf("proposal not found")
	}

	if proposal.Status != ProposalStatusActive {
		return fmt.Errorf("proposal not active")
	}

	// Check if voter already voted
	for _, v := range d.votes[proposalID] {
		if bytesEqual(v.Voter, voter) {
			return fmt.Errorf("already voted")
		}
	}

	vote := &Vote{
		Voter:      voter,
		ProposalID: proposalID,
		Option:     option,
		Weight:     weight,
		Reason:     reason,
		Timestamp:  time.Now(),
	}

	d.votes[proposalID] = append(d.votes[proposalID], vote)

	switch option {
	case VoteOptionFor:
		proposal.ForVotes += weight
	case VoteOptionAgainst:
		proposal.AgainstVotes += weight
	case VoteOptionAbstain:
		proposal.AbstainVotes += weight
	}

	proposal.TotalVotes += weight
	proposal.UpdatedAt = time.Now()

	d.recordEvent("VoteCast", map[string]interface{}{
		"proposal_id": proposalID,
		"voter":       hex.EncodeToString(voter),
		"option":      option,
		"weight":      weight,
	})

	return nil
}

// QueueProposal queues a passed proposal for execution
func (d *DAO) QueueProposal(ctx context.Context, proposalID string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	proposal, ok := d.proposals[proposalID]
	if !ok {
		return fmt.Errorf("proposal not found")
	}

	if proposal.Status != ProposalStatusPassed {
		return fmt.Errorf("proposal not passed")
	}

	proposal.Status = ProposalStatusQueued
	proposal.UpdatedAt = time.Now()

	d.recordEvent("ProposalQueued", map[string]interface{}{
		"proposal_id": proposalID,
	})

	return nil
}

// ExecuteProposal executes a queued proposal
func (d *DAO) ExecuteProposal(ctx context.Context, proposalID string, executor []byte) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	proposal, ok := d.proposals[proposalID]
	if !ok {
		return fmt.Errorf("proposal not found")
	}

	if proposal.Status != ProposalStatusQueued {
		return fmt.Errorf("proposal not queued")
	}

	// In a real implementation, this would execute the proposal transactions
	proposal.Status = ProposalStatusExecuted
	proposal.UpdatedAt = time.Now()

	d.recordEvent("ProposalExecuted", map[string]interface{}{
		"proposal_id":  proposalID,
		"executed_by":  hex.EncodeToString(executor),
	})

	return nil
}

// CancelProposal cancels a proposal
func (d *DAO) CancelProposal(ctx context.Context, proposalID string, canceller []byte) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	proposal, ok := d.proposals[proposalID]
	if !ok {
		return fmt.Errorf("proposal not found")
	}

	if proposal.Status == ProposalStatusExecuted || proposal.Status == ProposalStatusCanceled {
		return fmt.Errorf("proposal already finalized")
	}

	proposal.Status = ProposalStatusCanceled
	proposal.UpdatedAt = time.Now()

	d.recordEvent("ProposalCanceled", map[string]interface{}{
		"proposal_id": proposalID,
		"canceled_by": hex.EncodeToString(canceller),
	})

	return nil
}

// TallyVotes tallies votes for a proposal
func (d *DAO) TallyVotes(ctx context.Context, proposalID string) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	proposal, ok := d.proposals[proposalID]
	if !ok {
		return "", fmt.Errorf("proposal not found")
	}

	if proposal.Status != ProposalStatusActive {
		return "", fmt.Errorf("proposal not active")
	}

	// Check if voting period has ended
	// (In real implementation, compare with current block)

	proposal.UpdatedAt = time.Now()

	// Determine outcome
	if proposal.ForVotes > proposal.AgainstVotes && proposal.TotalVotes >= proposal.QuorumVotes {
		proposal.Status = ProposalStatusPassed
		d.recordEvent("ProposalPassed", map[string]interface{}{
			"proposal_id":   proposalID,
			"for_votes":    proposal.ForVotes,
			"against_votes": proposal.AgainstVotes,
		})
		return "passed", nil
	}

	proposal.Status = ProposalStatusFailed
	d.recordEvent("ProposalFailed", map[string]interface{}{
		"proposal_id":   proposalID,
		"for_votes":    proposal.ForVotes,
		"against_votes": proposal.AgainstVotes,
		"quorum":        proposal.QuorumVotes,
	})

	return "failed", nil
}

// Delegate delegates voting power
func (d *DAO) Delegate(ctx context.Context, delegator, delegatee []byte, amount uint64) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	delegation := &Delegation{
		Delegator:  delegator,
		Delegatee: delegatee,
		Amount:     amount,
		Block:      0, // Would be current block
		Timestamp:  time.Now(),
	}

	delegatorKey := hex.EncodeToString(delegator)
	d.delegations[delegatorKey] = delegation

	d.recordEvent("DelegationChanged", map[string]interface{}{
		"delegator":  hex.EncodeToString(delegator),
		"delegatee": hex.EncodeToString(delegatee),
		"amount":     amount,
	})

	return nil
}

// GetVotes retrieves all votes for a proposal
func (d *DAO) GetVotes(proposalID string) []*Vote {
	d.mu.RLock()
	defer d.mu.RUnlock()

	return d.votes[proposalID]
}

// GetProposal retrieves a proposal by ID
func (d *DAO) GetProposal(proposalID string) (*Proposal, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	proposal, ok := d.proposals[proposalID]
	if !ok {
		return nil, fmt.Errorf("proposal not found")
	}

	return proposal, nil
}

// GetProposals retrieves proposals with filters
func (d *DAO) GetProposals(status ProposalStatus, proposalType ProposalType, limit, offset int) []*Proposal {
	d.mu.RLock()
	defer d.mu.RUnlock()

	proposals := make([]*Proposal, 0)
	for _, p := range d.proposals {
		if status != "" && p.Status != status {
			continue
		}
		if proposalType != "" && p.ProposalType != proposalType {
			continue
		}
		proposals = append(proposals, p)
	}

	// Sort by creation time descending
	sort.Slice(proposals, func(i, j int) bool {
		return proposals[i].CreatedAt.After(proposals[j].CreatedAt)
	})

	if offset > 0 && offset < len(proposals) {
		proposals = proposals[offset:]
	}

	if limit > 0 && limit < len(proposals) {
		proposals = proposals[:limit]
	}

	return proposals
}

// AddGuardian adds a guardian
func (d *DAO) AddGuardian(ctx context.Context, address, addedBy []byte) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(d.guardians) >= int(d.config.GuardianCount) {
		return fmt.Errorf("maximum guardians reached")
	}

	guardian := &Guardian{
		Address:    address,
		IsActive:   true,
		AddedBy:   addedBy,
		AddedAt:   time.Now(),
		Votes:      0,
	}

	key := hex.EncodeToString(address)
	d.guardians[key] = guardian

	d.recordEvent("GuardianAdded", map[string]interface{}{
		"guardian": hex.EncodeToString(address),
		"added_by": hex.EncodeToString(addedBy),
	})

	return nil
}

// TriggerEmergency triggers emergency action
func (d *DAO) TriggerEmergency(ctx context.Context, guardian []byte, action string, reason string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	key := hex.EncodeToString(guardian)
	guardianRecord, ok := d.guardians[key]
	if !ok || !guardianRecord.IsActive {
		return fmt.Errorf("not an active guardian")
	}

	guardianRecord.EmergencyCount++

	d.recordEvent("EmergencyTriggered", map[string]interface{}{
		"guardian": hex.EncodeToString(guardian),
		"action":  action,
		"reason":  reason,
	})

	return nil
}

// TreasuryTransfer transfers from treasury
func (d *DAO) TreasuryTransfer(ctx context.Context, recipient []byte, amount uint64, currency string, proposalID string, executedBy []byte) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	balance := d.treasury[currency]
	if balance < amount {
		return fmt.Errorf("insufficient treasury balance")
	}

	d.treasury[currency] -= amount

	action := &TreasuryAction{
		ActionID:   generateActionID(),
		Type:       "transfer",
		Recipient:  recipient,
		Amount:     amount,
		Currency:   currency,
		ProposalID: proposalID,
		ExecutedBy: executedBy,
		ExecutedAt: time.Now(),
		Status:     "completed",
	}

	d.recordEvent("TreasuryAction", map[string]interface{}{
		"action_id":  action.ActionID,
		"recipient":  hex.EncodeToString(recipient),
		"amount":     amount,
		"currency":   currency,
		"proposal":   proposalID,
	})

	return nil
}

// GetTreasuryBalance returns treasury balance
func (d *DAO) GetTreasuryBalance(currency string) uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()

	return d.treasury[currency]
}

// DepositTreasury deposits to treasury
func (d *DAO) DepositTreasury(ctx context.Context, from []byte, amount uint64, currency string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	d.treasury[currency] += amount

	d.recordEvent("TreasuryDeposit", map[string]interface{}{
		"from":     hex.EncodeToString(from),
		"amount":   amount,
		"currency": currency,
	})

	return nil
}

// GetGovernanceStats returns governance statistics
func (d *DAO) GetGovernanceStats() map[string]interface{} {
	d.mu.RLock()
	defer d.mu.RUnlock()

	activeProposals := 0
	passedProposals := 0
	for _, p := range d.proposals {
		if p.Status == ProposalStatusActive {
			activeProposals++
		} else if p.Status == ProposalStatusPassed || p.Status == ProposalStatusExecuted {
			passedProposals++
		}
	}

	totalVotes := 0
	for _, votes := range d.votes {
		totalVotes += len(votes)
	}

	return map[string]interface{}{
		"total_proposals":    len(d.proposals),
		"active_proposals":   activeProposals,
		"passed_proposals":   passedProposals,
		"total_votes":        totalVotes,
		"total_delegations":  len(d.delegations),
		"total_guardians":    len(d.guardians),
		"treasury_balances":  d.treasury,
	}
}

// GetVotingPower returns total voting power for an address
func (d *DAO) GetVotingPower(address []byte) uint64 {
	d.mu.RLock()
	defer d.mu.RUnlock()

	// Own voting power
	ownPower := uint64(1000000000000000000) // Simplified: 1 NST = 1 vote

	// Delegated voting power
	addressKey := hex.EncodeToString(address)
	if del, ok := d.delegations[addressKey]; ok {
		ownPower += del.Amount
	}

	// Delegated to this address
	for _, del := range d.delegations {
		if bytesEqual(del.Delegatee, address) {
			ownPower += del.Amount
		}
	}

	return ownPower
}

// Helper functions

func generateProposalID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("proposal-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func generateActionID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("action-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func bytesEqual(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func (d *DAO) recordEvent(eventType string, data map[string]interface{}) {
	event := GovernanceEvent{
		Type:      eventType,
		Timestamp: time.Now(),
		Data:      data,
	}
	d.events = append(d.events, event)
}

// GetEvents returns governance events
func (d *DAO) GetEvents(limit int) []GovernanceEvent {
	d.mu.RLock()
	defer d.mu.RUnlock()

	events := d.events
	if limit > 0 && len(events) > limit {
		events = events[len(events)-limit:]
	}
	return events
}

// VerifyProposal verifies a proposal meets requirements
func (d *DAO) VerifyProposal(proposalID string, currentBlock uint64) (bool, string) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	proposal, ok := d.proposals[proposalID]
	if !ok {
		return false, "proposal not found"
	}

	if proposal.Status != ProposalStatusActive {
		return false, "proposal not active"
	}

	if currentBlock < proposal.EndBlock {
		return false, "voting period not ended"
	}

	return true, ""
}

// JSON serialization helpers

func (p *Proposal) Serialize() ([]byte, error) {
	return json.Marshal(p)
}

func (v *Vote) Serialize() ([]byte, error) {
	return json.Marshal(v)
}

// GovernanceAPI represents the governance API
type GovernanceAPI struct {
	dao *DAO
}

// NewGovernanceAPI creates a new governance API
func NewGovernanceAPI(dao *DAO) *GovernanceAPI {
	return &GovernanceAPI{dao: dao}
}

// GetProposal returns proposal details
func (api *GovernanceAPI) GetProposal(proposalID string) (*Proposal, error) {
	return api.dao.GetProposal(proposalID)
}

// GetProposals returns filtered proposals
func (api *GovernanceAPI) GetProposals(status string, proposalType string, limit, offset int) []*Proposal {
	var statusEnum ProposalStatus
	if status != "" {
		statusEnum = ProposalStatus(status)
	}
	var typeEnum ProposalType
	if proposalType != "" {
		typeEnum = ProposalType(proposalType)
	}
	return api.dao.GetProposals(statusEnum, typeEnum, limit, offset)
}

// CastVote casts a vote
func (api *GovernanceAPI) CastVote(ctx context.Context, proposalID string, voter []byte, option VoteOption, weight uint64, reason string) error {
	return api.dao.CastVote(ctx, proposalID, voter, option, weight, reason)
}
