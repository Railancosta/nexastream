import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const valPath = path.join(ROOT, 'run', 'validators.json');
const KEYS = [4001, 4002].map(port => {
  const kp = crypto.generateKeyPairSync('ed25519');
  return { port, pub: kp.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'), priv: kp.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64') };
});
fs.writeFileSync(valPath, JSON.stringify(KEYS.map(({ port, pub }) => ({ port, pub }))));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const metrics = p => fetch('http://localhost:' + (p + 1000)).then(r => r.json()).catch(() => null);
function start(i) {
  return spawn('node', ['services/chain/consensus.mjs', String(KEYS[i].port), KEYS[i].priv, valPath], { cwd: ROOT, stdio: 'ignore' });
}
let pass = 0, fail = 0;
const t = (n, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n); };

const A = start(0); const B = start(1);
await sleep(9000);
let a = await metrics(4001), b = await metrics(4002);
t('2 validadores produzem blocos (height>=3)', a && b && a.height >= 3 && b.height >= 3);
t('consenso: heads identicos', a && b && a.head === b.head);
t('finalidade por acks (finals>=2)', a && a.finals >= 2);

B.kill('SIGKILL');
await sleep(9000);
const a2 = await metrics(4001);
t('liveness: A continua com B morto (skip blocks)', a2 && a2.height > a.height);

const B2 = start(1);
await sleep(8000);
const a3 = await metrics(4001), b3 = await metrics(4002);
t('sync: B recupera e iguala head', a3 && b3 && a3.head === b3.head);
console.log('metricas:', JSON.stringify({ avgBlockMs: a3?.avgBlockMs, finals: a3?.finals, validators: a3?.validators }));

A.kill('SIGKILL'); B2.kill('SIGKILL');
console.log(JSON.stringify({ pass, fail }));
process.exit(fail ? 1 : 0);
