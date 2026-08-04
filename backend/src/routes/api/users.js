const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, Channel, Subscription, Notification } = require('../../models');
const { auth, optionalAuth } = require('../../middleware');
const config = require('../../config');

// Generate wallet
function generateWallet() {
  const wallet = new Wallet();
  return { address: wallet.address, privateKey: wallet.privateKey };
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName, referrerCode } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });
    
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });
    
    const wallet = generateWallet();
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await User.create({
      username, email, password: hashedPassword,
      displayName: displayName || username,
      walletAddress: wallet.address, walletPrivateKey: wallet.privateKey
    });
    
    const channel = await Channel.create({
      userId: user.id, username, displayName: displayName || username,
      description: `Welcome to ${username}'s channel!`
    });
    
    const token = jwt.sign({ userId: user.id, email, walletAddress: wallet.address }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
    
    res.status(201).json({
      success: true, token,
      user: { id: user.id, username, email, displayName, walletAddress: wallet.address, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    await user.update({ lastLogin: new Date(), loginCount: user.loginCount + 1 });
    const channel = await Channel.findOne({ where: { userId: user.id } });
    const token = jwt.sign({ userId: user.id, email, walletAddress: user.walletAddress }, config.JWT_SECRET);
    
    res.json({
      success: true, token,
      user: { id: user.id, username: user.username, email, displayName: user.displayName, avatar: user.avatar, role: user.role },
      channel: channel ? { id: channel.id, username: channel.username, displayName: channel.displayName, subscribers: channel.subscribers } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET PROFILE
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, { attributes: { exclude: ['password', 'walletPrivateKey'] } });
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
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// CHANGE PASSWORD
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!(await bcrypt.compare(currentPassword, req.user.password))) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    await req.user.update({ password: await bcrypt.hash(newPassword, 12) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET USER
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

// GET NOTIFICATIONS
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
    res.status(500).json({ error: 'Failed to get notifications' });
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
