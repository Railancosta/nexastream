const express = require('express');
const crypto = require('crypto'); // Nativo do Node.js (Zero instalação)
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const initSqlJs = require('sql.js'); // 100% WebAssembly, zero compilação C++
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, '../../database/nexastream.db');
const JWT_SECRET = process.env.JWT_SECRET || 'nexastream-secret-key-2024';
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
  return hash === verifyHash;
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Rota de Registro
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username) return res.status(400).json({ error: 'Dados incompletos' });

    const existing = db.exec(`SELECT id FROM users WHERE email = '${email}' OR username = '${username}'`);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ error: 'Usuário ou email já existe' });
    }

    const id = uuidv4();
    const password_hash = hashPassword(password);
    
    db.run(`INSERT INTO users (id, email, password_hash, username) VALUES ('${id}', '${email}', '${password_hash}', '${username}')`);
    
    const channelId = uuidv4();
    db.run(`INSERT INTO channels (id, owner_id, name, handle) VALUES ('${channelId}', '${id}', '${username}', '${username}')`);
    
    saveDB();

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email, username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const result = db.exec(`SELECT * FROM users WHERE email = '${email}'`);
    
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
    res.json({ token, user: { id: userId, email, username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

initDB().then(() => {
  app.listen(3001, () => console.log('🔐 Auth Service rodando em http://localhost:3001'));
});
