const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, Channel, Subscription, Notification } = require('../../models');
const { auth, optionalAuth } = require('../../middleware');
const config = require('../../config');
const { generateWallet, encryptPrivateKey } = require('../../utils/wallet');
const analytics = require('../../services/analytics');
const googleAuth = require('../../services/googleAuth');

const REFRESH_EXPIRES = config.REFRESH_TOKEN_EXPIRES;

function issueTokens(user) {
  const payload = { userId: user.id, email: user.email, walletAddress: user.walletAddress };
  const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, config.REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { token, refreshToken };
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    role: user.role,
    walletAddress: user.walletAddress
  };
}

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 8 })
];

// REGISTER (email + password)
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password, displayName } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    const wallet = generateWallet();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Private key is encrypted at rest; never stored in plaintext, never returned.
    const user = await User.create({
      username, email, password: hashedPassword,
      displayName: displayName || username,
      walletAddress: wallet.address,
      walletPrivateKey: encryptPrivateKey(wallet.privateKey),
      authProvider: 'email'
    });

    const channel = await Channel.create({
      userId: user.id, username, displayName: displayName || username,
      description: `Welcome to ${username}'s channel!`
    });

    const { token, refreshToken } = issueTokens(user);

    res.status(201).json({
      success: true, token, refreshToken,
      user: publicUser(user),
      channel: { id: channel.id, username: channel.username, displayName: channel.displayName }
    });
    analytics.track(user.id, 'sign_up', { method: 'email' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN (email + password)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ where: { email } });
    if (!user || user.authProvider === 'google') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    await user.update({ lastLogin: new Date(), loginCount: user.loginCount + 1 });
    const channel = await Channel.findOne({ where: { userId: user.id } });
    const { token, refreshToken } = issueTokens(user);

    res.json({
      success: true, token, refreshToken,
      user: publicUser(user),
      channel: channel ? { id: channel.id, username: channel.username, displayName: channel.displayName, subscribers: channel.subscribers } : null
    });
    analytics.track(user.id, 'login', { method: 'email' });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid refresh token' });
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'Invalid refresh token' });
    const tokens = issueTokens(user);
    res.json({ success: true, ...tokens });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GOOGLE OAUTH — exchange authorization code for Google profile, then issue app tokens
router.post('/google', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Authorization code required' });

    const profile = await googleAuth.exchangeCodeForProfile(code);
    if (!profile || !profile.email) return res.status(400).json({ error: 'Google authentication failed' });

    let user = await User.findOne({ where: { email: profile.email } });
    if (user && user.authProvider !== 'google') {
      return res.status(400).json({ error: 'Email registered with password. Log in with password.' });
    }
    if (!user) {
      // Provision a new account + wallet + channel on first Google sign-in.
      const baseUsername = (profile.email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 25);
      let username = baseUsername;
      let n = 1;
      while (await User.findOne({ where: { username } })) { username = `${baseUsername}${n++}`; }

      const wallet = generateWallet();
      user = await User.create({
        username, email: profile.email,
        password: bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12), // unused but NOT NULL
        displayName: profile.name || username,
        avatar: profile.picture || null,
        walletAddress: wallet.address,
        walletPrivateKey: encryptPrivateKey(wallet.privateKey),
        authProvider: 'google',
        googleId: profile.sub,
        isEmailVerified: true
      });
      await Channel.create({
        userId: user.id, username, displayName: profile.name || username,
        description: `Welcome to ${username}'s channel!`
      });
    }

    await user.update({ lastLogin: new Date(), loginCount: user.loginCount + 1 });
    const channel = await Channel.findOne({ where: { userId: user.id } });
    const { token, refreshToken } = issueTokens(user);

    res.json({
      success: true, token, refreshToken,
      user: publicUser(user),
      channel: channel ? { id: channel.id, username: channel.username, displayName: channel.displayName, subscribers: channel.subscribers } : null
    });
    analytics.track(user.id, 'google_login', {});
  } catch (error) {
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// GET PROFILE (never exposes password or walletPrivateKey)
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, { attributes: { exclude: ['password', 'walletPrivateKey'] } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const channels = await Channel.findAll({ where: { userId: user.id } });
    res.json({ user, channels });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// UPDATE PROFILE
router.put('/profile', auth, async (req, res) => {
  try {
    const { displayName, bio, avatar, banner, preferences } = req.body;
    await req.user.update({ displayName, bio, avatar, banner, preferences });
    res.json({ success: true, user: publicUser(req.user) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// CHANGE PASSWORD (only for email-provider accounts)
router.put('/password', auth, async (req, res) => {
  try {
    if (req.user.authProvider === 'google') {
      return res.status(400).json({ error: 'Password change unavailable for Google accounts' });
    }
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!(await bcrypt.compare(currentPassword, req.user.password))) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    await req.user.update({ password: await bcrypt.hash(newPassword, 12) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET USER (public profile)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'displayName', 'avatar', 'banner', 'bio', 'createdAt']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const channels = await Channel.findAll({ where: { userId: user.id } });
    res.json({ user, channels });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// NOTIFICATIONS LIST
router.get('/notifications/list', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { rows: notifications, count } = await Notification.findAndCountAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit)
    });
    const unreadCount = await Notification.count({ where: { userId: req.user.userId, read: false } });
    res.json({ notifications, unreadCount, total: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// MARK NOTIFICATION READ
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    await Notification.update({ read: true, readAt: new Date() }, { where: { id: req.params.id, userId: req.user.userId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
