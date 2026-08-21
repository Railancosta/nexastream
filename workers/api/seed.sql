-- Seed data for NexaStream
-- Note: passwords are hashed with PBKDF2-SHA256, 100k iterations
-- Default password for test users: "password123"

-- Test users (password hashes will be regenerated on first real register)
INSERT OR IGNORE INTO users (id, username, email, password_hash, password_salt, nst_balance, is_creator, bio, created_at) VALUES
('user_demo001', 'CryptoCreator', 'demo@nexastream.org', 'placeholder', 'placeholder', 15000.0, 1, 'Criador de conteúdo crypto e Web3 na NexaStream', datetime('now')),
('user_demo002', 'TechReviewer', 'tech@nexastream.org', 'placeholder', 'placeholder', 8500.0, 1, 'Reviews de tecnologia e gadgets', datetime('now')),
('user_demo003', 'CodeMaster', 'code@nexastream.org', 'placeholder', 'placeholder', 22000.0, 1, 'Tutoriais de programação e arquitetura de software', datetime('now')),
('user_demo004', 'DeFiEducator', 'defi@nexastream.org', 'placeholder', 'placeholder', 12000.0, 1, 'Educação financeira descentralizada', datetime('now')),
('user_demo005', 'P2PBuilder', 'p2p@nexastream.org', 'placeholder', 'placeholder', 9800.0, 1, 'Construindo a internet descentralizada', datetime('now'));

-- Sample videos
INSERT OR IGNORE INTO videos (id, user_id, title, description, category, duration, is_short, views, likes, created_at) VALUES
('v001', 'user_demo001', 'Bitcoin ETF: O que muda em 2026', 'Análise completa do impacto dos ETFs de Bitcoin no mercado', 'crypto', 720, 0, 45230, 3200, datetime('now')),
('v002', 'user_demo002', 'iPhone 18 Pro Review', 'Review completo do novo iPhone com chip M5', 'tech', 540, 0, 32100, 2100, datetime('now')),
('v003', 'user_demo003', 'Next.js 16 + Cloudflare Workers', 'Tutorial completo de deploy fullstack', 'code', 1200, 0, 28500, 4500, datetime('now')),
('v004', 'user_demo004', 'Earn 20% APY com DeFi', 'Estratégias seguras de yield farming em 2026', 'finance', 480, 0, 19800, 1800, datetime('now')),
('v005', 'user_demo005', 'WebTorrent P2P para Iniciantes', 'Como funciona a rede descentralizada de vídeos', 'tech', 360, 0, 15600, 2400, datetime('now')),
('v006', 'user_demo001', 'Solana vs Ethereum 2026', 'Comparativo atualizado das duas maiores L1s', 'crypto', 600, 0, 52000, 4100, datetime('now')),
('v007', 'user_demo003', 'Rust para Backend: Guia Definitivo', 'Por que Rust é o futuro dos sistemas distribuídos', 'code', 900, 0, 21000, 3600, datetime('now')),
('v008', 'user_demo002', 'MacBook Pro M5 Unboxing', 'Primeiras impressões do novo MacBook', 'tech', 300, 1, 67000, 5200, datetime('now')),
('v009', 'user_demo004', 'Tokenização de Ativos Reais', 'Como RWAs estão transformando finanças', 'finance', 420, 0, 13400, 1100, datetime('now')),
('v010', 'user_demo005', 'NexaStream: Como Funciona', 'Visão geral da plataforma descentralizada', 'tech', 240, 1, 8900, 1500, datetime('now'));

-- Sample transactions (NST rewards)
INSERT OR IGNORE INTO transactions (id, user_id, type, amount, description, created_at) VALUES
('tx001', 'user_demo001', 'welcome_bonus', 1000, 'Bônus de boas-vindas NexaStream', datetime('now')),
('tx002', 'user_demo002', 'welcome_bonus', 1000, 'Bônus de boas-vindas NexaStream', datetime('now')),
('tx003', 'user_demo003', 'welcome_bonus', 1000, 'Bônus de boas-vindas NexaStream', datetime('now')),
('tx004', 'user_demo001', 'like_reward', 50, 'Recompensa por 10 likes recebidos', datetime('now')),
('tx005', 'user_demo003', 'comment_reward', 100, 'Recompensa por 10 comentários', datetime('now')),
('tx006', 'user_demo005', 'seeding_reward', 500, 'Seeding de 50GB por 500 horas', datetime('now'));
