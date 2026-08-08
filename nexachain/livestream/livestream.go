package livestream

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// StreamStatus represents the status of a live stream
type StreamStatus string

const (
	StreamStatusIdle    StreamStatus = "idle"
	StreamStatusLive    StreamStatus = "live"
	StreamStatusEnding  StreamStatus = "ending"
	StreamStatusEnded   StreamStatus = "ended"
	StreamStatusError  StreamStatus = "error"
)

// StreamQuality represents streaming quality levels
type StreamQuality string

const (
	QualityLow    StreamQuality = "720p"
	QualityMedium StreamQuality = "1080p"
	QualityHigh   StreamQuality = "1440p"
	QualityUltra  StreamQuality = "4k"
)

// LiveStream represents a live streaming session
type LiveStream struct {
	StreamID       string
	Title         string
	Description   string
	Broadcaster   []byte // Address
	Status        StreamStatus
	Key           string
	RTMPURL       string
	HLSURL        string
	ViewerCount   int
	PeakViewers   int
	StartedAt     time.Time
	EndedAt       time.Time
	Duration      time.Duration
	Quality       StreamQuality
	Categories    []string
	Tags          []string
	RecordingURL  string
	IsRecording   bool
	ChatEnabled   bool
	LatencyMode   string // "low", "reduced", "normal"
	Mu            sync.RWMutex
}

// ChatMessage represents a chat message
type ChatMessage struct {
	MessageID  string
	StreamID  string
	UserID    []byte
	Username  string
	Content   string
	Timestamp time.Time
	Type      string // "message", "gift", "superchat"
	Metadata  map[string]interface{}
}

// SuperChat represents a super chat donation
type SuperChat struct {
	ID        string
	StreamID  string
	From      []byte
	To        []byte // Broadcaster
	Amount    uint64
	Currency  string
	Message   string
	Color     string
	ExpiresAt time.Time
}

// Gift represents a gift sent during stream
type Gift struct {
	ID       string
	Name     string
	IconURL  string
	Price    uint64
	Animation string
}

// Viewer represents a viewer in the stream
type Viewer struct {
	UserID       []byte
	Username     string
	JoinedAt     time.Time
	WatchTime    time.Duration
	Donations    uint64
	ChatMessages int
	Quality      StreamQuality
}

// RTMPConfig holds RTMP server configuration
type RTMPConfig struct {
	ServerURL   string
	Application string
	StreamKey  string
	Port        int
}

// HLSConfig holds HLS configuration
type HLSConfig struct {
	SegmentDuration int
	PlaylistSize   int
	BufferSize     int
	Codec          string
}

// LiveStreamService manages live streaming
type LiveStreamService struct {
	streams    map[string]*LiveStream
	viewers    map[string]map[string]*Viewer // streamID -> userID -> Viewer
	chat      map[string][]*ChatMessage     // streamID -> messages
	superChats map[string][]*SuperChat      // streamID -> super chats
	config    *Config
	mu        sync.RWMutex
}

// Config holds live streaming configuration
type Config struct {
	RTMPEnabled    bool
	HLSEnabled     bool
	WebRTCEnabled  bool
	MaxViewers     int
	MaxStreams     int
	RecordingEnabled bool
	ChatEnabled    bool
	ChatRetention  time.Duration
	SuperChatEnabled bool
}

// DefaultConfig returns default configuration
func DefaultConfig() *Config {
	return &Config{
		RTMPEnabled:      true,
		HLSEnabled:       true,
		WebRTCEnabled:    true,
		MaxViewers:       100000,
		MaxStreams:       10000,
		RecordingEnabled: true,
		ChatEnabled:      true,
		ChatRetention:    7 * 24 * time.Hour,
		SuperChatEnabled: true,
	}
}

// NewLiveStreamService creates a new live stream service
func NewLiveStreamService(cfg *Config) *LiveStreamService {
	if cfg == nil {
		cfg = DefaultConfig()
	}
	return &LiveStreamService{
		streams:     make(map[string]*LiveStream),
		viewers:     make(map[string]map[string]*Viewer),
		chat:        make(map[string][]*ChatMessage),
		superChats:  make(map[string][]*SuperChat),
		config:      cfg,
	}
}

