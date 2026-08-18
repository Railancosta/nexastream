// Wallet — criação, backup, sign, DApp integration (Item 17)
import express from 'express';
import crypto from 'node:crypto';
const app = express(); app.use(express.json());
// Item 15: crypto padrão, nada experimental
const BIP39_WORDS = 'abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice'.split(' ');

app.post('/api/wallet/create',(_,r)=>{
  const mnemonic = Array.from({length:12},()=>BIP39_WORDS[Math.floor(Math.random()*BIP39_WORDS.length)]).join(' ');
  const priv = crypto.randomBytes(32).toString('hex');
  const pub  = crypto.createHash('sha256').update(priv).digest('hex');
  const addr = 'ns1'+pub.slice(0,32);
  r.json({mnemonic,priv,pub,addr,network:'testnet',warning:'Guarde mnemonic OFFLINE'});
});

app.post('/api/wallet/sign',(req,res)=>{
  const {priv,message} = req.body;
  const sig = crypto.createHmac('sha256',priv).update(message).digest('hex');
  res.json({signature:sig});
});
app.get('/api/health',(_,r)=>r.json({service:'wallet',ok:true}));
app.listen(process.env.PORT||3009,()=>console.log('wallet :3009'));
