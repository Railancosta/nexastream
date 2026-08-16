package nft

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"sync"
	"time"
)

// NFTStandard represents the NFT standard type
type NFTStandard string

const (
	NFTStandard721  NFTStandard = "ERC721"  // Single token
	NFTStandard1155 NFTStandard = "ERC1155" // Multi-token
)

// NFTRarity represents token rarity
type NFTRarity string

const (
	RarityCommon    NFTRarity = "common"
	RarityUncommon  NFTRarity = "uncommon"
	RarityRare      NFTRarity = "rare"
	RarityEpic      NFTRarity = "epic"
	RarityLegendary NFTRarity = "legendary"
)

// NFT represents a non-fungible token
type NFT struct {
	TokenID       string
	ContractAddress []byte
	Owner         []byte
	Creator       []byte
	Mintee        []byte
	Name          string
	Description   string
	ImageURL      string
	AnimationURL  string
	ExternalURL   string
	Standard      NFTStandard
	Rarity        NFTRarity
	VideoID       string // Associated video if applicable
	Edition       uint64 // Edition number for multi-token
	TotalEditions uint64 // Total editions available
	Attributes    []Attribute
	RoyaltyBPS    uint16 // Basis points (e.g., 1000 = 10%)
	LockedContent string // Content only accessible to holder
	IsSoulbound   bool   // Cannot be transferred
	MintedAt      time.Time
	UpdatedAt     time.Time
}

// Attribute represents an NFT attribute/trait
type Attribute struct {
	TraitType string      `json:"trait_type"`
	Value     interface{} `json:"value"`
	DisplayType string   `json:"display_type,omitempty"`
}

// NFTContract represents an NFT contract
type NFTContract struct {
	ContractAddress  []byte
	Name            string
	Symbol          string
	Standard        NFTStandard
	TotalSupply     uint64
	Owner           []byte
	BaseURI         string
	IsPaused        bool
	MintEnabled     bool
	MaxPerWallet    uint64
	Creator         []byte
	CreatedAt       time.Time
}

// NFTListing represents a marketplace listing
type NFTListing struct {
	ListingID    string
	NFTAddress   []byte
	TokenID      string
	Seller       []byte
	Price        uint64
	Currency     string // "NST" or other
	PaymentToken []byte // Token address for payment
	StartTime    time.Time
	EndTime      time.Time
	IsActive     bool
	HighestBid   uint64
	HighestBidder []byte
}

// NFTOffer represents an offer on an NFT
type NFTOffer struct {
	OfferID     string
	NFTAddress  []byte
	TokenID     string
	Offerer     []byte
	Price       uint64
	Currency    string
	ExpiresAt   time.Time
	IsAccepted  bool
	IsCancelled bool
}

// NFTBid represents a bid in auction
type NFTBid struct {
	BidID      string
	NFTAddress []byte
	TokenID    string
	Bidder     []byte
	Price      uint64
	Currency   string
	Timestamp  time.Time
	IsWinning  bool
}

// NFTTransfer represents a token transfer
type NFTTransfer struct {
	TransferID    string
	NFTAddress    []byte
	TokenID      string
	From         []byte
	To           []byte
	Price        uint64
	Currency     string
	TransactionHash []byte
	Timestamp    time.Time
}

// NFTMint represents a minting event
type NFTMint struct {
	MintID      string
	NFTAddress  []byte
	TokenID     string
	To          []byte
	Creator     []byte
	RoyaltyBPS  uint16
	TransactionHash []byte
	Timestamp   time.Time
}

// MarketplaceFee represents marketplace fees
type MarketplaceFee struct {
	FeeType      string // "listing", "sale", "royalty"
	Recipient    []byte // Address receiving fee
	FeeBPS       uint16 // Basis points
	FlatFee      uint64 // Flat fee in wei
}

// Collection represents an NFT collection
type Collection struct {
	CollectionID   string
	Name           string
	Symbol         string
	Description    string
	ImageURL      string
	BannerURL     string
	Creator       []byte
	ContractAddress []byte
	Category       string
	Tags          []string
	TotalItems    uint64
	TotalVolume   uint64
	FloorPrice    uint64
	Verified      bool
	IsPublic      bool
	CreatedAt     time.Time
}

