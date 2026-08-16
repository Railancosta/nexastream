// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  walletAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  isCreator: boolean;
  totalEarnings: number;
  subscriberCount: number;
  videoCount: number;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Channel Types
export interface Channel {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  banner?: string;
  category?: string;
  subscriberCount: number;
  totalViews: number;
  totalEarnings: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Video Types
export interface Video {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl: string;
  duration: number;
  category?: string;
  tags?: string[];
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  status: 'processing' | 'published' | 'private' | 'deleted';
  isLive: boolean;
  isShort: boolean;
  isBoosted: boolean;
  boostAmount?: number;
  earnings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoEngagement {
  videoId: string;
  userId: string;
  watchedDuration: number;
  completionRate: number;
  liked: boolean;
  shared: boolean;
  bookmarked: boolean;
}

// Wallet Types
export interface Wallet {
  id: string;
  userId: string;
  address: string;
  network: 'ethereum' | 'polygon' | 'bsc';
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'boost' | 'tip' | 'membership';
  amount: number;
  currency: 'USDC' | 'ETH' | 'NEXA';
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Analytics Types
export interface VideoAnalytics {
  videoId: string;
  views: number;
  uniqueViewers: number;
  averageWatchTime: number;
  watchTimeMinutes: number;
  likes: number;
  comments: number;
  shares: number;
  subscriberGained: number;
  subscriberLost: number;
  cpm: number;
  rpm: number;
  estimatedRevenue: number;
  clickThroughRate: number;
  impressions: number;
}

export interface ChannelAnalytics {
  channelId: string;
  totalViews: number;
  totalWatchTime: number;
  subscriberCount: number;
  totalVideos: number;
  averageViewsPerVideo: number;
  audienceRetention: number;
  topVideos: Video[];
  demographics: {
    country: Record<string, number>;
    age: Record<string, number>;
    gender: Record<string, number>;
    device: Record<string, number>;
  };
  trafficSources: Record<string, number>;
}

// Boost Types
export interface Boost {
  id: string;
  videoId: string;
  userId: string;
  amount: number;
  currency: 'USDC' | 'NEXA';
  duration: number;
  targetAudience?: {
    countries?: string[];
    ages?: string[];
    interests?: string[];
  };
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  impressions: number;
  clicks: number;
  startedAt: Date;
  endsAt: Date;
}

// Ad Types
export interface Ad {
  id: string;
  advertiserId: string;
  type: 'pre-roll' | 'mid-roll' | 'display' | 'overlay' | 'sponsored';
  targetUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  cpm: number;
  ctr: number;
  status: 'active' | 'paused' | 'completed' | 'rejected';
  createdAt: Date;
}

// Alert Types
export interface Alert {
  id: string;
  userId: string;
  type: 'payment' | 'earning' | 'milestone' | 'security' | 'content' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
