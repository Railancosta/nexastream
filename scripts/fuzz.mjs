const BASE = 'http://localhost:3002';
const P = ['/api/health', '/api/videos', '/api/search?q=%27%22', '/api/videos/..%2f..%2fetc%2fpasswd', '/api/auth/login'];
const B = ['not json', '{"email":', '{"email":"a@b.c"}', '{"$ne":null}', '["a",1]', '\xff\xfe\x00',
           '{"password":"' + 'A'.repeat(50000) + '"}', '{"email":"🔥@.🔥","password":"🔥"}', ''];
const M = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'BANANA'];
let reqs = 0, crashes = 0, handled5xx = 0;

async function hit(path, method, body) {
  reqs++;
  try {
    const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: (method === 'GET' ? undefined : body) });
    if (r.status >= 500) handled5xx++;
  } catch (e) { crashes++; }
}

for (const p of P) for (const m of M) await hit(p, m);
for (const b of B) { await hit('/api/auth/login', 'POST', b); await hit('/api/videos/upload', 'PUT', b); }

let alive = false;
try { const r = await fetch(BASE + '/api/health'); alive = r.ok; } catch (e) {}
console.log(JSON.stringify({ reqs, handled5xx, crashes, alive, resultado: (alive && crashes === 0) ? 'FUZZ PASS' : 'FUZZ FAIL' }));
process.exit(alive && crashes === 0 ? 0 : 1);