// NFTService manages NFT operations
type NFTService struct {
	nfts         map[string]*NFT           // tokenKey -> NFT
	contracts    map[string]*NFTContract  // contractAddress -> Contract
	listings     map[string]*NFTListing  // listingID -> Listing
	offers       map[string]*NFTOffer    // offerID -> Offer
	collections  map[string]*Collection  // collectionID -> Collection
	transfers    []*NFTTransfer
	mints        []*NFTMint
	config       *NFTConfig
	mu           sync.RWMutex
}

// NFTConfig holds NFT configuration
type NFTConfig struct {
	MaxRoyaltyBPS      uint16
	MinListingPrice    uint64
	MarketplaceFeeBPS  uint16
	CreatorRoyaltyBPS  uint16
	MaxAttributes      int
	MaxCollectionItems uint64
	EnableSoulbound   bool
}

// DefaultNFTConfig returns default configuration
func DefaultNFTConfig() *NFTConfig {
	return &NFTConfig{
		MaxRoyaltyBPS:      1000, // 10%
		MinListingPrice:    100,  // 100 wei
		MarketplaceFeeBPS: 250,  // 2.5%
		CreatorRoyaltyBPS: 750,  // 7.5%
		MaxAttributes:      20,
		MaxCollectionItems: 10000,
		EnableSoulbound:   true,
	}
}

// NewNFTService creates a new NFT service
func NewNFTService(cfg *NFTConfig) *NFTService {
	if cfg == nil {
		cfg = DefaultNFTConfig()
	}
	return &NFTService{
		nfts:        make(map[string]*NFT),
		contracts:   make(map[string]*NFTContract),
		listings:    make(map[string]*NFTListing),
		offers:      make(map[string]*NFTOffer),
		collections: make(map[string]*Collection),
		transfers:   make([]*NFTTransfer, 0),
		mints:       make([]*NFTMint, 0),
		config:      cfg,
	}
}

// CreateContract creates a new NFT contract
func (s *NFTService) CreateContract(ctx context.Context, name, symbol string, standard NFTStandard, creator []byte) (*NFTContract, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	contract := &NFTContract{
		ContractAddress: generateAddress(),
		Name:           name,
		Symbol:         symbol,
		Standard:       standard,
		TotalSupply:    0,
		Owner:          creator,
		Creator:        creator,
		BaseURI:        fmt.Sprintf("https://api.nexastream.org/nft/%s/", hex.EncodeToString(generateAddress())[:16]),
		MintEnabled:    true,
		CreatedAt:      time.Now(),
	}

	contractKey := hex.EncodeToString(contract.ContractAddress)
	s.contracts[contractKey] = contract

	return contract, nil
}

