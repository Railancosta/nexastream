export default function Architecture() {
  return (
    <section>
      <div className="container">
        <h1 style={{fontSize:'2.5rem',marginBottom:'1rem'}}>Arquitetura</h1>
        <p className="section-sub" style={{textAlign:'left',margin:'0 0 3rem'}}>Cinco camadas convergentes em um único sistema. Cada camada é um serviço modular independente.</p>

        <pre style={{marginBottom:'2rem'}}>
{`┌─────────────────────────────────────────────────────────┐
│  LAYER 1 — CLIENT APPLICATIONS                           │
│  Web (Next.js) · Android · PWA · Creator Studio          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WebRTC
┌────────────────────────▼────────────────────────────────┐
│  LAYER 2 — CORE SERVICES (modular, zero npm)             │
│  core:3002    auth JWT + upload + transcoding ffmpeg     │
│  social:3011  comments + subs + notifications            │
│  reco:3012    ranking + diversidade + personalização     │
│  content:3004 SHA-256 · chunks · integridade · dedup     │
│  monitor:3010 observability + métricas + health           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  LAYER 3 — P2P NETWORK                                   │
│  peer discovery (TCP) · chunk transfer · integridade     │
│  relay nodes · storage nodes · community nodes           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  LAYER 4 — BLOCKCHAIN NST (testnet)                      │
│  chain:3008   genesis 55M · secp256k1 · PoW · verify    │
│  explorer:3009 explorer + creator rewards (1 NST/view)   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  LAYER 5 — DISTRIBUTED STORAGE                           │
│  content addressing · replication · geographic dist.     │
│  integrity verification · failure recovery               │
└─────────────────────────────────────────────────────────┘`}
        </pre>

        <h2 className="section-title" style={{marginTop:'3rem'}}>Princípios arquiteturais</h2>
        <div className="grid">
          <div className="card">
            <h3>Modular</h3>
            <p>Cada serviço evolui independentemente. Falhas são contidas. Deploy é isolado.</p>
          </div>
          <div className="card">
            <h3>Zero dependências npm no backend</h3>
            <p>Apenas módulos nativos do Node.js (<code>node:http</code>, <code>node:crypto</code>, <code>node:sqlite</code>). Sem supply-chain risk.</p>
          </div>
          <div className="card">
            <h3>Observável por padrão</h3>
            <p>Todo serviço expõe <code>/health</code> e métricas. Nenhum roda sem monitoramento.</p>
          </div>
          <div className="card">
            <h3>Content-addressed</h3>
            <p>Vídeos são identificados pelo hash SHA-256 do conteúdo, não por ID arbitrário.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
