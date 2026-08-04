const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/sequelize');

// User Model
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  email: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  password: { type: DataTypes.STRING(255), allowNull: false },
  displayName: { type: DataTypes.STRING(100) },
  avatar: { type: DataTypes.STRING(500) },
  banner: { type: DataTypes.STRING(500) },
  bio: { type: DataTypes.TEXT },
  walletAddress: { type: DataTypes.STRING(100) },
  walletPrivateKey: { type: DataTypes.STRING(255) },
  phone: { type: DataTypes.STRING(20) },
  isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  isPhoneVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  isKYCVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  kycLevel: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'suspended', 'banned'), defaultValue: 'active' },
  role: { type: DataTypes.ENUM('user', 'creator', 'admin', 'moderator'), defaultValue: 'user' },
  preferences: { type: DataTypes.JSONB, defaultValue: {} },
  language: { type: DataTypes.STRING(10), defaultValue: 'en' },
  timezone: { type: DataTypes.STRING(50), defaultValue: 'UTC' },
  lastLogin: { type: DataTypes.DATE },
  loginCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  twoFactorEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  twoFactorSecret: { type: DataTypes.STRING(255) },
  referrerId: { type: DataTypes.UUID },
  totalReferred: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { timestamps: true });

// Channel Model
const Channel = sequelize.define('Channel', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  displayName: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT },
  avatar: { type: DataTypes.STRING(500) },
  banner: { type: DataTypes.STRING(500) },
  category: { type: DataTypes.STRING(100) },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  subscriberCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalViews: { type: DataTypes.BIGINT, defaultValue: 0 },
  totalVideos: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalLivestreams: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalEarnings: { type: DataTypes.DECIMAL(20, 8), defaultValue: 0 },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  isPatreon: { type: DataTypes.BOOLEAN, defaultValue: false },
  patreonTier: { type: DataTypes.INTEGER, defaultValue: 0 },
  socialLinks: { type: DataTypes.JSONB, defaultValue: {} },
  customUrl: { type: DataTypes.STRING(100) },
  watermarkEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  watermarkPosition: { type: DataTypes.STRING(20), defaultValue: 'bottom-right' },
  autoPublish: { type: DataTypes.BOOLEAN, defaultValue: false },
  monetizationEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  liveChatEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  memberOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
  memberTier: { type: DataTypes.INTEGER, defaultValue: 1 }
}, { timestamps: true });

// Video Model
const Video = sequelize.define('Video', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  channelId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  thumbnail: { type: DataTypes.STRING(500) },
  thumbnailGif: { type: DataTypes.STRING(500) },
  videoUrl: { type: DataTypes.STRING(500) },
  hlsUrl: { type: DataTypes.STRING(500) },
  duration: { type: DataTypes.INTEGER }, // seconds
  category: { type: DataTypes.STRING(100) },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  views: { type: DataTypes.BIGINT, defaultValue: 0 },
  uniqueViews: { type: DataTypes.BIGINT, defaultValue: 0 },
  likes: { type: DataTypes.INTEGER, defaultValue: 0 },
  dislikes: { type: DataTypes.INTEGER, defaultValue: 0 },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  shares: { type: DataTypes.INTEGER, defaultValue: 0 },
  downloads: { type: DataTypes.INTEGER, defaultValue: 0 },
  saveCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  reportCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('uploading', 'processing', 'published', 'rejected', 'deleted'), defaultValue: 'uploading' },
  visibility: { type: DataTypes.ENUM('public', 'unlisted', 'private', 'scheduled'), defaultValue: 'public' },
  scheduledAt: { type: DataTypes.DATE },
  ageRestriction: { type: DataTypes.BOOLEAN, defaultValue: false },
  licensedContent: { type: DataTypes.BOOLEAN, defaultValue: false },
  location: { type: DataTypes.STRING(200) },
  language: { type: DataTypes.STRING(10), defaultValue: 'en' },
  caption: { type: DataTypes.JSONB, defaultValue: [] },
  chapters: { type: DataTypes.JSONB, defaultValue: [] },
  cards: { type: DataTypes.JSONB, defaultValue: [] },
  endScreen: { type: DataTypes.JSONB, defaultValue: [] },
  isShort: { type: DataTypes.BOOLEAN, defaultValue: false },
  isLive: { type: DataTypes.BOOLEAN, defaultValue: false },
  isPremium: { type: DataTypes.BOOLEAN, defaultValue: false },
  premiumPrice: { type: DataTypes.DECIMAL(10, 2) },
  rewardEarned: { type: DataTypes.DECIMAL(20, 8), defaultValue: 0 },
  cpm: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
  engagement: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  avgWatchTime: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  retentionRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 }
}, { timestamps: true });

