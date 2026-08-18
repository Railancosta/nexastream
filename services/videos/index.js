// Video Service — uploads, metadata, transcoding, thumbnails, publishing (Itens 6-7)
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
const app = express(); app.use(express.json()); app.use(express.raw({type:'video/*',limit:'500mb'}));
const videos = new Map();

// Pipeline Item 7: upload → validate → scan → metadata → transcode → thumbnails → content ID → storage → distribute
app.put('/api/videos/upload', async (req,res) => {
  const title = req.query.title || 'untitled';
  const id = 'v_'+crypto.randomUUID().slice(0,8);
  const sha = crypto.createHash('sha256').update(req.body).digest('hex');
  videos.set(id,{
    id,title,
    contentId:sha,                    // Item 10 — content addressing
    size:req.body.length,
    chunks:Math.ceil(req.body.length/(256*1024)),
    resolutions:['144p','240p','360p','480p','720p','1080p'],
    status:'transcoding',
    views:0,created:Date.now()
  });
  // dispara pipeline assíncrona (mock)
  setTimeout(()=>videos.get(id).status='ready',1500);
  res.json({videoId:id,contentId:sha,pipeline:'started'});
});

app.get('/api/videos',(_,r)=>r.json({videos:[...videos.values()]}));
app.get('/api/videos/:id',(req,r)=>r.json(videos.get(req.params.id)||{error:'not found'}));
app.get('/api/health',(_,r)=>r.json({service:'videos',ok:true,count:videos.size}));
app.listen(process.env.PORT||3002,()=>console.log('videos :3002'));