// MintNFT mints a new NFT
func (s *NFTService) MintNFT(ctx context.Context, contractAddr, name, description string, creator, mintee []byte, royaltyBPS uint16, attrs []Attribute) (*NFT, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if royaltyBPS > s.config.MaxRoyaltyBPS {
		return nil, fmt.Errorf("royalty exceeds maximum: %d > %d", royaltyBPS, s.config.MaxRoyaltyBPS)
	}

	contractKey := hex.EncodeToString(contractAddr)
	contract, ok := s.contracts[contractKey]
	if !ok {
		return nil, fmt.Errorf("contract not found")
	}

	if !contract.MintEnabled {
		return nil, fmt.Errorf("minting is disabled")
	}

	if len(attrs) > s.config.MaxAttributes {
		return nil, fmt.Errorf("too many attributes: %d > %d", len(attrs), s.config.MaxAttributes)
	}

	tokenID := generateTokenID(contractAddr, contract.TotalSupply)

	nft := &NFT{
		TokenID:        tokenID,
		ContractAddress: contractAddr,
		Owner:          mintee,
		Creator:        creator,
		Mintee:         mintee,
		Name:           name,
		Description:    description,
		Standard:       contract.Standard,
		Rarity:        calculateRarity(attrs),
		RoyaltyBPS:     royaltyBPS,
		Attributes:     attrs,
		MintedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	nftKey := s.makeNFTKey(contractAddr, tokenID)
	s.nfts[nftKey] = nft

	contract.TotalSupply++
	contract.MintEnabled = true

	mint := &NFTMint{
		MintID:      generateMintID(),
		NFTAddress:  contractAddr,
		TokenID:     tokenID,
		To:          mintee,
		Creator:     creator,
		RoyaltyBPS:  royaltyBPS,
		Timestamp:   time.Now(),
	}
	s.mints = append(s.mints, mint)

	return nft, nil
}

// TransferNFT transfers an NFT
func (s *NFTService) TransferNFT(ctx context.Context, contractAddr []byte, tokenID string, from, to []byte, price uint64, currency string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	nftKey := s.makeNFTKey(contractAddr, tokenID)
	nft, ok := s.nfts[nftKey]
	if !ok {
		return fmt.Errorf("NFT not found")
	}

	if !bytesEqual(nft.Owner, from) {
		return fmt.Errorf("not the owner")
	}

	if nft.IsSoulbound {
		return fmt.Errorf("NFT is soulbound and cannot be transferred")
	}

	// Update owner
	nft.Owner = to
	nft.UpdatedAt = time.Now()

	// Record transfer
	transfer := &NFTTransfer{
		TransferID: generateTransferID(),
		NFTAddress: contractAddr,
		TokenID:    tokenID,
		From:       from,
		To:         to,
		Price:      price,
		Currency:   currency,
		Timestamp:  time.Now(),
	}
	s.transfers = append(s.transfers, transfer)

	return nil
}

// CreateListing creates a marketplace listing
func (s *NFTService) CreateListing(ctx context.Context, contractAddr []byte, tokenID string, seller []byte, price uint64, currency string, duration time.Duration) (*NFTListing, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if price < s.config.MinListingPrice {
		return nil, fmt.Errorf("price below minimum: %d", s.config.MinListingPrice)
	}

	// Verify ownership
	nftKey := s.makeNFTKey(contractAddr, tokenID)
	nft, ok := s.nfts[nftKey]
	if !ok {
		return nil, fmt.Errorf("NFT not found")
	}

	if !bytesEqual(nft.Owner, seller) {
		return nil, fmt.Errorf("not the owner")
	}

	listing := &NFTListing{
		ListingID:  generateListingID(),
		NFTAddress: contractAddr,
		TokenID:    tokenID,
		Seller:     seller,
		Price:      price,
		Currency:   currency,
		StartTime:  time.Now(),
		EndTime:    time.Now().Add(duration),
		IsActive:   true,
	}

	s.listings[listing.ListingID] = listing
	return listing, nil
}

// BuyNFT purchases an NFT from listing
func (s *NFTService) BuyNFT(ctx context.Context, listingID string, buyer []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	listing, ok := s.listings[listingID]
	if !ok {
		return fmt.Errorf("listing not found")
	}

	if !listing.IsActive {
		return fmt.Errorf("listing not active")
	}

	if time.Now().After(listing.EndTime) {
		return fmt.Errorf("listing expired")
	}

	// Calculate fees
	marketplaceFee := uint64(listing.Price) * uint64(s.config.MarketplaceFeeBPS) / 10000

	// Transfer NFT
	nftKey := s.makeNFTKey(listing.NFTAddress, listing.TokenID)
	nft, ok := s.nfts[nftKey]
	if !ok {
		return fmt.Errorf("NFT not found")
	}

	nft.Owner = buyer
	nft.UpdatedAt = time.Now()

	// Deactivate listing
	listing.IsActive = false

	return nil
}

// CreateOffer creates an offer on an NFT
func (s *NFTService) CreateOffer(ctx context.Context, contractAddr []byte, tokenID string, offerer []byte, price uint64, currency string, expiresAt time.Time) (*NFTOffer, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	offer := &NFTOffer{
		OfferID:    generateOfferID(),
		NFTAddress: contractAddr,
		TokenID:    tokenID,
		Offerer:    offerer,
		Price:      price,
		Currency:   currency,
		ExpiresAt:  expiresAt,
	}

	s.offers[offer.OfferID] = offer
	return offer, nil
}

// AcceptOffer accepts an NFT offer
func (s *NFTService) AcceptOffer(ctx context.Context, offerID string, seller []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	offer, ok := s.offers[offerID]
	if !ok {
		return fmt.Errorf("offer not found")
	}

	if offer.IsAccepted || offer.IsCancelled {
		return fmt.Errorf("offer already processed")
	}

	if time.Now().After(offer.ExpiresAt) {
		return fmt.Errorf("offer expired")
	}

	// Transfer NFT
	nftKey := s.makeNFTKey(offer.NFTAddress, offer.TokenID)
	nft, ok := s.nfts[nftKey]
	if !ok {
		return fmt.Errorf("NFT not found")
	}

	if !bytesEqual(nft.Owner, seller) {
		return fmt.Errorf("not the owner")
	}

	nft.Owner = offer.Offerer
	nft.UpdatedAt = time.Now()
	offer.IsAccepted = true

	return nil
}

// CreateCollection creates a new NFT collection
func (s *NFTService) CreateCollection(ctx context.Context, name, symbol, description string, creator []byte) (*Collection, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	collection := &Collection{
		CollectionID:   generateCollectionID(),
		Name:            name,
		Symbol:          symbol,
		Description:     description,
		Creator:         creator,
		ContractAddress: generateAddress(),
		TotalItems:     0,
		Verified:        false,
		IsPublic:        true,
		CreatedAt:       time.Now(),
	}

	s.collections[collection.CollectionID] = collection
	return collection, nil
}

// GetNFT retrieves an NFT
func (s *NFTService) GetNFT(contractAddr []byte, tokenID string) (*NFT, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nftKey := s.makeNFTKey(contractAddr, tokenID)
	nft, ok := s.nfts[nftKey]
	if !ok {
		return nil, fmt.Errorf("NFT not found")
	}

	return nft, nil
}

// GetNFTsByOwner retrieves all NFTs owned by an address
func (s *NFTService) GetNFTsByOwner(owner []byte) []*NFT {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nfts := make([]*NFT, 0)
	for _, nft := range s.nfts {
		if bytesEqual(nft.Owner, owner) {
			nfts = append(nfts, nft)
		}
	}
	return nfts
}

// GetNFTsByCreator retrieves all NFTs created by an address
func (s *NFTService) GetNFTsByCreator(creator []byte) []*NFT {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nfts := make([]*NFT, 0)
	for _, nft := range s.nfts {
		if bytesEqual(nft.Creator, creator) {
			nfts = append(nfts, nfts)
		}
	}
	return nfts
}

// GetActiveListings returns all active listings
func (s *NFTService) GetActiveListings(collection string, limit int) []*NFTListing {
	s.mu.RLock()
	defer s.mu.RUnlock()

	listings := make([]*NFTListing, 0)
	now := time.Now()

	for _, listing := range s.listings {
		if listing.IsActive && now.Before(listing.EndTime) {
			listings = append(listings, listing)
		}
	}

	if limit > 0 && len(listings) > limit {
		listings = listings[:limit]
	}

	return listings
}

// GetTrendingCollections returns trending collections
func (s *NFTService) GetTrendingCollections(limit int) []*Collection {
	s.mu.RLock()
	defer s.mu.RUnlock()

	collections := make([]*Collection, 0)
	for _, c := range s.collections {
		collections = append(collections, c)
	}

	// Sort by volume
	for i := 0; i < len(collections)-1; i++ {
		for j := i + 1; j < len(collections); j++ {
			if collections[i].TotalVolume < collections[j].TotalVolume {
				collections[i], collections[j] = collections[j], collections[i]
			}
		}
	}

	if limit > 0 && len(collections) > limit {
		collections = collections[:limit]
	}

	return collections
}

// SetSoulbound marks an NFT as soulbound
func (s *NFTService) SetSoulbound(contractAddr []byte, tokenID string, soulbound bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.config.EnableSoulbound {
		return fmt.Errorf("soulbound not enabled")
	}

	nftKey := s.makeNFTKey(contractAddr, tokenID)
	nft, ok := s.nfts[nftKey]
	if !ok {
		return fmt.Errorf("NFT not found")
	}

	nft.IsSoulbound = soulbound
	nft.UpdatedAt = time.Now()

	return nil
}

// GetMarketplaceStats returns marketplace statistics
func (s *NFTService) GetMarketplaceStats() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	totalSales := uint64(0)
	for _, t := range s.transfers {
		if t.Price > 0 {
			totalSales += t.Price
		}
	}

	return map[string]interface{}{
		"total_nfts":        len(s.nfts),
		"total_contracts":   len(s.contracts),
		"total_listings":    len(s.listings),
		"total_offers":      len(s.offers),
		"total_collections": len(s.collections),
		"total_transfers":   len(s.transfers),
		"total_mints":       len(s.mints),
		"total_sales_volume": totalSales,
	}
}