// Livestream Model
const Livestream = sequelize.define('Livestream', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  videoId: { type: DataTypes.UUID },
  channelId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  thumbnail: { type: DataTypes.STRING(500) },
  streamKey: { type: DataTypes.STRING(100), allowNull: false },
  streamUrl: { type: DataTypes.STRING(500) },
  hlsUrl: { type: DataTypes.STRING(500) },
  viewers: { type: DataTypes.INTEGER, defaultValue: 0 },
  peakViewers: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalWatchTime: { type: DataTypes.BIGINT, defaultValue: 0 },
  likes: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('scheduled', 'live', 'ended'), defaultValue: 'scheduled' },
  startedAt: { type: DataTypes.DATE },
  endedAt: { type: DataTypes.DATE },
  scheduledAt: { type: DataTypes.DATE },
  category: { type: DataTypes.STRING(100) },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  monetizationEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  chatEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  slowMode: { type: DataTypes.BOOLEAN, defaultValue: false },
  followersOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
  membershipOnly: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

// Subscription Model
const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  channelId: { type: DataTypes.UUID, allowNull: false },
  tier: { type: DataTypes.INTEGER, defaultValue: 1 },
  status: { type: DataTypes.ENUM('active', 'paused', 'cancelled'), defaultValue: 'active' },
  price: { type: DataTypes.DECIMAL(10, 2) },
  billingCycle: { type: DataTypes.ENUM('monthly', 'yearly') },
  currentPeriodStart: { type: DataTypes.DATE },
  currentPeriodEnd: { type: DataTypes.DATE },
  cancelAtPeriodEnd: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

// Comment Model
const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  videoId: { type: DataTypes.UUID, allowNull: false },
  channelId: { type: DataTypes.UUID },
  userId: { type: DataTypes.UUID, allowNull: false },
  parentId: { type: DataTypes.UUID },
  content: { type: DataTypes.TEXT, allowNull: false },
  likes: { type: DataTypes.INTEGER, defaultValue: 0 },
  replies: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'hidden', 'deleted'), defaultValue: 'active' },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isHearted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

// WatchHistory Model
const WatchHistory = sequelize.define('WatchHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  videoId: { type: DataTypes.UUID, allowNull: false },
  channelId: { type: DataTypes.UUID },
  watchTime: { type: DataTypes.INTEGER, defaultValue: 0 },
  progress: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

// Playlist Model
const Playlist = sequelize.define('Playlist', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  thumbnail: { type: DataTypes.STRING(500) },
  visibility: { type: DataTypes.ENUM('public', 'private', 'unlisted'), defaultValue: 'private' },
  videoCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalDuration: { type: DataTypes.INTEGER, defaultValue: 0 },
  shareCount: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { timestamps: true });

// PlaylistVideo Model
const PlaylistVideo = sequelize.define('PlaylistVideo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  playlistId: { type: DataTypes.UUID, allowNull: false },
  videoId: { type: DataTypes.UUID, allowNull: false },
  position: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { timestamps: true });

// Notification Model
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(200) },
  message: { type: DataTypes.TEXT },
  data: { type: DataTypes.JSONB, defaultValue: {} },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE }
}, { timestamps: true });

