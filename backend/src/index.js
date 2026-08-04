/**
 * NexaStream Backend API v2.0
 * Complete backend with 200+ features
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const config = require('./config');

// Import routes
const apiRoutes = require('./routes');

// Import middleware
const { rateLimiter, errorHandler } = require('./middleware');

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload config
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Mount API routes
app.use('/api', apiRoutes);

// Legacy routes compatibility (redirect to new routes)
app.use('/api/auth', require('./routes/api/users'));
app.use('/api/videos', require('./routes/api/videos'));
app.use('/api/channels', require('./routes/api/channels'));
app.use('/api/wallet', require('./routes/api/payments'));
app.use('/api/rewards', require('./routes/api/payments'));
app.use('/api/blockchain', apiRoutes);
app.use('/api/stats', apiRoutes);

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
        success: true,
        file: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: `/uploads/${req.file.filename}`
        }
    });
});

// Health check
            creatorAddress: channel?.walletAddress,
            rewardPerView,
            totalEarned: Math.floor(v.views * rewardPerView),
            uploadedAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
            isLive: v.duration === 'LIVE',
            liveViewers: v.isLive ? Math.floor(Math.random() * 5000) : 0
        });
    });
}

initializeDemoData();

// Auth middleware
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Optional auth
function optionalAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (e) {}
    }
    next();
}

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        if (db.users.has(email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const wallet = new Wallet();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = {
            id: uuidv4(),
            username,
            email,
            password: hashedPassword,
            walletAddress: wallet.address,
            privateKey: wallet.privateKey,
            createdAt: Date.now()
        };
        
        db.users.set(email, user);
        db.wallets.set(wallet.address, { balance: 0, pendingRewards: 0 });
        
        const token = jwt.sign({ userId: user.id, email, walletAddress: wallet.address }, JWT_SECRET);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress
            },
            wallet: wallet.getInfo()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.users.get(email);
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ userId: user.id, email, walletAddress: user.walletAddress }, JWT_SECRET);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ VIDEO ROUTES ============
app.get('/api/videos', optionalAuth, (req, res) => {
    const { category, sort = 'trending', page = 1, limit = 20 } = req.query;
    
    let videos = Array.from(db.videos.values());
    
    if (category) {
        videos = videos.filter(v => v.category === category);
    }
    
    // Sort
    switch (sort) {
        case 'trending':
            videos.sort((a, b) => b.views - a.views);
            break;
        case 'recent':
            videos.sort((a, b) => b.uploadedAt - a.uploadedAt);
            break;
        case 'live':
            videos = videos.filter(v => v.isLive).sort((a, b) => b.liveViewers - a.liveViewers);
            break;
    }
    
    const start = (page - 1) * limit;
    const paginatedVideos = videos.slice(start, start + parseInt(limit));
    
    res.json({
        videos: paginatedVideos,
        total: videos.length,
        page: parseInt(page),
        totalPages: Math.ceil(videos.length / limit)
    });
});

app.get('/api/videos/:id', optionalAuth, (req, res) => {
    const video = db.videos.get(req.params.id);
    
    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }
    
    // Increment views if user is watching
    if (req.user) {
        video.views++;
        const reward = video.rewardPerView;
        video.totalEarned += reward;
        
        // Record reward transaction
        const tx = rewardsWallet.createTransaction(video.creatorAddress, reward, {
            type: 'VIDEO_REWARD',
            videoId: video.id,
            viewer: req.user.walletAddress
        });
        nexachain.addTransaction(tx);
    }
    
    res.json(video);
});

app.post('/api/videos', authMiddleware, upload.single('video'), (req, res) => {
    try {
        const { title, description, category, thumbnail } = req.body;
        const user = db.users.get(req.user.email);
        const channel = Array.from(db.channels.values()).find(c => c.walletAddress === user.walletAddress);
        
        if (!channel) {
            return res.status(400).json({ error: 'Create a channel first' });
        }
        
        const videoId = `video_${uuidv4()}`;
        const video = {
            id: videoId,
            title,
            description,
            category,
            thumbnail: thumbnail || `https://picsum.photos/seed/${videoId}/640/360`,
            views: 0,
            likes: 0,
            duration: '00:00',
            channelId: channel.id,
            channelName: channel.displayName,
            creatorAddress: user.walletAddress,
            rewardPerView: 0.01,
            totalEarned: 0,
            uploadedAt: Date.now(),
            isLive: false,
            videoUrl: req.file ? `/uploads/${req.file.filename}` : null
        };
        
        db.videos.set(videoId, video);
        
        res.json({ success: true, video });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ CHANNEL ROUTES ============
app.get('/api/channels', (req, res) => {
    const channels = Array.from(db.channels.values()).map(c => ({
        ...c,
        walletBalance: nexachain.getBalance(c.walletAddress)
    }));
    
    res.json({ channels });
});

app.get('/api/channels/:id', (req, res) => {
    const channel = db.channels.get(req.params.id);
    
    if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
    }
    
    const videos = Array.from(db.videos.values()).filter(v => v.channelId === req.params.id);
    
    res.json({
        ...channel,
        walletBalance: nexachain.getBalance(channel.walletAddress),
        videos
    });
});

app.post('/api/channels', authMiddleware, (req, res) => {
    try {
        const { username, displayName, description } = req.body;
        const user = db.users.get(req.user.email);
        
        const channel = {
            id: uuidv4(),
            username,
            displayName,
            description,
            walletAddress: user.walletAddress,
            subscribers: 0,
            totalViews: 0,
            totalVideos: 0,
            totalEarnings: 0,
            createdAt: Date.now()
        };
        
        db.channels.set(channel.id, channel);
        
        res.json({ success: true, channel });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ WALLET ROUTES ============
app.get('/api/wallet/balance', authMiddleware, (req, res) => {
    const user = db.users.get(req.user.email);
    const balance = nexachain.getBalance(user.walletAddress);
    
    res.json({
        address: user.walletAddress,
        balance,
        pendingRewards: db.wallets.get(user.walletAddress)?.pendingRewards || 0
    });
});

app.get('/api/wallet/transactions', authMiddleware, (req, res) => {
    const user = db.users.get(req.user.email);
    const transactions = nexachain.getTransactions(user.walletAddress);
    
    res.json({ transactions });
});

app.post('/api/wallet/send', authMiddleware, (req, res) => {
    try {
        const { to, amount } = req.body;
        const user = db.users.get(req.user.email);
        
        const tx = user.wallet.createTransaction
            ? new Wallet({ privateKey: user.privateKey, publicKey: '' }).createTransaction(to, amount)
            : new Transaction(user.walletAddress, to, amount);
        
        nexachain.addTransaction(tx);
        
        res.json({ success: true, transaction: tx.toJSON() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============ REWARDS ROUTES ============
app.get('/api/rewards/stats', (req, res) => {
    const totalRewards = Array.from(db.videos.values()).reduce((sum, v) => sum + v.totalEarned, 0);
    const totalViews = Array.from(db.videos.values()).reduce((sum, v) => sum + v.views, 0);
    
    res.json({
        totalRewardsDistributed: totalRewards,
        totalViews,
        rewardPerView: 0.01,
        creatorShare: 50,
        platformShare: 50,
        rewardsPoolBalance: nexachain.getBalance(rewardsWallet.address)
    });
});

app.get('/api/rewards/leaderboard', (req, res) => {
    const creators = Array.from(db.channels.values())
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 10)
        .map((c, i) => ({
            rank: i + 1,
            name: c.displayName,
            earnings: c.totalEarnings,
            totalViews: c.totalViews,
            subscribers: c.subscribers
        }));
    
    res.json({ leaderboard: creators });
});

// ============ BLOCKCHAIN ROUTES ============
app.get('/api/blockchain/stats', (req, res) => {
    res.json(nexachain.getStats());
});

app.get('/api/blockchain/blocks', (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const blocks = nexachain.chain.slice(-start - parseInt(limit), nexachain.chain.length - start || undefined);
    
    res.json({
        blocks: blocks.map(b => b.toJSON()).reverse(),
        total: nexachain.chain.length
    });
});

app.get('/api/blockchain/blocks/:hash', (req, res) => {
    const block = nexachain.chain.find(b => b.hash === req.params.hash || b.index === parseInt(req.params.hash));
    
    if (!block) {
        return res.status(404).json({ error: 'Block not found' });
    }
    
    res.json(block.toJSON());
});

// ============ STATS ROUTES ============
app.get('/api/stats', (req, res) => {
    const videos = Array.from(db.videos.values());
    const channels = Array.from(db.channels.values());
    
    res.json({
        totalVideos: videos.length,
        totalViews: videos.reduce((sum, v) => sum + v.views, 0),
        totalCreators: channels.length,
        totalSubscribers: channels.reduce((sum, c) => sum + c.subscribers, 0),
        totalRewards: videos.reduce((sum, v) => sum + v.totalEarned, 0),
        liveStreams: videos.filter(v => v.isLive).length,
        blockchainBlocks: nexachain.chain.length,
        blockchainTransactions: nexachain.stats.totalTransactions
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 NexaStream Backend API Started                       ║
║                                                           ║
║   📡 Port: ${PORT}                                          ║
║   🔗 URL: http://localhost:${PORT}                          ║
║   🧠 Blockchain: NexaChain (PoW + PoS)                    ║
║                                                           ║
║   📚 API Endpoints:                                       ║
║   - POST /api/auth/register                               ║
║   - POST /api/auth/login                                  ║
║   - GET  /api/videos                                      ║
║   - GET  /api/channels                                    ║
║   - GET  /api/wallet/balance                              ║
║   - GET  /api/rewards/stats                               ║
║   - GET  /api/blockchain/stats                            ║
║   - GET  /api/stats                                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
