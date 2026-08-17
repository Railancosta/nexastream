const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, '../../database/nexastream.db'));

app.use(cors());

app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  
  db.all(`SELECT v.* FROM videos v 
          JOIN videos_search vs ON v.rowid = vs.rowid 
          WHERE videos_search MATCH ? 
          ORDER BY rank LIMIT 20`, 
    [q], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro' });
      res.json({ videos: rows });
    });
});

const PORT = 3003;
app.listen(PORT, () => console.log(`🔍 Search Service: http://localhost:${PORT}`));
