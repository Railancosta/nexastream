// NexaStream - security tests (Fase 5)
const B = 'http://localhost:3002', C = 'http://localhost:3008', M = 'http://localhost:3014';
let pass = 0, fail = 0;
const t = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + name); };

let r = await fetch(B + '/api/videos/upload', { method: 'PUT', body: 'x' });
t('upload sem auth => 401', r.status === 401);

r = await fetch(B + '/api/videos/upload', { method: 'PUT', headers: { Authorization: 'Bearer a.b.c' }, body: 'x' });
t('token JWT forjado => 401', r.status === 401);

r = await fetch(B + '/storage/..%2f..%2f..%2fetc%2fpasswd');
t('path traversal bloqueado', r.status >= 400);

r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x@x', password: 'err' }) });
t('login invalido => 401', r.status === 401);

r = await fetch(C + '/api/chain/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'a', to: 'b', amount: 1, privateKey: 'chave-invalida' }) });
let d = await r.json();
t('tx com chave invalida rejeitada', !!d.error);

r = await fetch(M + '/api/mod/removed');
t('moderation /removed responde 200', r.status === 200);

r = await fetch(M + '/api/mod/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: 'x', action: 'hack', moderator: 'm' }) });
d = await r.json();
t('acao de moderacao invalida rejeitada', !!d.error);

console.log(JSON.stringify({ pass, fail }));
process.exit(fail ? 1 : 0);
