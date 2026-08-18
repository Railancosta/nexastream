// NFT — Item 19: Token ownership ≠ copyright ownership
import express from 'express';
const app = express(); app.use(express.json());
const nfts = [];
app.post('/api/nft/mint',(req,res)=>{
  nfts.push({id:'nft_'+Date.now(),owner:req.body.owner,cid:req.body.cid,
    metadata:req.body.metadata,copyright_notice:'Token ownership ≠ copyright ownership'});
  res.json({ok:true});
});
app.get('/api/nft/market',(_,r)=>r.json({nfts}));
app.get('/api/health',(_,r)=>r.json({service:'nft',ok:true}));
app.listen(process.env.PORT||3016,()=>console.log('nft :3016'));
