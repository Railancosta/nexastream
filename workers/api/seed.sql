-- NexaStream Seed Data
-- Sample videos and users for testing

-- Sample users (passwords are hashed versions of 'password123')
INSERT INTO users (id, username, email, password_hash, channel_name, nst_balance, created_at) VALUES
('user-001', 'nexastream', 'admin@nexastream.org', 'salt.hashedpassword', 'NexaStream Official', 1000000, '2024-01-01T00:00:00Z'),
('user-002', 'creator1', 'creator1@example.com', 'salt.hashedpassword', 'Creator One', 50000, '2024-01-15T00:00:00Z'),
('user-003', 'creator2', 'creator2@example.com', 'salt.hashedpassword', 'Creator Two', 30000, '2024-02-01T00:00:00Z');

-- Sample videos
INSERT INTO videos (id, title, description, channel_name, user_id, video_path, thumbnail_path, magnet_uri, info_hash, duration, size, is_short, views, likes, status, created_at) VALUES
('v-001', 'Welcome to NexaStream', 'The future of decentralized video streaming', 'NexaStream Official', 'user-001', '/storage/videos/v-001.mp4', '/storage/thumbs/v-001.jpg', 'magnet:?xt=urn:btih:abc123&dn=Welcome+to+NexaStream', 'abc123def456', 180, 52428800, 0, 1500, 250, 'ready', '2024-01-01T12:00:00Z'),
('v-002', 'How WebTorrent Works', 'Understanding P2P video distribution', 'Creator One', 'user-002', '/storage/videos/v-002.mp4', '/storage/thumbs/v-002.jpg', 'magnet:?xt=urn:btih:def456&dn=How+WebTorrent+Works', 'def456ghi789', 300, 104857600, 0, 800, 120, 'ready', '2024-01-15T12:00:00Z'),
('v-003', 'NST Token Explained', 'Learn about the NexaStream Token economy', 'Creator Two', 'user-003', '/storage/videos/v-003.mp4', '/storage/thumbs/v-003.jpg', 'magnet:?xt=urn:btih:ghi789&dn=NST+Token+Explained', 'ghi789jkl012', 240, 78643200, 0, 600, 90, 'ready', '2024-02-01T12:00:00Z'),
('v-004', 'Quick Tip #1', 'Short-form content on NexaStream', 'Creator One', 'user-002', '/storage/videos/v-004.mp4', '/storage/thumbs/v-004.jpg', 'magnet:?xt=urn:btih:jkl012&dn=Quick+Tip', 'jkl012mno345', 45, 10485760, 1, 2000, 300, 'ready', '2024-02-15T12:00:00Z'),
('v-005', 'DAO Governance Deep Dive', 'How decentralized governance works', 'NexaStream Official', 'user-001', '/storage/videos/v-005.mp4', '/storage/thumbs/v-005.jpg', 'magnet:?xt=urn:btih:mno345&dn=DAO+Governance', 'mno345pqr678', 600, 209715200, 0, 400, 60, 'ready', '2024-03-01T12:00:00Z');

-- Sample comments
INSERT INTO comments (id, video_id, user_id, content, created_at) VALUES
('c-001', 'v-001', 'user-002', 'Amazing platform! Love the decentralized approach.', '2024-01-02T12:00:00Z'),
('c-002', 'v-001', 'user-003', 'Finally a video platform that respects creators.', '2024-01-03T12:00:00Z'),
('c-003', 'v-002', 'user-001', 'Great explanation of WebTorrent!', '2024-01-16T12:00:00Z');

-- Sample subscriptions
INSERT INTO subscriptions (subscriber_id, channel_id, created_at) VALUES
('user-002', 'user-001', '2024-01-02T00:00:00Z'),
('user-003', 'user-001', '2024-01-03T00:00:00Z'),
('user-001', 'user-002', '2024-01-15T00:00:00Z');

-- Sample likes
INSERT INTO likes (user_id, video_id, created_at) VALUES
('user-002', 'v-001', '2024-01-02T12:00:00Z'),
('user-003', 'v-001', '2024-01-03T12:00:00Z'),
('user-001', 'v-002', '2024-01-16T12:00:00Z');
