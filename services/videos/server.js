const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
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

// Configurar Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../storage/videos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Apenas arquivos de vídeo'));
  }
});

// Rota de Upload
app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  
  const videoId = uuidv4();
  const { channelId, title, description } = req.body;
  
  db.run(`INSERT INTO videos (id, channel_id, title, description, video_path, status) VALUES ('${videoId}', '${channelId}', '${title}', '${description}', '${req.file.path}', 'processing')`);
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
    .outputOptions(['-c:v libx264', '-preset ultrafast', '-crf 28', '-c:a aac']) // ultrafast para Termux
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
        db.run(`UPDATE videos SET status = 'ready', video_path = '${outputPath}', thumbnail_path = '${thumbPath}' WHERE id = '${videoId}'`);
        saveDB();
      });
      
      // Obter duração
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (!err && metadata.format.duration) {
          db.run(`UPDATE videos SET duration = ${Math.floor(metadata.format.duration)} WHERE id = '${videoId}'`);
          saveDB();
        }
      });
    })
    .on('error', (err) => {
      console.error(`❌ Erro no transcoding: ${err.message}`);
      db.run(`UPDATE videos SET status = 'failed' WHERE id = '${videoId}'`);
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
    res.status(500).json({ error: 'Erro ao buscar vídeos' });
  }
});

// Servir arquivos estáticos
app.use('/storage', express.static(path.join(__dirname, '../../storage')));

initDB().then(() => {
  app.listen(3002, () => console.log('🎬 Video Service rodando em http://localhost:3002'));
});
