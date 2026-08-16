import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { getDB } from '../db/database.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, WebM, MOV, and AVI are allowed.'));
    }
  }
});

// Upload video
router.post('/video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    
    const { title, description, category, channelId } = req.body;
    
    if (!title || !channelId) {
      return res.status(400).json({ error: 'Title and channel ID are required' });
    }
    
    const db = getDB();
    const videoId = uuidv4();
    const ipfsHash = 'Qm' + uuidv4().replace(/-/g, '').slice(0, 44);
    
    const videoUrl = `/uploads/videos/${req.file.filename}`;
    
    db.prepare(`
      INSERT INTO videos (id, channel_id, title, description, video_url, status, category, ipfs_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(videoId, channelId, title, description || '', videoUrl, 'processing', category || 'entertainment', ipfsHash);
    
    res.status(201).json({
      success: true,
      video: {
        id: videoId,
        title,
        videoUrl,
        ipfsHash,
        status: 'processing'
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload thumbnail
router.post('/thumbnail', upload.single('thumbnail'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
    
    res.json({
      success: true,
      url: thumbnailUrl
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload avatar/banner
router.post('/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { type } = req.body;
    const url = `/uploads/images/${req.file.filename}`;
    
    res.json({
      success: true,
      url,
      type
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get upload status
router.get('/status/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const db = getDB();
    
    const video = db.prepare('SELECT id, status, ipfs_hash FROM videos WHERE id = ?').get(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({
      videoId: video.id,
      status: video.status === 'processing' ? 'processing' : 'ready',
      ipfsHash: video.ipfs_hash,
      gatewayUrl: video.ipfs_hash ? `https://ipfs.io/ipfs/${video.ipfs_hash}` : null
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
