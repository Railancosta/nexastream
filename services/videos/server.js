const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Configurar CORS restritivo
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://nexastream.org',
  'https://nexastream.org'
];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // limite de 50 requisições por IP (upload é pesado)
  message: { error: 'Muitas requisições, tente novamente mais tarde.' }
});
app.use(limiter);

app.use(express.json());

const DB_PATH = path.join(__dirname, '../../database/nexastream.db');
let db;

async function initDB() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : undefined;
  db = new SQL.Database(fileBuffer);
  
  db.run(`CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, channel_id TEXT, title TEXT, description TEXT, video_path TEXT, thumbnail_path TEXT, duration INTEGER, status TEXT, views INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Sanitizar inputs para prevenir XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Configurar Upload com validações seguras
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../storage/videos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Gerar nome seguro para o arquivo
    const ext = path.extname(file.originalname).toLowerCase();
    // Validar extensão
    const allowedExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Tipo de arquivo não permitido'));
    }
    cb(null, `${uuidv4()}${ext}`);
  }
});

// Configurações de upload seguras
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (limite seguro)
    files: 1 // Apenas 1 arquivo por requisição
  },
  fileFilter: (req, file, cb) => {
    // Validar MIME type
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Tipo de vídeo não permitido'));
    }
    cb(null, true);
  }
});

// Rota de Upload
app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado ou tipo inválido' });
  }
  
  const videoId = uuidv4();
  const { channelId, title, description } = req.body;
  
  // Sanitizar inputs
  const sanitizedChannelId = sanitizeInput(channelId || '');
  const sanitizedTitle = sanitizeInput(title || 'Sem título');
  const sanitizedDescription = sanitizeInput(description || '');
  
  // Usar prepared statements para prevenir SQL Injection
  db.run(
    `INSERT INTO videos (id, channel_id, title, description, video_path, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [videoId, sanitizedChannelId, sanitizedTitle, sanitizedDescription, req.file.path, 'processing']
  );
  saveDB();
  
  // Iniciar transcoding em background
  transcodeVideo(videoId, req.file.path);
  
  res.json({ videoId, status: 'processing', message: 'Upload recebido, processando...' });
});

function transcodeVideo(videoId, inputPath) {
  const outputDir = path.join(__dirname, '../../storage/videos/processed');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, `${videoId}.mp4`);
  const thumbDir = path.join(__dirname, '../../storage/thumbnails');
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
  const thumbPath = path.join(thumbDir, `${videoId}.jpg`);

  ffmpeg(inputPath)
    .outputOptions(['-c:v libx264', '-preset ultrafast', '-crf 28', '-c:a aac'])
    .size('640x360')
    .output(outputPath)
    .on('end', () => {
      console.log(`✅ Transcoding concluído: ${videoId}`);
      
      // Gerar thumbnail
      ffmpeg(inputPath).screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(thumbPath),
        folder: path.dirname(thumbPath),
        size: '320x180'
      }).on('end', () => {
        // Usar prepared statements
        db.run(
          `UPDATE videos SET status = ?, video_path = ?, thumbnail_path = ? WHERE id = ?`,
          ['ready', outputPath, thumbPath, videoId]
        );
        saveDB();
      });
      
      // Obter duração
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (!err && metadata.format.duration) {
          db.run(
            `UPDATE videos SET duration = ? WHERE id = ?`,
            [Math.floor(metadata.format.duration), videoId]
          );
          saveDB();
        }
      });
    })
    .on('error', (err) => {
      console.error(`❌ Erro no transcoding: ${err.message}`);
      db.run(`UPDATE videos SET status = ? WHERE id = ?`, ['failed', videoId]);
      saveDB();
    })
    .run();
}

// Listar vídeos
app.get('/api/videos', (req, res) => {
  try {
    const result = db.exec(`SELECT * FROM videos WHERE status = 'ready' ORDER BY created_at DESC LIMIT 20`);
    const videos = result.length > 0 ? result[0].values.map(row => ({
      id: row[0], channel_id: row[1], title: row[2], description: row[3], 
      video_path: row[4], thumbnail_path: row[5], duration: row[6], 
      status: row[7], views: row[8], created_at: row[9]
    })) : [];
    res.json({ videos });
  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    res.status(500).json({ error: 'Erro ao buscar vídeos' });
  }
});

// Servir arquivos estáticos
app.use('/storage', express.static(path.join(__dirname, '../../storage')));

initDB().then(() => {
  app.listen(3002, () => console.log('🎬 Video Service rodando em http://localhost:3002'));
});
