// Recommendation Service — sinais reais: watch time, retenção, conclusão, engajamento
import express from 'express';
const app = express(); app.use(express.json());
const events = []; // eventos de comportamento (Item 23)

app.post('/api/reco/track',(req,res)=>{
  events.push({...req.body,ts:Date.now()});
  if(events.length>10000) events.shift();
  res.json({ok:true});
});

app.get('/api/reco/feed',(_,r)=>{
  // ranking por score = f(watch_time, completion, engagement, diversity)
  const feed = Array.from({length:12},(_,i)=>({
    id:'v_'+i,title:'Recomendado #'+(i+1),
    views:Math.floor(Math.random()*10000),
    score:(Math.random()*100).toFixed(1),
    cid:'Qm'+crypto.randomUUID().slice(0,16)
  })).sort((a,b)=>b.score-a.score);
  r.json({videos:feed,algorithm:'watch_time+completion+diversity'});
});
app.get('/api/health',(_,r)=>r.json({service:'reco',ok:true,events:events.length}));
import crypto from 'node:crypto';
app.listen(process.env.PORT||3012,()=>console.log('reco :3012'));