// Helper functions

func (s *NFTService) makeNFTKey(contractAddr []byte, tokenID string) string {
	return fmt.Sprintf("%s:%s", hex.EncodeToString(contractAddr), tokenID)
}

func generateAddress() []byte {
	hash := sha256.Sum256([]byte(fmt.Sprintf("addr-%d", time.Now().UnixNano())))
	return hash[:20]
}

func generateTokenID(contractAddr []byte, supply uint64) string {
	data := fmt.Sprintf("%s:%d:%d", hex.EncodeToString(contractAddr), supply, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:16])
}

func generateListingID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("listing-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func generateOfferID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("offer-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func generateCollectionID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("collection-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func generateTransferID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("transfer-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func generateMintID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("mint-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func calculateRarity(attrs []Attribute) NFTRarity {
	// Simplified rarity calculation
	if len(attrs) >= 8 {
		return RarityLegendary
	} else if len(attrs) >= 6 {
		return RarityEpic
	} else if len(attrs) >= 4 {
		return RarityRare
	} else if len(attrs) >= 2 {
		return RarityUncommon
	}
	return RarityCommon
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

// CalculateRoyalty calculates royalty for a sale
func (s *NFTService) CalculateRoyalty(price uint64, royaltyBPS uint16) uint64 {
	return uint64(price) * uint64(royaltyBPS) / 10000
}

// VideoNFT represents video content as NFT
type VideoNFT struct {
	NFT
	VideoID       string
	VideoCID      string // IPFS CID
	ThumbnailCID  string
	Duration      uint64 // seconds
	ChapterCount  int
	IsFullVideo   bool   // true = full video, false = clip
	License       string
	UsageRights   string
}

// MintVideoNFT mints an NFT for video content
func (s *NFTService) MintVideoNFT(ctx context.Context, contractAddr []byte, videoNFT *VideoNFT, creator []byte, royaltyBPS uint16) (*VideoNFT, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	attrs := append(videoNFT.Attributes, Attribute{
		TraitType:   "Duration",
		Value:       videoNFT.Duration,
		DisplayType: "number",
	})
	attrs = append(attrs, Attribute{
		TraitType: "Is Full Video",
		Value:     videoNFT.IsFullVideo,
	})
	attrs = append(attrs, Attribute{
		TraitType: "License",
		Value:     videoNFT.License,
	})

	nft, err := s.MintNFT(ctx, contractAddr, videoNFT.Name, videoNFT.Description, creator, creator, royaltyBPS, attrs)
	if err != nil {
		return nil, err
	}

	videoNFT.TokenID = nft.TokenID
	videoNFT.ContractAddress = nft.ContractAddress
	videoNFT.Owner = nft.Owner
	videoNFT.Creator = nft.Creator
	videoNFT.MintedAt = nft.MintedAt

	nft.VideoID = videoNFT.VideoID

	return videoNFT, nil
}

// SerializeNFT serializes an NFT to JSON
func (s *NFTService) SerializeNFT(nft *NFT) ([]byte, error) {
	return json.Marshal(nft)
}

// DeserializeNFT deserializes an NFT from JSON
func (s *NFTService) DeserializeNFT(data []byte) (*NFT, error) {
	var nft NFT
	err := json.Unmarshal(data, &nft)
	return &nft, err
}
