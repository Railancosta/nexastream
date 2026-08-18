// Live Streaming — ingest, transcode, segment, distribute, chat, replay (Item 8)
import express from 'express';
const app = express(); app.use(express.json());
const streams = new Map();
app.post('/api/live/start',(req,res)=>{
  const id='l_'+Math.random().toString(36).slice(2,8);
  streams.set(id,{id,title:req.body.title,viewers:0,started:Date.now(),status:'live'});
  res.json({streamId:id,ingest:'rtmp://localhost:1935/live/'+id});
});
app.post('/api/live/end',(req,res)=>{
  const s=streams.get(req.body.id); if(s){s.status='vod';s.ended=Date.now()}
  res.json({ok:true});
});
app.get('/api/live/streams',(_,r)=>r.json({streams:[...streams.values()].filter(s=>s.status==='live')}));
app.get('/api/health',(_,r)=>r.json({service:'live',ok:true}));
app.listen(process.env.PORT||3013,()=>console.log('live :3013'));
