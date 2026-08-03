import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/database.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexastream-secret-key-change-in-production';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, displayName } = req.body;
    const db = getDB();
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password and username are required' });
    }
    
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const walletAddress = '0x' + uuidv4().replace(/-/g, '');
    
    // Create user
    db.prepare(`
      INSERT INTO users (id, email, password_hash, username, display_name, wallet_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, username, displayName || username, walletAddress);
    
    // Create default channel
    const channelId = uuidv4();
    db.prepare(`
      INSERT INTO channels (id, user_id, name, handle)
      VALUES (?, ?, ?, ?)
    `).run(channelId, userId, displayName || username, username.toLowerCase());
    
    // Generate token
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: userId,
        email,
        username,
        displayName: displayName || username,
        walletAddress,
        channelId
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDB();
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const channel = db.prepare('SELECT * FROM channels WHERE user_id = ?').get(user.id);
    
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        walletAddress: user.wallet_address,
        channelId: channel?.id,
        channelHandle: channel?.handle,
        verified: channel?.verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const db = getDB();
    const user = db.prepare('SELECT id, email, username, display_name, avatar_url, bio, wallet_address, created_at FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const channel = db.prepare('SELECT * FROM channels WHERE user_id = ?').get(user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        walletAddress: user.wallet_address,
        channelId: channel?.id,
        channelHandle: channel?.handle,
        verified: channel?.verified,
        subscriberCount: channel?.subscribers || 0,
        totalViews: channel?.total_views || 0,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update profile
router.put('/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexastream-secret-key-change-in-production');
    
    const { displayName, bio, avatarUrl } = req.body;
    const db = getDB();
    
    db.prepare(`
      UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(displayName, bio, avatarUrl, decoded.userId);
    
    if (displayName) {
      db.prepare('UPDATE channels SET name = ? WHERE user_id = ?').run(displayName, decoded.userId);
    }
    
    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
