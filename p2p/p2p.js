const net = require('node:net');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = +(process.argv[2] || 3005);
const PEER = +(process.argv[3] || 3006);
const MODE = process.argv[4] || 'serve';
const VID = process.argv[5] || '';
const IDX = +(process.argv[6] || 0);
const STAY = process.argv[7] === 'stay';
const CHUNK = 256 * 1024;

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'storage', 'p2p', String(PORT));
fs.mkdirSync(STORE, { recursive: true });

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const send = (s, o) => s.write(JSON.stringify(o) + '\n');

const server = net.createServer((sock) => {
  let buf = '';
  sock.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      if (m.t === 'hello') { console.log('[descoberta] peer na porta ' + m.port); send(sock, { t: 'hello', port: PORT }); }
      if (m.t === 'chunk') {
        const f = path.join(STORE, m.contentId + '.' + m.index);
        if (fs.existsSync(f)) {
          const data = fs.readFileSync(f);
          send(sock, { t: 'chunk', contentId: m.contentId, index: m.index, hash: sha(data), data: data.toString('base64') });
        } else send(sock, { t: 'nochunk', index: m.index });
      }
    }
  });
});

function seed() {
  const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'storage', 'manifests', VID + '.json'), 'utf8'));
  const buf = fs.readFileSync(path.join(ROOT, 'storage', 'videos', VID + '_360p.mp4'));
  for (const c of mf.chunks) {
    fs.writeFileSync(path.join(STORE, mf.contentId + '.' + c.index), buf.subarray(c.index * CHUNK, c.index * CHUNK + c.size));
  }
  console.log('[seed] ' + mf.chunks.length + ' chunk(s) armazenados no no ' + PORT);
}

function fetchChunk() {
  const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'storage', 'manifests', VID + '.json'), 'utf8'));
  const expect = mf.chunks[IDX].hash;
  const sock = net.connect(PEER, '127.0.0.1', () => send(sock, { t: 'chunk', contentId: mf.contentId, index: IDX }));
  let buf = '';
  sock.on('data', (d) => {
    buf += d;
    const i = buf.indexOf('\n');
    if (i < 0) return;
    const m = JSON.parse(buf.slice(0, i));
    if (m.t === 'chunk') {
      const data = Buffer.from(m.data, 'base64');
      const ok = sha(data) === m.hash && m.hash === expect;
      fs.writeFileSync(path.join(STORE, m.contentId + '.' + m.index), data);
      console.log('[fetch] chunk ' + IDX + ': ' + data.length + ' bytes, integridade=' + ok);
      if (!STAY) process.exit(ok ? 0 : 1);
    } else { console.log('[fetch] peer nao tem o chunk'); process.exit(1); }
  });
  sock.on('error', (e) => { console.log('[fetch] peer offline: ' + e.message); process.exit(1); });
}

server.listen(PORT, () => {
  console.log('No P2P ' + PORT + ' ativo (modo ' + MODE + ')');
  const c = net.connect(PEER, '127.0.0.1', () => send(c, { t: 'hello', port: PORT }));
  c.on('error', () => console.log('[descoberta] peer ' + PEER + ' offline'));
  if (MODE === 'seed') seed();
  if (MODE === 'fetch') setTimeout(fetchChunk, 700);
});
