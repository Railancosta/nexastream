// In-memory database store for NexaStream API
// Lazy-loaded: only initializes on first request, not during build

export interface User { id: string; username: string; email: string; password_hash: string; nst_balance: number; reputation: number; is_creator: number; bio: string; created_at: string; }
export interface Video { id: string; user_id: string; title: string; description: string; category: string; duration: number; is_short: number; video_url: string; thumbnail_url: string; torrent_hash: string; views: number; likes: number; comments_count: number; status: string; created_at: string; creator_name?: string; }
export interface Transaction { id: string; user_id: string; type: string; amount: number; description: string; status: string; created_at: string; }
export interface Wallet { id: number; user_id: string; address: string; chain: string; wallet_type: string; connected_at: string; }
export interface Comment { id: string; video_id: string; user_id: string; text: string; created_at: string; username?: string; }
export interface Like { video_id: string; user_id: string; }
export interface Peer { user_id: string; video_id: string; bytes_uploaded: number; last_seen: string; }
export interface WatchRecord { video_id: string; user_id: string; seconds_watched: number; completed: number; created_at: string; }

class Store {
  users: Map<string, User> = new Map();
  videos: Map<string, Video> = new Map();
  transactions: Map<string, Transaction> = new Map();
  wallets: Map<string, Wallet> = new Map();
  comments: Map<string, Comment> = new Map();
  likes: Map<string, Like> = new Map();
  peers: Map<string, Peer> = new Map();
  watchHistory: WatchRecord[] = [];
  private seeded = false;