// CreateStream creates a new live stream
func (s *LiveStreamService) CreateStream(ctx context.Context, broadcaster []byte, title, description string) (*LiveStream, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.streams) >= s.config.MaxStreams {
		return nil, fmt.Errorf("maximum streams limit reached")
	}

	streamID := generateStreamID(broadcaster)
	key := generateStreamKey()

	stream := &LiveStream{
		StreamID:     streamID,
		Title:        title,
		Description:   description,
		Broadcaster:  broadcaster,
		Status:       StreamStatusIdle,
		Key:          key,
		RTMPURL:      fmt.Sprintf("rtmp://live.nexastream.org/app/%s", key),
		HLSURL:       fmt.Sprintf("https://cdn.nexastream.org/streams/%s/playlist.m3u8", streamID),
		ViewerCount:  0,
		PeakViewers:  0,
		ChatEnabled:  s.config.ChatEnabled,
		LatencyMode:  "reduced",
	}

	s.streams[streamID] = stream
	s.viewers[streamID] = make(map[string]*Viewer)
	s.chat[streamID] = make([]*ChatMessage, 0)
	s.superChats[streamID] = make([]*SuperChat, 0)

	return stream, nil
}

// StartStream starts a live stream
func (s *LiveStreamService) StartStream(ctx context.Context, streamID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return fmt.Errorf("stream not found")
	}

	stream.Status = StreamStatusLive
	stream.StartedAt = time.Now()

	return nil
}

// EndStream ends a live stream
func (s *LiveStreamService) EndStream(ctx context.Context, streamID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return fmt.Errorf("stream not found")
	}

	stream.Status = StreamStatusEnding
	
	// Calculate duration
	stream.Duration = time.Since(stream.StartedAt)
	stream.EndedAt = time.Now()
	stream.Status = StreamStatusEnded

	return nil
}

// GetStream retrieves a stream by ID
func (s *LiveStreamService) GetStream(streamID string) (*LiveStream, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return nil, fmt.Errorf("stream not found")
	}

	return stream, nil
}

// GetLiveStreams returns all live streams
func (s *LiveStreamService) GetLiveStreams(category string, limit int) []*LiveStream {
	s.mu.RLock()
	defer s.mu.RUnlock()

	streams := make([]*LiveStream, 0)
	for _, stream := range s.streams {
		if stream.Status == StreamStatusLive {
			if category == "" || containsCategory(stream.Categories, category) {
				streams = append(streams, stream)
			}
		}
	}

	// Sort by viewer count
	sortByViewers(streams)

	if limit > 0 && len(streams) > limit {
		streams = streams[:limit]
	}

	return streams
}

// JoinStream allows a viewer to join a stream
func (s *LiveStreamService) JoinStream(ctx context.Context, streamID string, viewer *Viewer) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return fmt.Errorf("stream not found")
	}

	if stream.Status != StreamStatusLive {
		return fmt.Errorf("stream is not live")
	}

	viewerID := hex.EncodeToString(viewer.UserID)
	s.viewers[streamID][viewerID] = viewer
	viewer.JoinedAt = time.Now()

	stream.ViewerCount++
	if stream.ViewerCount > stream.PeakViewers {
		stream.PeakViewers = stream.ViewerCount
	}

	return nil
}

// LeaveStream allows a viewer to leave a stream
func (s *LiveStreamService) LeaveStream(ctx context.Context, streamID string, userID []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return fmt.Errorf("stream not found")
	}

	viewerID := hex.EncodeToString(userID)
	if _, ok := s.viewers[streamID][viewerID]; ok {
		delete(s.viewers[streamID], viewerID)
		stream.ViewerCount--
	}

	return nil
}

// SendChatMessage sends a chat message to a stream
func (s *LiveStreamService) SendChatMessage(ctx context.Context, streamID string, userID []byte, username, content string) (*ChatMessage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return nil, fmt.Errorf("stream not found")
	}

	if !stream.ChatEnabled {
		return nil, fmt.Errorf("chat is disabled")
	}

	viewerID := hex.EncodeToString(userID)
	if viewer, ok := s.viewers[streamID][viewerID]; ok {
		viewer.ChatMessages++
	}

	msg := &ChatMessage{
		MessageID:  generateMessageID(),
		StreamID:  streamID,
		UserID:    userID,
		Username:  username,
		Content:   content,
		Timestamp: time.Now(),
		Type:      "message",
	}

	s.chat[streamID] = append(s.chat[streamID], msg)

	// Trim old messages if needed
	maxMessages := 1000
	if len(s.chat[streamID]) > maxMessages {
		s.chat[streamID] = s.chat[streamID][len(s.chat[streamID])-maxMessages:]
	}

	return msg, nil
}

// GetChatMessages retrieves chat messages for a stream
func (s *LiveStreamService) GetChatMessages(streamID string, since time.Time, limit int) []*ChatMessage {
	s.mu.RLock()
	defer s.mu.RUnlock()

	messages := make([]*ChatMessage, 0)
	for _, msg := range s.chat[streamID] {
		if msg.Timestamp.After(since) {
			messages = append(messages, msg)
		}
	}

	// Return most recent messages
	if limit > 0 && len(messages) > limit {
		messages = messages[len(messages)-limit:]
	}

	return messages
}

