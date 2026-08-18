const BASE = 'http://localhost:3002/api/videos';
const N = Number(process.argv[2] || 10000);
let ok = 0, lat = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const s = Date.now();
  try { const r = await fetch(BASE); if (r.ok) ok++; } catch {}
  lat += Date.now() - s;
}
const total = (Date.now() - t0) / 1000;
const avg = Math.round(lat / N);
const rps = Math.round(N / total);
const pass = ok === N && avg <= 500;
console.log(JSON.stringify({ stage: N, ok, avgMs: avg, rps, gate: pass ? 'PASS' : 'FAIL' }));
process.exit(pass ? 0 : 1);
