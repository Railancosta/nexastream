// NexaStream - wallet testing (Fase 5, Item 39)
const API = 'http://localhost:3008';
const post = (p, o) => fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) }).then(r => r.json());
const get = (p) => fetch(API + p).then(r => r.json());
let pass = 0, fail = 0;
const t = (n, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n); };
const find = (bal, addr) => (Array.isArray(bal) ? bal : []).find(x => x.address === addr);

// 1) criação + backup (keys exportadas)
const w1 = await post('/api/chain/wallet', {});
t('wallet criada (address + pub + priv)', !!(w1.address && w1.publicKey && w1.privateKey));
const w2 = await post('/api/chain/wallet', {});

// 2) funding via faucet + mineração
await post('/api/chain/faucet', { to: w1.address, amount: 100 });
await post('/api/chain/mine', { miner: 'wallet-test' });
let bal = await get('/api/chain/balances');
t('faucet creditado (>=100)', (find(bal, w1.address)?.amount || 0) >= 100);

// 3) tx assinada válida move fundos
const tx = await post('/api/chain/tx', { from: w1.address, to: w2.address, amount: 40, privateKey: w1.privateKey });
t('tx assinada aceita na mempool', !tx.error);
await post('/api/chain/mine', { miner: 'wallet-test' });
bal = await get('/api/chain/balances');
t('destino recebeu 40', find(bal, w2.address)?.amount === 40);

// 4) chave inválida rejeitada
const bad = await post('/api/chain/tx', { from: w1.address, to: w2.address, amount: 5, privateKey: 'chave-invalida' });
t('assinatura invalida rejeitada', !!bad.error);

// 5) saldo insuficiente bloqueado (double-spend)
await post('/api/chain/tx', { from: w2.address, to: w1.address, amount: 99999, privateKey: w2.privateKey });
await post('/api/chain/mine', { miner: 'wallet-test' });
bal = await get('/api/chain/balances');
t('insuficiente/double-spend bloqueado (w1 continua 60)', find(bal, w1.address)?.amount === 60);

// 6) recuperação por backup da chave privada
const rec = await post('/api/chain/tx', { from: w1.address, to: w2.address, amount: 10, privateKey: w1.privateKey });
t('restauracao por backup assina normalmente', !rec.error);

// 7) integridade da chain após todas as operações
const v = await get('/api/chain/verify');
t('chain valida apos testes', v.valid === true);

console.log(JSON.stringify({ pass, fail }));
process.exit(fail ? 1 : 0);
