import * as nano from 'nanocurrency';
import { writeFileSync } from 'node:fs';

const seed   = nano.generateSeed();
const secret = nano.deriveSecretKey(seed, { index: 0 });
const pub    = nano.derivePublicKey(secret);
const addr   = nano.getAddress(pub);

// Publica SOMENTE o endereço no site; o seed fica OFFLINE
writeFileSync('../apps/site/public/nst-address.txt', addr + '\n');

console.log('=== NST TREASURY — NANO MAINNET ===');
console.log('address:', addr);
console.log('');
console.log('!!! SEED (anote NO PAPEL, desligue, NUNCA commitar):');
console.log(seed);
