import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';

const [,, portArg, privB64, valPath] = process.argv;
const PORT = +portArg;
const priv = crypto.createPrivateKey({ key: Buffer.from(privB64, 'base64'), format: 'der', type: 'pkcs8' });
const myPub = crypto.createPublicKey(priv).export({ type: 'spki', format: 'der' }).toString('base64');
const VALS = JSON.parse(fs.readFileSync(valPath, 'utf8'));
const V = VALS.length;
const ME = VALS.findIndex(v => v.port === PORT);
const SKIP_MS = 5000;

const sha = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const sign = d => crypto.sign(null, Buffer.from(d), priv).toString('base64');
const pubKey = b64 => crypto.createPublicKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'spki' });
const verif = (b64, d, s) => crypto.verify(null, Buffer.from(d), pubKey(b64), Buffer.from(s, 'base64'));

const g = { header: { h: 0, prev: '0'.repeat(64), ts: Date.now(), proposer: 0, txs: [{ type: 'genesis', validators: VALS.map(v => v.pub) }] }, sig: 'genesis' };
g.hash = sha(g.header);
let chain = [g];
const acks = {};
let finals = 0, lastBlockAt = Date.now();
const blockTimes = [];

const headHash = () => chain[chain.length - 1].hash;
const sockets = new Set();
const send = (s, o) => { try { s.write(JSON.stringify(o) + '\n'); } catch {} };
const broadcast = o => { for (const s of sockets) send(s, o); };

const sigOk = b => verif(VALS[b.header.proposer].pub, sha(b.header), b.sig);
const roleOk = b => b.header.proposer === b.header.h % V || b.header.txs?.[0]?.type === 'skip';
const linkOk = b => b.header.h === chain.length && b.header.prev === headHash();

function countAck(h, pub) {
  acks[h] = acks[h] || new Set();
  acks[h].add(pub);
  if (acks[h].size >= V - 1 && h > finals) finals = h;
}
function adopt(b) {
  chain.push(b);
  lastBlockAt = Date.now();
  if (chain.length > 2) blockTimes.push(b.header.ts - chain[chain.length - 2].header.ts);
  broadcast({ t: 'block', block: b });
}
function ack(b) {
  const a = { t: 'ack', h: b.header.h, hash: b.hash, pub: myPub };
  a.sig = sign(a.hash);
  broadcast(a);
  countAck(b.header.h, myPub);
}
function onBlock(b) { if (linkOk(b) && roleOk(b) && sigOk(b)) { adopt(b); ack(b); } }
function onAck(a) { if (VALS.some(v => v.pub === a.pub) && verif(a.pub, a.hash, a.sig)) countAck(a.h, a.pub); }
function onChain(blocks) {
  if (blocks.length + 1 <= chain.length) return;
  let next = [...chain];
  for (const b of blocks) {
    if (b.header.h !== next.length || b.header.prev !== next[next.length - 1].hash || !roleOk(b) || !sigOk(b)) return;
    next.push(b);
  }
  chain = next; lastBlockAt = Date.now();
}
function attach(sock) {
  sockets.add(sock);
  sock.on('close', () => sockets.delete(sock));
  sock.on('error', () => {});
  let buf = '';
  sock.on('data', d => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const m = JSON.parse(buf.slice(0, i) || 'null'); buf = buf.slice(i + 1);
      if (!m) continue;
      if (m.t === 'block') onBlock(m.block);
      if (m.t === 'ack') onAck(m);
      if (m.t === 'sync') send(sock, { t: 'chain', blocks: chain.slice(1) });
      if (m.t === 'chain') onChain(m.blocks);
    }
  });
}
function propose(skip = false) {
  const h = chain.length;
  const header = { h, prev: headHash(), ts: Date.now(), proposer: ME, txs: skip ? [{ type: 'skip', missing: h % V }] : [{ type: 'hb', n: h }] };
  const b = { header, sig: sign(sha(header)) };
  b.hash = sha(header);
  adopt(b); ack(b);
}
setInterval(() => {
  const expected = chain.length % V;
  if (expected === ME) propose(false);
  else if (Date.now() - lastBlockAt > SKIP_MS && (expected + 1) % V === ME) propose(true);
}, 400);

net.createServer(attach).listen(PORT);
function connect(p) {
  if (p === PORT) return;
  const s = net.connect(p, '127.0.0.1', () => send(s, { t: 'sync' }));
  s.on('close', () => setTimeout(() => connect(p), 2000));
  s.on('error', () => {});
  attach(s);
}
VALS.forEach(v => connect(v.port));

http.createServer((req, res) => {
  const avg = blockTimes.length > 1 ? Math.round(blockTimes.slice(1).reduce((a, b) => a + b, 0) / (blockTimes.length - 1)) : 0;
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ port: PORT, me: ME, validators: V, height: chain.length - 1, head: headHash(), finals, avgBlockMs: avg }));
}).listen(PORT + 1000);
console.log('validator ' + ME + ' na porta ' + PORT);