// SendSuperChat sends a super chat donation
func (s *LiveStreamService) SendSuperChat(ctx context.Context, streamID string, from, to []byte, amount uint64, currency, message, color string) (*SuperChat, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return nil, fmt.Errorf("stream not found")
	}

	if !s.config.SuperChatEnabled {
		return nil, fmt.Errorf("super chat is disabled")
	}

	sc := &SuperChat{
		ID:        generateSuperChatID(),
		StreamID:  streamID,
		From:      from,
		To:        to,
		Amount:    amount,
		Currency:  currency,
		Message:   message,
		Color:     color,
		ExpiresAt: time.Now().Add(4 * time.Hour),
	}

	s.superChats[streamID] = append(s.superChats[streamID], sc)

	// Send chat message for super chat
	msg := &ChatMessage{
		MessageID: generateMessageID(),
		StreamID:  streamID,
		UserID:    from,
		Content:   fmt.Sprintf("💰 Sent %s %d %s: %s", color, amount, currency, message),
		Timestamp: time.Now(),
		Type:      "superchat",
	}
	s.chat[streamID] = append(s.chat[streamID], msg)

	return sc, nil
}

// GetSuperChats retrieves active super chats for a stream
func (s *LiveStreamService) GetSuperChats(streamID string) []*SuperChat {
	s.mu.RLock()
	defer s.mu.RUnlock()

	active := make([]*SuperChat, 0)
	now := time.Now()

	for _, sc := range s.superChats[streamID] {
		if sc.ExpiresAt.After(now) {
			active = append(active, sc)
		}
	}

	return active
}

// GetViewerCount returns the current viewer count
func (s *LiveStreamService) GetViewerCount(streamID string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if stream, ok := s.streams[streamID]; ok {
		return stream.ViewerCount
	}
	return 0
}

// UpdateStreamQuality updates the stream quality settings
func (s *LiveStreamService) UpdateStreamQuality(streamID string, quality StreamQuality) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return fmt.Errorf("stream not found")
	}

	stream.Quality = quality
	return nil
}

// SetRecording enables or disables recording
func (s *LiveStreamService) SetRecording(streamID string, enabled bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return fmt.Errorf("stream not found")
	}

	stream.IsRecording = enabled
	return nil
}

// GetTrendingStreams returns trending live streams
func (s *LiveStreamService) GetTrendingStreams(limit int) []*LiveStream {
	s.mu.RLock()
	defer s.mu.RUnlock()

	streams := make([]*LiveStream, 0)
	for _, stream := range s.streams {
		if stream.Status == StreamStatusLive {
			streams = append(streams, stream)
		}
	}

	// Score = viewers + (peak_viewers * 0.5) + (hours_live * 10)
	now := time.Now()
	for _, stream := range streams {
		hoursLive := now.Sub(stream.StartedAt).Hours()
		stream.ViewerCount = int(float64(stream.ViewerCount) + stream.PeakViewers*0.5 + hoursLive*10)
	}

	sortByViewers(streams)

	if limit > 0 && len(streams) > limit {
		streams = streams[:limit]
	}

	return streams
}

// GetStreamStats returns statistics for a stream
func (s *LiveStreamService) GetStreamStats(streamID string) map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return nil
	}

	totalChat := 0
	totalSuperChat := uint64(0)
	for _, v := range s.viewers[streamID] {
		totalChat += v.ChatMessages
		totalSuperChat += v.Donations
	}

	return map[string]interface{}{
		"stream_id":        streamID,
		"title":            stream.Title,
		"broadcaster":      hex.EncodeToString(stream.Broadcaster),
		"status":           stream.Status,
		"viewer_count":     stream.ViewerCount,
		"peak_viewers":     stream.PeakViewers,
		"duration":         stream.Duration.Seconds(),
		"started_at":       stream.StartedAt,
		"quality":          stream.Quality,
		"chat_enabled":     stream.ChatEnabled,
		"total_chat":       totalChat,
		"total_superchat":  totalSuperChat,
		"is_recording":     stream.IsRecording,
	}
}

// Helper functions

func generateStreamID(broadcaster []byte) string {
	data := fmt.Sprintf("%s-%d", hex.EncodeToString(broadcaster), time.Now().UnixNano())
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:16])
}

func generateStreamKey() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("key-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:24])
}

func generateMessageID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("msg-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func generateSuperChatID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("sc-%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:16])
}

func containsCategory(categories []string, category string) bool {
	for _, c := range categories {
		if c == category {
			return true
		}
	}
	return false
}

func sortByViewers(streams []*LiveStream) {
	for i := 0; i < len(streams)-1; i++ {
		for j := i + 1; j < len(streams); j++ {
			if streams[i].ViewerCount < streams[j].ViewerCount {
				streams[i], streams[j] = streams[j], streams[i]
			}
		}
	}
}

