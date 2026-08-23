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
('v010', 'user_demo005', 'NexaStream: Como Funciona', 'Visão geral da plataforma descentralizada', 'tech', 240, 1, 8900, 1500, datetime('now')),
('v011', 'user_demo002', 'Melhores Games de 2026', 'Top 10 jogos imperdíveis do ano', 'gaming', 780, 0, 18400, 2900, datetime('now')),
('v012', 'user_demo003', 'Rust vs Go: Qual Escolher?', 'Comparativo definitivo de linguagens backend', 'code', 660, 0, 14700, 2100, datetime('now')),
('v013', 'user_demo001', 'NFTs em 2026: Vale a Pena?', 'Análise realista do mercado de NFTs', 'web3', 540, 0, 12600, 1700, datetime('now')),
('v014', 'user_demo004', 'Como Investir do Zero', 'Guia completo para iniciantes', 'finance', 900, 0, 23800, 3400, datetime('now')),
('v015', 'user_demo005', 'O Futuro da Internet', 'Web3, IPFS e protocolos descentralizados', 'web3', 840, 0, 11300, 1600, datetime('now')),
('v016', 'user_demo003', 'IA Generativa: Guia 2026', 'Ferramentas, modelos e casos de uso', 'tech', 1020, 0, 31500, 4800, datetime('now')),
('v017', 'user_demo002', 'Smartphones que Vão Bombar', 'Expectativas para o próximo ano', 'tech', 420, 0, 9800, 1200, datetime('now')),
('v018', 'user_demo001', 'Carteiras de Cripto: Segurança', 'Como proteger seus ativos digitais', 'crypto', 600, 0, 16900, 2500, datetime('now')),
('v019', 'user_demo004', 'Economia Criativa 2026', 'Como monetizar seu conteúdo', 'finance', 720, 0, 14100, 1900, datetime('now')),
('v020', 'user_demo005', 'Como Funciona a Blockchain', 'Explicação simples e visual', 'web3', 480, 1, 25600, 3900, datetime('now'));

-- Sample transactions (NST rewards)
INSERT OR IGNORE INTO transactions (id, user_id, type, amount, description, created_at) VALUES
('tx001', 'user_demo001', 'welcome_bonus', 1000, 'Bônus de boas-vindas NexaStream', datetime('now')),
('tx002', 'user_demo002', 'welcome_bonus', 1000, 'Bônus de boas-vindas NexaStream', datetime('now')),
('tx003', 'user_demo003', 'welcome_bonus', 1000, 'Bônus de boas-vindas NexaStream', datetime('now')),
('tx004', 'user_demo001', 'like_reward', 50, 'Recompensa por 10 likes recebidos', datetime('now')),
('tx005', 'user_demo003', 'comment_reward', 100, 'Recompensa por 10 comentários', datetime('now')),
('tx006', 'user_demo005', 'seeding_reward', 500, 'Seeding de 50GB por 500 horas', datetime('now')),
('tx007', 'user_demo001', 'watch_reward', 120, 'Watch time acumulado em 6 vídeos', datetime('now')),
('tx008', 'user_demo003', 'like_reward', 85, 'Likes recebidos em 4 vídeos', datetime('now'));
