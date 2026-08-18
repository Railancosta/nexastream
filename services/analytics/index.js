// Analytics Service — KPIs, unit economics (Item 33), observability
import express from 'express';
const app = express(); app.use(express.json());
let total=0,completed=0,hours=0,unique=new Set();
app.post('/api/analytics/watch',(req,res)=>{
  total++; if(req.body.completed) completed++;
  hours += (req.body.seconds||0)/3600;
  unique.add(req.body.viewerId);
  res.json({ok:true});
});
app.get('/api/analytics/totals',(_,r)=>r.json({
  totalViews:total,completed,completionRate:total?(completed/total*100).toFixed(1)+'%':'0%',
  watchHours:hours.toFixed(2),uniqueViewers:unique.size,
  // Item 33 — unit economics
  revenuePerUser:'pending',costPerGB:'pending',p2pSavings:'pending'
}));
app.get('/api/health',(_,r)=>r.json({service:'analytics',ok:true}));
app.listen(process.env.PORT||3018,()=>console.log('analytics :3018'));