// StreamManager manages all live stream services
type StreamManager struct {
	services map[uint64]*LiveStreamService // networkID -> service
	mu       sync.RWMutex
}

// NewStreamManager creates a new stream manager
func NewStreamManager() *StreamManager {
	return &StreamManager{
		services: make(map[uint64]*LiveStreamService),
	}
}

// GetService returns the live stream service for a network
func (sm *StreamManager) GetService(networkID uint64, cfg *Config) *LiveStreamService {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if service, ok := sm.services[networkID]; ok {
		return service
	}

	service := NewLiveStreamService(cfg)
	sm.services[networkID] = service
	return service
}

// AvailableGifts returns available gifts for super chats
func (s *LiveStreamService) AvailableGifts() []*Gift {
	return []*Gift{
		{ID: "heart", Name: "Heart", IconURL: "https://cdn.nexastream.org/gifts/heart.png", Price: 1, Animation: "floating"},
		{ID: "star", Name: "Star", IconURL: "https://cdn.nexastream.org/gifts/star.png", Price: 5, Animation: "explosion"},
		{ID: "rocket", Name: "Rocket", IconURL: "https://cdn.nexastream.org/gifts/rocket.png", Price: 50, Animation: "launch"},
		{ID: "diamond", Name: "Diamond", IconURL: "https://cdn.nexastream.org/gifts/diamond.png", Price: 100, Animation: "shimmer"},
		{ID: "crown", Name: "Crown", IconURL: "https://cdn.nexastream.org/gifts/crown.png", Price: 500, Animation: "royal"},
		{ID: "mega", Name: "Mega Gift", IconURL: "https://cdn.nexastream.org/gifts/mega.png", Price: 1000, Animation: "megaton"},
	}
}

// SendGift sends a gift to the broadcaster
func (s *LiveStreamService) SendGift(ctx context.Context, streamID string, from []byte, giftID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	stream, ok := s.streams[streamID]
	if !ok {
		return fmt.Errorf("stream not found")
	}

	viewerID := hex.EncodeToString(from)
	viewer, ok := s.viewers[streamID][viewerID]
	if !ok {
		return fmt.Errorf("viewer not in stream")
	}

	// Find gift
	var gift *Gift
	for _, g := range s.AvailableGifts() {
		if g.ID == giftID {
			gift = g
			break
		}
	}

	if gift == nil {
		return fmt.Errorf("gift not found")
	}

	viewer.Donations += gift.Price

	// Send chat message for gift
	msg := &ChatMessage{
		MessageID:  generateMessageID(),
		StreamID:  streamID,
		UserID:    from,
		Content:   fmt.Sprintf("🎁 Sent %s!", gift.Name),
		Timestamp: time.Now(),
		Type:      "gift",
		Metadata: map[string]interface{}{
			"gift_id":  gift.ID,
			"gift_name": gift.Name,
		},
	}
	s.chat[streamID] = append(s.chat[streamID], msg)

	return nil
}

// GetStreamHistory returns stream history for a broadcaster
func (s *LiveStreamService) GetStreamHistory(broadcaster []byte, limit int) []*LiveStream {
	s.mu.RLock()
	defer s.mu.RUnlock()

	streams := make([]*LiveStream, 0)
	for _, stream := range s.streams {
		if bytesEqual(stream.Broadcaster, broadcaster) {
			streams = append(streams, stream)
		}
	}

	// Sort by start time descending
	for i := 0; i < len(streams)-1; i++ {
		for j := i + 1; j < len(streams); j++ {
			if streams[i].StartedAt.Before(streams[j].StartedAt) {
				streams[i], streams[j] = streams[j], streams[i]
			}
		}
	}

	if limit > 0 && len(streams) > limit {
		streams = streams[:limit]
	}

	return streams
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

// StreamEvent represents a stream event
type StreamEvent struct {
	Type      string
	StreamID  string
	Timestamp time.Time
	Data      map[string]interface{}
}

// EventHandler handles stream events
type EventHandler func(event *StreamEvent)

// Subscribe subscribes to stream events
func (s *LiveStreamService) Subscribe(handler EventHandler) {
	// In production, this would use pub/sub
	go func() {
		for {
			time.Sleep(time.Second)
			// Check for events and call handler
		}
	}()
}

// SerializeStream serializes a stream to JSON
func (s *LiveStreamService) SerializeStream(stream *LiveStream) ([]byte, error) {
	return json.Marshal(stream)
}

// DeserializeStream deserializes a stream from JSON
func (s *LiveStreamService) DeserializeStream(data []byte) (*LiveStream, error) {
	var stream LiveStream
	err := json.Unmarshal(data, &stream)
	return &stream, err
}