  seed() {
    if (this.seeded) return;
    this.seeded = true;
    const u: User[] = [
      { id: 'u1', username: 'CryptoCreator', email: 'demo@nexastream.org', password_hash: '', nst_balance: 15000, reputation: 1, is_creator: 1, bio: 'Criador crypto e Web3', created_at: '2026-01-15' },
      { id: 'u2', username: 'TechReviewer', email: 'tech@nexastream.org', password_hash: '', nst_balance: 8500, reputation: 1, is_creator: 1, bio: 'Reviews de tecnologia', created_at: '2026-02-01' },
      { id: 'u3', username: 'CodeMaster', email: 'code@nexastream.org', password_hash: '', nst_balance: 22000, reputation: 1, is_creator: 1, bio: 'Tutoriais de programação', created_at: '2026-01-20' },
      { id: 'u4', username: 'DeFiEducator', email: 'defi@nexastream.org', password_hash: '', nst_balance: 12000, reputation: 1, is_creator: 1, bio: 'Educação financeira', created_at: '2026-03-01' },
      { id: 'u5', username: 'P2PBuilder', email: 'p2p@nexastream.org', password_hash: '', nst_balance: 9800, reputation: 1, is_creator: 1, bio: 'Internet descentralizada', created_at: '2026-02-15' },
    ];
    u.forEach(x => this.users.set(x.id, x));
    const v: Video[] = [
      { id: 'v1', user_id: 'u1', title: 'Bitcoin ETF: O que muda em 2026', description: 'Análise completa dos ETFs', category: 'crypto', duration: 720, is_short: 0, video_url: '', thumbnail_url: '', torrent_hash: '', views: 45230, likes: 3200, comments_count: 120, status: 'ready', created_at: '2026-08-20', creator_name: 'CryptoCreator' },
      { id: 'v2', user_id: 'u2', title: 'iPhone 18 Pro Review', description: 'Review completo', category: 'tech', duration: 540, is_short: 0, video_url: '', thumbnail_url: '', torrent_hash: '', views: 32100, likes: 2100, comments_count: 85, status: 'ready', created_at: '2026-08-19', creator_name: 'TechReviewer' },
      { id: 'v3', user_id: 'u3', title: 'Next.js 16 + Cloudflare Workers', description: 'Deploy fullstack', category: 'code', duration: 1200, is_short: 0, video_url: '', thumbnail_url: '', torrent_hash: '', views: 28500, likes: 4500, comments_count: 210, status: 'ready', created_at: '2026-08-18', creator_name: 'CodeMaster' },
      { id: 'v4', user_id: 'u4', title: 'Earn 20% APY com DeFi', description: 'Yield farming seguro', category: 'finance', duration: 480, is_short: 0, video_url: '', thumbnail_url: '', torrent_hash: '', views: 19800, likes: 1800, comments_count: 65, status: 'ready', created_at: '2026-08-17', creator_name: 'DeFiEducator' },
      { id: 'v5', user_id: 'u5', title: 'WebTorrent P2P para Iniciantes', description: 'Rede descentralizada', category: 'tech', duration: 360, is_short: 0, video_url: '', thumbnail_url: '', torrent_hash: '', views: 15600, likes: 2400, comments_count: 90, status: 'ready', created_at: '2026-08-16', creator_name: 'P2PBuilder' },
      { id: 'v6', user_id: 'u1', title: 'Solana vs Ethereum 2026', description: 'Comparativo L1s', category: 'crypto', duration: 600, is_short: 0, video_url: '', thumbnail_url: '', torrent_hash: '', views: 52000, likes: 4100, comments_count: 180, status: 'ready', created_at: '2026-08-15', creator_name: 'CryptoCreator' },
      { id: 'v7', user_id: 'u3', title: 'Rust para Backend', description: 'Guia definitivo', category: 'code', duration: 900, is_short: 0, video_url: '', thumbnail_url: '', torrent_hash: '', views: 21000, likes: 3600, comments_count: 145, status: 'ready', created_at: '2026-08-14', creator_name: 'CodeMaster' },
      { id: 'v8', user_id: 'u2', title: 'MacBook Pro M5 Unboxing', description: 'Primeiras impressões', category: 'tech', duration: 300, is_short: 1, video_url: '', thumbnail_url: '', torrent_hash: '', views: 67000, likes: 5200, comments_count: 320, status: 'ready', created_at: '2026-08-13', creator_name: 'TechReviewer' },
      { id: 'v9', user_id: 'u4', title: 'Tokenização de Ativos Reais', description: 'RWAs em finanças', category: 'finance', duration: 420, is_short: 0, video_url: '', thumbnail_url: '', torrent_hash: '', views: 13400, likes: 1100, comments_count: 45, status: 'ready', created_at: '2026-08-12', creator_name: 'DeFiEducator' },
      { id: 'v10', user_id: 'u5', title: 'NexaStream: Como Funciona', description: 'Visão geral', category: 'tech', duration: 240, is_short: 1, video_url: '', thumbnail_url: '', torrent_hash: '', views: 8900, likes: 1500, comments_count: 55, status: 'ready', created_at: '2026-08-11', creator_name: 'P2PBuilder' },
    ];
    v.forEach(x => this.videos.set(x.id, x));
    const tx: Transaction[] = [
      { id: 'tx1', user_id: 'u1', type: 'welcome_bonus', amount: 1000, description: 'Boas-vindas', status: 'completed', created_at: '2026-01-15' },
      { id: 'tx2', user_id: 'u2', type: 'welcome_bonus', amount: 1000, description: 'Boas-vindas', status: 'completed', created_at: '2026-02-01' },
      { id: 'tx3', user_id: 'u3', type: 'welcome_bonus', amount: 1000, description: 'Boas-vindas', status: 'completed', created_at: '2026-01-20' },
      { id: 'tx4', user_id: 'u1', type: 'like_reward', amount: 50, description: 'Likes recebidos', status: 'completed', created_at: '2026-08-20' },
      { id: 'tx5', user_id: 'u3', type: 'seeding_reward', amount: 500, description: 'Seeding 50GB', status: 'completed', created_at: '2026-08-18' },
    ];
    tx.forEach(x => this.transactions.set(x.id, x));
  }
}

declare global { var __ns_store: Store | undefined; }
function getStore(): Store {
  if (!globalThis.__ns_store) globalThis.__ns_store = new Store();
  globalThis.__ns_store.seed();
  return globalThis.__ns_store;
}
export default getStore;
