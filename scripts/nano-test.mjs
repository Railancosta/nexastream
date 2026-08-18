import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const nano = require('nanocurrency');
let pass = 0, fail = 0;
const t = (n, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n); };

const seed = '0'.repeat(64);
const sk = nano.deriveSecretKey(seed, { index: 0 });
const pk = nano.derivePublicKey(sk);
const addr = nano.getAddress(pk);
t('derivação determinística de endereço', typeof addr === 'string' && addr.startsWith('nano_'));
t('validateAddress(valido) = true', nano.validateAddress(addr) === true);
const bad = addr.slice(0, -1) + (addr.slice(-1) === 'a' ? 'b' : 'a');
t('validateAddress(checksum quebrado) = false', nano.validateAddress(bad) === false);
const raw = (BigInt(Math.round(0.001 * 1e6)) * 10n ** 24n).toString();
t('conversao 0.001 NANO -> raw (10^27)', raw === '1000000000000000000000000000');
console.log(JSON.stringify({ pass, fail }));
process.exit(fail ? 1 : 0);
