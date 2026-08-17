const URL = 'http://localhost:3002/api/videos';
const N = 100;
const t0 = Date.now();
let ok = 0, lat = 0;
for (let i = 0; i < N; i++) {
  const s = Date.now();
  const r = await fetch(URL);
  if (r.ok) ok++;
  lat += Date.now() - s;
}
const total = (Date.now() - t0) / 1000;
console.log(JSON.stringify({ requests: N, ok, avgLatencyMs: Math.round(lat / N), rps: Math.round(N / total) }));
