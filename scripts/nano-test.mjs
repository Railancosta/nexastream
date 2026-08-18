import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let nano; try { nano = require('nanocurrency'); } catch (e) { console.log('FAIL nanocurrency ausente'); process.exit(1); }
let pass = 0, fail = 0;
const t = (n, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n); };

const seed = nano.generateSeed();
t('seed 64 hex', /^[0-9a-f]{64}$/.test(seed));
const sk = nano.deriveSecretKey(seed, { index: 0 });
const pk = nano.derivePublicKey(sk);
const addr = nano.getAddress(pk);
t('address nano_/xrb_', /^(nano_|xrb_)/.test(addr));
const anchorAddr = nano.getAddress('ab'.repeat(32));
t('anchor-address derivavel de hash', typeof anchorAddr === 'string' && anchorAddr.length > 50);

const block = { type: 'state', account: addr, previous: '0'.repeat(64), representative: addr, balance: '0', link: '0'.repeat(64) };
let hash = null, sig = null;
try { hash = nano.hashBlock(block); } catch (e) {}
try { const r = nano.signBlock(block, sk); sig = (typeof r === 'string') ? r : (r && r.signature) || null; } catch (e) {}
t('hashBlock ok', !!hash);
t('signBlock ok', !!sig);
try { if (sig && hash && nano.verify) t('verify round-trip', !!nano.verify(sig, hash, pk)); } catch (e) { t('verify round-trip', false); }

console.log(JSON.stringify({ pass, fail }));
process.exit(fail ? 1 : 0);
