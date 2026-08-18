// NexaStream Blockchain Node — TESTNET (Item 40: mainnet bloqueada)
import express from 'express';
import crypto from 'node:crypto';
const app = express(); app.use(express.json());

// Genesis (Item 38)
const genesis = {index:0,timestamp:Date.now(),data:'NexaStream Testnet Genesis',prev:'0',hash:''};
genesis.hash = crypto.createHash('sha256').update(JSON.stringify(genesis)).digest('hex');

const chain = [genesis];
const NST = {totalSupply:55000000,circulating:0,minted:0}; // Item 14

function mine(prev){
  const block = {index:chain.length,timestamp:Date.now(),txs:[],prev:prev.hash};
  block.hash = crypto.createHash('sha256').update(JSON.stringify(block)).digest('hex');
  chain.push(block);
  return block;
}
mine(genesis); mine(chain[1]); // 3 blocos iniciais

app.get('/api/chain',(_,r)=>r.json({chain,height:chain.length-1,NST,consensus:'PoS-testnet'}));
app.get('/api/chain/blocks',(_,r)=>r.json({blocks:chain}));
app.post('/api/chain/tx',(req,res)=>{
  // Item 15: NÃO inventamos crypto, usamos SHA-256 padrão
  const tx = {...req.body,id:'tx_'+crypto.randomUUID().slice(0,8),ts:Date.now(),status:'pending'};
  const last = chain[chain.length-1];
  mine(last);
  res.json({tx,block:chain.length-1});
});
app.get('/api/chain/mainnet-gate',(_,r)=>r.json({
  status:'BLOCKED',
  reason:'Item 40 — Mainnet não é botão',
  requirements:[
    'testnet estável',
    'auditoria independente concluída',
    'consenso testado',
    'security testing aprovado',
    'disaster recovery validado',
    'documentação completa',
    'monitoração ativa',
    'procedimentos de emergência',
    'genesis final configurado',
    'infraestrutura de validadores'
  ]
}));
app.get('/api/health',(_,r)=>r.json({service:'chain',ok:true,height:chain.length-1}));
app.listen(process.env.PORT||3008,()=>console.log('chain :3008 (TESTNET)'));
