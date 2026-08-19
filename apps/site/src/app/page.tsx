import Link from 'next/link'

export default function Home() {
  return (
    <>
      <section className="hero">
        <span className="badge">TESTNET ATIVA · EM CONSTRUÇÃO</span>
        <h1>Infraestrutura global de vídeo <span>descentralizada</span></h1>
        <p>Plataforma de vídeo + rede P2P + armazenamento distribuído + blockchain nativa NST. Código aberto, engenharia transparente, sem promessas prematuras.</p>
        <div className="cta">
          <a href="https://github.com/Railancosta/nexastream" className="btn btn-primary" target="_blank" rel="noopener">Ver no GitHub</a>
          <Link href="/testnet/" className="btn btn-ghost">Ver testnet ao vivo</Link>
          <Link href="/architecture/" className="btn btn-ghost">Arquitetura</Link>
        </div>
      </section>

      <section>
        <div className="disclaimer">
          <strong>Transparência técnica:</strong> NexaStream é um projeto em estágio inicial. O que existe hoje é uma testnet local funcional (backend, P2P, blockchain, wallet, explorer). O que <u>não</u> existe ainda: mainnet, auditoria independente, escala global, milhões de usuários. Estamos construindo em público — cada componente só é considerado pronto após teste, medição, segurança e documentação (conforme o Developer Pitch Plan).
        </div>
      </section>

      <section>
        <h2 className="section-title">O que estamos construindo</h2>
        <p className="section-sub">Uma infraestrutura aberta e programável para vídeo, combinando cinco camadas em um único sistema coerente.</p>
        <div className="grid">
          <div className="card">
            <span className="icon">🎬</span>
            <h3>Video Platform</h3>
            <p>Uploads, transcoding multi-resolução, player, busca, feed personalizado, comentários, inscrições, estúdio do criador.</p>
            <span className="status status-done">testnet</span>
          </div>
          <div className="card">
            <span className="icon">🌐</span>
            <h3>P2P Network</h3>
            <p>Descoberta de peers, transferência de chunks, verificação de integridade SHA-256, sobrevivência a falha de peer.</p>
            <span className="status status-done">testnet</span>
          </div>
          <div className="card">
            <span className="icon">📦</span>
            <h3>Content Addressing</h3>
            <p>Identificação por hash, manifestos de chunks, deduplicação, verificação de integridade, distribuição.</p>
            <span className="status status-done">testnet</span>
          </div>
          <div className="card">
            <span className="icon">⛓️</span>
            <h3>Blockchain NST</h3>
            <p>Gênesis 55M NST, carteiras secp256k1, transações assinadas, PoW, explorer, economia do criador (1 NST/view válido).</p>
            <span className="status status-wip">testnet · sem auditoria</span>
          </div>
          <div className="card">
            <span className="icon">💰</span>
            <h3>Creator Economy</h3>
            <p>50/50 (criador/plataforma), reward por view válido, anti-fraud (rate limits, dedupe por viewer), analytics.</p>
            <span className="status status-wip">testnet</span>
          </div>
          <div className="card">
            <span className="icon">📡</span>
            <h3>Live Streaming</h3>
            <p>Ingest, segmentação HLS, chat, gravação LIVE→VOD, monetização ao vivo.</p>
            <span className="status status-planned">planejado</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Princípios de engenharia</h2>
        <p className="section-sub">Regras não-negociáveis que guiam cada commit.</p>
        <div className="grid">
          <div className="card">
            <h3>🔬 Build first, validate after</h3>
            <p>Um feature só existe quando funciona em ambiente real, tem testes, métricas, logs, documentação e rollback.</p>
          </div>
          <div className="card">
            <h3>🔐 Criptografia madura</h3>
            <p>Nunca inventamos primitivas criptográficas. Usamos SHA-256, HMAC, scrypt, secp256k1 — padrões auditados pela comunidade.</p>
          </div>
          <div className="card">
            <h3>📏 Escala progressiva</h3>
            <p>10 → 100 → 1.000 → 10.000 → ... → global. Cada degrau é validado antes do próximo. Nunca prometemos escala sem teste.</p>
          </div>
          <div className="card">
            <h3>🚫 Sem alegações falsas</h3>
            <p>Nunca dizemos "descentralizado", "seguro" ou "escalável" sem evidência técnica mensurável.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Token NST</h2>
        <p className="section-sub">Infraestrutura econômica, não marketing.</p>
        <div className="grid">
          <div className="card">
            <h3>Ticker</h3>
            <p style={{fontSize:'2rem',fontWeight:700,color:'var(--accent)'}}>NST</p>
          </div>
          <div className="card">
            <h3>Supply máximo</h3>
            <p style={{fontSize:'2rem',fontWeight:700}}>55.000.000</p>
          </div>
          <div className="card">
            <h3>Uso previsto</h3>
            <p>Rewards · pagamentos · incentivos de infraestrutura · governança DAO · storage · validadores · ativos digitais.</p>
          </div>
          <div className="card">
            <h3>Status</h3>
            <p><span className="status status-wip">testnet</span> — sem mainnet, sem auditoria, sem listagem. NÃO é garantia de ganho.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Para desenvolvedores</h2>
        <p className="section-sub">Tudo é open source. Construa em cima.</p>
        <div className="grid">
          <div className="card">
            <h3>📖 Leia o plano</h3>
            <p>65 páginas detalhando arquitetura, roadmap, riscos, KPIs e princípios de engenharia.</p>
            <a href="/pitch.pdf" style={{display:'inline-block',marginTop:'0.75rem'}}>Baixar PDF →</a>
          </div>
          <div className="card">
            <h3>🔌 API pública</h3>
            <p>Endpoints REST documentados para auth, vídeos, busca, blockchain, wallet e explorer.</p>
            <Link href="/api/" style={{display:'inline-block',marginTop:'0.75rem'}}>Ver docs →</Link>
          </div>
          <div className="card">
            <h3>💻 Contribua</h3>
            <p>Clone, rode localmente, abra issues, envie PRs. Tudo auditável.</p>
            <a href="https://github.com/Railancosta/nexastream" target="_blank" rel="noopener" style={{display:'inline-block',marginTop:'0.75rem'}}>GitHub →</a>
          </div>
        </div>
      </section>
    </>
  )
}
