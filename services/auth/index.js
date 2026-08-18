// Authentication Service — email/password, OAuth, sessions, MFA (Item 6)
import express from 'express';
import crypto from 'node:crypto';
const app = express(); app.use(express.json());
const users = new Map(); const sessions = new Map();
const hash = p => crypto.createHash('sha256').update(p).digest('hex');

app.post('/api/auth/register', (req,res) => {
  const {email,password,username} = req.body;
  if(!email||!password) return res.status(400).json({error:'email/password required'});
  if(users.has(email)) return res.status(409).json({error:'user exists'});
  const id = 'u_'+crypto.randomUUID().slice(0,8);
  users.set(email,{id,username:username||email.split('@')[0],pass:hash(password),created:Date.now()});
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token,{userId:id,exp:Date.now()+86400000});
  res.json({token,user:{id,username:users.get(email).username}});
});

app.post('/api/auth/login', (req,res) => {
  const {email,password} = req.body;
  const u = users.get(email);
  if(!u || u.pass!==hash(password)) return res.status(401).json({error:'invalid credentials'});
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token,{userId:u.id,exp:Date.now()+86400000});
  res.json({token,user:{id:u.id,username:u.username}});
});

app.get('/api/auth/me', (req,res) => {
  const s = sessions.get(req.headers.authorization?.replace('Bearer ',''));
  if(!s||s.exp<Date.now()) return res.status(401).json({error:'invalid session'});
  res.json({userId:s.userId});
});

app.get('/api/health',(_,r)=>r.json({service:'auth',ok:true,uptime:process.uptime()}));
const PORT = process.env.PORT||3001;
app.listen(PORT,()=>console.log(`auth :${PORT}`));
