// NexaStream - progressive scale test (Itens 29/50)
const URL = 'http://localhost:3002/api/videos';
const STAGES = [10, 100, 1000];
const MAX_AVG_MS = 500;

for (const n of STAGES) {
  let ok = 0, lat = 0;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const s = Date.now();
    try {
      const r = await fetch(URL);
      if (r.ok) ok++;
    } catch (e) {}
    lat += Date.now() - s;
  }
  const total = (Date.now() - t0) / 1000;
  const avg = Math.round(lat / n);
  const rps = Math.round(n / total);
  const gate = ok === n && avg <= MAX_AVG_MS;
  console.log(JSON.stringify({ stage: n, ok, avgMs: avg, rps, gate: gate ? 'PASS' : 'FAIL' }));
  if (!gate) {
    console.log('GATE REPROVADO: nao avancar (No Premature Scaling - Item 46.6)');
    process.exit(1);
  }
}
console.log('SCALE GATE OK: 10 -> 100 -> 1000 validados no hardware atual');
