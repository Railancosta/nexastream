export default function Testnet() {
  return (
    <section>
      <div className="container">
        <h1 style={{fontSize:'2.5rem',marginBottom:'1rem'}}>Testnet Status</h1>
        <p className="section-sub" style={{textAlign:'left',margin:'0 0 3rem'}}>Visão transparente do que está rodando agora. Estes são os serviços reais implementados no repositório.</p>

        <h2 style={{fontSize:'1.5rem',marginBottom:'1rem'}}>Serviços ativos</h2>
        <table>
          <thead>
            <tr><th>Serviço</th><th>Porta</th><th>Função</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td><code>core</code></td><td>3002</td><td>Auth JWT + upload + transcoding ffmpeg</td><td><span className="status status-done">✓</span></td></tr>
            <tr><td><code>content</code></td><td>3004</td><td>Content addressing SHA-256 + chunks</td><td><span className="status status-done">✓</span></td></tr>
            <tr><td><code>p2p</code></td><td>3005+</td><td>Peer discovery + chunk transfer + integridade</td><td><span className="status status-done">✓</span></td></tr>
            <tr><td><code>chain</code></td><td>3008</td><td>Blockchain NST (genesis, wallets, PoW)</td><td><span className="status status-wip">testnet</span></td></tr>
            <tr><td><code>explorer</code></td><td>3009</td><td>Explorer + creator rewards</td><td><span className="status status-wip">testnet</span></td></tr>
            <tr><td><code>monitor</code></td><td>3010</td><td>Observability + métricas</td><td><span className="status status-done">✓</span></td></tr>
            <tr><td><code>social</code></td><td>3011</td><td>Comentários + inscrições + notificações</td><td><span className="status status-done">✓</span></td></tr>
            <tr><td><code>reco</code></td><td>3012</td><td>Feed personalizado + diversidade</td><td><span className="status status-done">✓</span></td></tr>
            <tr><td><code>web</code></td><td>3000</td><td>Plataforma (Next.js)</td><td><span className="status status-done">✓</span></td></tr>
            <tr><td><code>site</code></td><td>3001</td><td>Portal público (este site)</td><td><span className="status status-done">✓</span></td></tr>
          </tbody>
        </table>

        <h2 style={{fontSize:'1.5rem',margin:'2rem 0 1rem'}}>Métricas conhecidas</h2>
        <div className="grid">
          <div className="card"><h3>Load test (API)</h3><p>100 req · 100% ok · 15ms médio · 66 rps (celular ARM64)</p></div>
          <div className="card"><h3>P2P</h3><p>Peer discovery TCP · integridade SHA-256 · sobrevivência a falha de peer testada</p></div>
          <div className="card"><h3>Blockchain</h3><p>Genesis 55M NST · blocos minerados · verify chain retorna <code>valid:true</code></p></div>
          <div className="card"><h3>Zero npm no backend</h3><p>Backend 100% módulos nativos do Node.js. Sem node-gyp, sem supply-chain risk.</p></div>
        </div>

        <h2 style={{fontSize:'1.5rem',margin:'2rem 0 1rem'}}>Como rodar localmente</h2>
        <pre>{`git clone https://github.com/Railancosta/nexastream
cd nexastream
# Terminal 1: core
cd services/core && node server.js
# Terminal 2: chain + explorer
cd services/chain && node server.js & node explorer.js
# Terminal 3: monitor
cd services/monitor && node server.js
# Terminal 4: web
cd apps/web && npm run dev
# Terminal 5: site (este portal)
cd apps/site && npm run dev`}</pre>

        <div className="disclaimer" style={{marginTop:'2rem'}}>
          <strong>Limitações conhecidas:</strong> testnet local, sem auditoria, sem escala global, sem mainnet. A blockchain NST atual NÃO é production-ready. NÃO compre NST baseado em promessas — ela ainda não existe como ativo real.
        </div>
      </div>
    </section>
  )
}