// Transaction Model
const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('deposit', 'withdrawal', 'tip', 'reward', 'subscription', 'purchase', 'refund'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(20, 8), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'NEXA' },
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
  txHash: { type: DataTypes.STRING(100) },
  fromAddress: { type: DataTypes.STRING(100) },
  toAddress: { type: DataTypes.STRING(100) },
  metadata: { type: DataTypes.JSONB, defaultValue: {} }
}, { timestamps: true });

// Report Model
const Report = sequelize.define('Report', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reporterId: { type: DataTypes.UUID, allowNull: false },
  contentType: { type: DataTypes.ENUM('video', 'comment', 'channel', 'playlist', 'user'), allowNull: false },
  contentId: { type: DataTypes.UUID, allowNull: false },
  reason: { type: DataTypes.ENUM('spam', 'harassment', 'hate_speech', 'violence', 'copyright', 'misinformation', 'other'), allowNull: false },
  details: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('pending', 'reviewed', 'resolved', 'dismissed'), defaultValue: 'pending' },
  reviewedBy: { type: DataTypes.UUID },
  reviewedAt: { type: DataTypes.DATE },
  action: { type: DataTypes.STRING(100) }
}, { timestamps: true });

// NFT Model
const NFT = sequelize.define('NFT', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tokenId: { type: DataTypes.INTEGER },
  contractAddress: { type: DataTypes.STRING(100), allowNull: false },
  ownerId: { type: DataTypes.UUID, allowNull: false },
  creatorId: { type: DataTypes.UUID, allowNull: false },
  videoId: { type: DataTypes.UUID },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  image: { type: DataTypes.STRING(500) },
  animationUrl: { type: DataTypes.STRING(500) },
  externalUrl: { type: DataTypes.STRING(500) },
  price: { type: DataTypes.DECIMAL(20, 8) },
  currency: { type: DataTypes.STRING(20), defaultValue: 'NEXA' },
  royalties: { type: DataTypes.INTEGER, defaultValue: 10 },
  status: { type: DataTypes.ENUM('minting', 'listed', 'sold', 'auction'), defaultValue: 'minting' },
  txHash: { type: DataTypes.STRING(100) },
  likes: { type: DataTypes.INTEGER, defaultValue: 0 },
  views: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { timestamps: true });

// ChatMessage Model
const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  streamId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('message', 'gift', 'sub', 'mod', 'system'), defaultValue: 'message' },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

// Relationships
User.hasMany(Channel, { foreignKey: 'userId', as: 'channels' });
Channel.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Channel.hasMany(Subscription, { foreignKey: 'channelId', as: 'channelSubscriptions' });
Subscription.belongsTo(Channel, { foreignKey: 'channelId', as: 'channel' });

Channel.hasMany(Video, { foreignKey: 'channelId', as: 'videos' });
Video.belongsTo(Channel, { foreignKey: 'channelId', as: 'channel' });

Channel.hasMany(Livestream, { foreignKey: 'channelId', as: 'livestreams' });
Livestream.belongsTo(Channel, { foreignKey: 'channelId', as: 'channel' });

Video.hasMany(Comment, { foreignKey: 'videoId', as: 'videoComments' });
Comment.belongsTo(Video, { foreignKey: 'videoId', as: 'video' });

User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Playlist.belongsToMany(Video, { through: PlaylistVideo, as: 'videos' });
Video.belongsToMany(Playlist, { through: PlaylistVideo, as: 'playlists' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(NFT, { foreignKey: 'ownerId', as: 'ownedNFTs' });
NFT.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Livestream.hasMany(ChatMessage, { foreignKey: 'streamId', as: 'messages' });
ChatMessage.belongsTo(Livestream, { foreignKey: 'streamId', as: 'stream' });

module.exports = {
  User, Channel, Video, Livestream, Subscription, Comment,
  WatchHistory, Playlist, PlaylistVideo, Notification, Transaction,
  Report, NFT, ChatMessage
};
