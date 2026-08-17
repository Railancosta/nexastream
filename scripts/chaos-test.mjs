// NexaStream - chaos/resilience test (Itens 29/52)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RUN = path.join(ROOT, 'run');

const TARGETS = [
  ['core', 'http://localhost:3002/api/health'],
  ['social', 'http://localhost:3011/api/social/health'],
  ['kpi', 'http://localhost:3017/api/kpi'],
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function probe(url, timeoutMs = 1500) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeoutMs);
    const r = await fetch(url, { signal: c.signal });
    clearTimeout(t);
    return r.ok;
  } catch { return false; }
}
function restart(name) {
  const child = spawn('node', ['services/' + name + '/server.js'], { cwd: ROOT, detached: true, stdio: 'ignore' });
  child.unref();
  fs.writeFileSync(path.join(RUN, name + '.pid'), String(child.pid));
}

let pass = 0, fail = 0;
const t = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name); };

for (const [name, url] of TARGETS) {
  const pidFile = path.join(RUN, name + '.pid');
  if (!fs.existsSync(pidFile)) { t(name + ' pidfile existe', false); continue; }
  const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());

  try { process.kill(pid, 'SIGKILL'); } catch (e) {}
  await sleep(700);
  t(name + ' fora do ar apos kill', !(await probe(url)));

  if (name !== 'kpi') {
    t('kpi segue respondendo com ' + name + ' fora (sem cascata)', await probe('http://localhost:3017/api/kpi'));
  }

  restart(name);
  let up = false;
  for (let i = 0; i < 10 && !up; i++) { await sleep(500); up = await probe(url); }
  t(name + ' recupera apos restart', up);
}

console.log(JSON.stringify({ pass, fail }));
process.exit(fail ? 1 : 0);
