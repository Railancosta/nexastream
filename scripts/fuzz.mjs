const TARGETS = [
  ['http://localhost:3002', ['/api/videos', '/api/health', '/api/search?q=<script>', "/api/videos/..%2f..%2fetc%2fpasswd", "/api/videos/'%22"]],
  ['http://localhost:3014', ['/api/mod/queue', '/api/mod/removed', '/api/mod/status/x']],
  ['http://localhost:3018', ['/api/analytics/totals']]
];
const BODIES = ['{', '{"email":', 'null', '[]', '"str"', '{"email":"a@b.c","password":"x","username":"<img src=x>"}', '{"seconds":-5,"videoId":"","viewerId":""}'];
let tested = 0, crashes = 0;
for (const [base, paths] of TARGETS) {
  for (const p of paths) { tested++; const r = await fetch(base + p).catch(() => null); if (!r) { crashes++; console.log('CRASH?', base + p); } }
  for (const b of BODIES) { tested++; const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b }).catch(() => null); if (!r) { crashes++; console.log('CRASH?', base, b); } }
}
for (const [base] of TARGETS) {
  const hp = base.includes('3002') ? '/api/health' : base.includes('3014') ? '/api/mod/queue' : '/api/analytics/totals';
  const r = await fetch(base + hp).catch(() => null);
  if (!r || !r.ok) { crashes++; console.log('DOWN AFTER FUZZ:', base); }
}
console.log(JSON.stringify({ tested, crashes, result: crashes === 0 ? 'FUZZ PASS' : 'FUZZ FAIL' }));
process.exit(crashes ? 1 : 0);
