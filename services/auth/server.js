const express = require('express');
const crypto = require('crypto'); // Nativo do Node.js (Zero instalação)
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const initSqlJs = require('sql.js'); // 100% WebAssembly, zero compilação C++
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Configurar CORS restritivo (apenas domínios permitidos)
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

// Rate limiting para prevenir brute-force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: { error: 'Muitas requisições, tente novamente mais tarde.' }
});
app.use(limiter);

app.use(express.json());

const DB_PATH = path.join(__dirname, '../../database/nexastream.db');
const JWT_SECRET = process.env.JWT_SECRET;

// Validar que JWT_SECRET está configurado
if (!JWT_SECRET) {
  console.error('❌ ERRO: JWT_SECRET não está configurado nas variáveis de ambiente.');
  process.exit(1);
}

let db;

// Inicializar Banco de Dados SQLite via WebAssembly
async function initDB() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : undefined;
  db = new SQL.Database(fileBuffer);
  
  // Criar tabelas se não existirem
  db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, username TEXT UNIQUE)`);
  db.run(`CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, owner_id TEXT, name TEXT, handle TEXT UNIQUE)`);
  
  // Salvar no disco
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log('✅ Banco de dados SQLite inicializado com sucesso!');
}

// Funções de Hash Seguras (Nativas do Node.js)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
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

// Rota de Registro
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Sanitizar inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedUsername = sanitizeInput(username);

    // Usar prepared statements para prevenir SQL Injection
    const existing = db.exec(`SELECT id FROM users WHERE email = ? OR username = ?`, [sanitizedEmail, sanitizedUsername]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ error: 'Usuário ou email já existe' });
    }

    const id = uuidv4();
    const password_hash = hashPassword(password);
    
    // Usar prepared statements
    db.run(`INSERT INTO users (id, email, password_hash, username) VALUES (?, ?, ?, ?)`, [id, sanitizedEmail, password_hash, sanitizedUsername]);
    
    const channelId = uuidv4();
    db.run(`INSERT INTO channels (id, owner_id, name, handle) VALUES (?, ?, ?, ?)`, [channelId, id, sanitizedUsername, sanitizedUsername]);
    
    saveDB();

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email: sanitizedEmail, username: sanitizedUsername } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Sanitizar input
    const sanitizedEmail = sanitizeInput(email);

    // Usar prepared statements
    const result = db.exec(`SELECT * FROM users WHERE email = ?`, [sanitizedEmail]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const row = result[0].values[0];
    const userId = row[0];
    const storedHash = row[2];
    const username = row[3];

    if (!verifyPassword(password, storedHash)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, email: sanitizedEmail, username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

initDB().then(() => {
  app.listen(3001, () => console.log('🔑 Auth Service rodando em http://localhost:3001'));
});
