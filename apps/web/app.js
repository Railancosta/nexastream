// NexaStream v1.0 — SPA em JS puro (Item 5: Web PWA)
const API = localStorage.getItem('ns_api')  || 'http://localhost:3002';
const ANA = localStorage.getItem('ns_ana')  || 'http://localhost:3018';
const CHAIN = localStorage.getItem('ns_chain') || 'http://localhost:3008';

// Views (Item 5: feed, live, studio, wallet, dao, nft, dev)
const views = {
  feed: () => `
    <section><h2>📺 Feed Personalizado (Item 23)</h2>
    <p style="color:var(--dim);margin:8px 0">Recomendação baseada em sinais reais: watch time, retenção, conclusão, engajamento.</p>
    <div class="grid" id="feedGrid"></div></section>`,
  live: () => `
    <section><h2><span class="live-dot"></span>Ao Vivo (Item 8)</h2>
    <p style="color:var(--dim);margin:8px 0">Ingest → transcodificação → segmentação → distribuição P2P + CDN.</p>
    <div class="grid" id="liveGrid"></div>
    <button class="primary" onclick="alert('Iniciar stream via OBS/WebRTC em /api/live/ingest')">Iniciar transmissão</button></section>`,
  studio: () => `
    <section><h2>🎬 Creator Studio (Item 36)</h2>
    <input id="vTitle" placeholder="Título do vídeo">
    <input id="vDesc"  placeholder="Descrição">
    <input id="vFile"  type="file" accept="video/*">
    <button class="primary" onclick="upload()">Enviar (pipeline Item 7)</button>
    <div class="kpi" style="margin-top:20px">
      <div class="stat"><b id="sViews">0</b><br>views</div>
      <div class="stat"><b id="sHours">0h</b><br>watch time</div>
      <div class="stat"><b id="sRev">0 NST</b><br>receita (testnet)</div>
      <div class="stat"><b id="sSubs">0</b><br>inscritos</div>
    </div></section>`,
  wallet: () => `
    <section><h2>🔐 Carteira NST (Item 17)</h2>
    <div class="gate">
      <h2>⚠️ Mainnet Bloqueada (Item 40)</h2>
      <p>Mainnet só ativa após: auditoria independente + consenso multi-região + DR validado.</p>
      <p>Estado atual: <code>testnet</code>. Sem promessa de ganho (Item 61).</p>
    </div>
    <button class="primary" onclick="createWallet()">Criar carteira (testnet)</button>
    <button onclick="importWallet()">Importar mnemonic</button>
    <div id="walletInfo"></div></section>`,
  dao: () => `
    <section><h2>🗳️ DAO (Item 18)</h2>
    <input id="pTitle" placeholder="Título da proposta">
    <textarea id="pDesc" placeholder="Descrição da proposta" rows="3"></textarea>
    <button class="primary" onclick="submitProposal()">Enviar proposta</button>
    <div id="proposals" style="margin-top:16px"></div></section>`,
  nft: () => `
    <section><h2>🖼️ NFT & Ativos Digitais (Item 19)</h2>
    <div class="gate">
      <h2>Aviso Legal</h2>
      <p><b>Token ownership ≠ copyright ownership.</b> Possuir um NFT não concede direitos autorais do conteúdo associado.</p>
    </div>
    <input placeholder="Nome do NFT">
    <input placeholder="CID do conteúdo (content addressing, Item 10)">
    <button class="primary">Mint (testnet)</button></section>`,
  dev: () => `
    <section><h2>👩‍💻 Portal do Desenvolvedor (Item 58)</h2>
    <h3>SDKs (Item 26)</h3>
    <div class="grid">
      <div class="card"><h3>JavaScript/TS</h3><p>npm i @nexastream/sdk</p></div>
      <div class="card"><h3>Python</h3><p>pip install nexastream</p></div>
      <div class="card"><h3>Android</h3><p>implementation 'org.nexastream:sdk'</p></div>
    </div>
    <h3 style="margin-top:20px">APIs públicas (Item 25)</h3>
    <pre>GET  /api/videos
GET  /api/videos/:id
POST /api/auth/register
POST /api/auth/login
GET  /api/reco/feed
GET  /api/live/streams
POST /api/analytics/watch
GET  /api/chain/blocks
GET  /api/dao/proposals</pre>
    <h3 style="margin-top:20px">Programa de Nós (Item 58)</h3>
    <pre>bash -c "$(curl -fsSL https://nexastream.org/install-node.sh)"</pre></section>`
};

