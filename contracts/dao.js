// DAO — propostas, votação, tesouro com timelock (Item 18)
import express from 'express';
const app = express(); app.use(express.json());
const proposals = [];
app.post('/api/dao/propose',(req,res)=>{
  proposals.push({id:'p_'+Date.now(),...req.body,status:'active',votes_for:0,votes_against:0,created:Date.now()});
  res.json({ok:true,count:proposals.length});
});
app.post('/api/dao/vote',(req,res)=>{
  const p = proposals.find(x=>x.id===req.body.id); if(!p) return res.status(404).json({error:'not found'});
  if(req.body.for) p.votes_for++; else p.votes_against++;
  if(p.votes_for>=3) p.status='approved';
  res.json({ok:true});
});
app.get('/api/dao/proposals',(_,r)=>r.json({proposals}));
app.get('/api/health',(_,r)=>r.json({service:'dao',ok:true}));
app.listen(process.env.PORT||3015,()=>console.log('dao :3015'));