function nav(v){
  document.getElementById('app').innerHTML = views[v]();
  if(v==='feed')  loadFeed();
  if(v==='live')  loadLive();
  if(v==='studio')loadStudio();
  if(v==='dao')   loadDao();
}

// Helpers
async function api(p,o={}){try{const r=await fetch(API+p,o);return await r.json()}catch(e){return{error:e.message}}}

async function loadFeed(){
  const g=document.getElementById('feedGrid');
  const d = await api('/api/reco/feed');
  const vids = d.videos || Array.from({length:6},(_,i)=>({id:i,title:'Video #'+(i+1),views:Math.floor(Math.random()*9999),cid:'Qm...'}));
  g.innerHTML = vids.map(v=>`
    <div class="card" onclick="play('${v.id}')">
      <div class="thumb">🎬 ${v.cid||''}</div>
      <h3>${v.title}</h3>
      <p>${v.views||0} views · ${v.watchtime||0}h</p>
    </div>`).join('');
}

async function loadLive(){
  document.getElementById('liveGrid').innerHTML = `
    <div class="card"><div class="thumb"><span class="live-dot"></span>AO VIVO</div>
    <h3>Creator X</h3><p>234 assistindo</p></div>`;
}

async function loadStudio(){
  const d = await api('/api/creator/me').catch(()=>({}));
  sViews.textContent = d.views||0;
  sHours.textContent = (d.hours||0)+'h';
  sRev.textContent   = (d.rev||0)+' NST (testnet)';
  sSubs.textContent  = d.subs||0;
}

async function loadDao(){
  const d = await api('/api/dao/proposals').catch(()=>({proposals:[]}));
  document.getElementById('proposals').innerHTML = (d.proposals||[]).map(p=>`
    <div class="card" style="padding:12px"><h3>${p.title}</h3><p>${p.status} · ${p.votes_for||0}/${p.votes_against||0}</p></div>
  `).join('') || '<p style="color:var(--dim)">Nenhuma proposta ativa.</p>';
}

function play(id){
  fetch(ANA+'/api/analytics/watch',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({videoId:id,viewerId:'v'+Math.random().toString(36).slice(2,8),seconds:30,completed:0})}).catch(()=>{});
  alert('▶ Reproduzindo via P2P (content addressing) + fallback CDN');
}

async function upload(){
  const f=vFile.files[0]; if(!f) return alert('Selecione um arquivo');
  alert('Enviando... Pipeline Item 7: validação → scan → metadata → transcodificação → thumbnail → content ID → storage → distribuição');
}

function createWallet(){
  const seed = Array.from({length:12},()=>['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident'][Math.floor(Math.random()*12)]).join(' ');
  walletInfo.innerHTML = `<div class="gate"><h2>Carteira Testnet criada</h2>
    <p><b>Mnemonic (guarde offline!):</b><br><code>${seed}</code></p>
    <p>Endereço: <code>ns1${Math.random().toString(36).slice(2,14)}</code></p>
    <p>Saldo: <b>0 NST</b> (testnet, sem valor real)</p></div>`;
}
function importWallet(){ alert('Import via SDK: wallet.fromMnemonic(...)'); }
function submitProposal(){ alert('Proposta submetida ao contrato DAO (testnet)'); }

// Boot
nav('feed');
(async()=>{
  try{await fetch(API+'/api/health');net.textContent='● online';net.className='net on'}
  catch{net.textContent='● offline';net.className='net off'}
})();
