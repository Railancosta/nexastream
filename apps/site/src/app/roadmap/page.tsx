export default function Roadmap() {
  const phases = [
    { phase: 'Phase 0', title: 'Codebase Audit', status: 'done', items: ['Inventário completo', 'Mapa da arquitetura', 'Security review inicial', 'Identificação de dívidas técnicas'] },
    { phase: 'Phase 1', title: 'Foundation (MVP)', status: 'done', items: ['Backend + SQLite', 'Auth JWT', 'Canais + uploads', 'Transcoding ffmpeg', 'Player, busca, feed', 'Analytics básico'] },
    { phase: 'Phase 2', title: 'Creator Platform', status: 'wip', items: ['Creator Studio', 'Comentários + inscrições', 'Notificações', 'Monetização (1 NST/view)', 'Live streaming (planejado)'] },
    { phase: 'Phase 3', title: 'Decentralized Infra', status: 'done', items: ['P2P peer discovery', 'Chunk transfer com integridade', 'Content addressing', 'Replication básica', 'Node monitoring'] },
    { phase: 'Phase 4', title: 'Blockchain Testnet', status: 'wip', items: ['Genesis 55M NST', 'Carteiras secp256k1', 'Tx assinadas + PoW', 'Explorer + wallet', 'Sem auditoria ainda'] },
    { phase: 'Phase 5', title: 'Security', status: 'planned', items: ['Threat modeling', 'Code audit externo', 'Penetration testing', 'Disaster recovery', 'Backup recovery tests'] },
    { phase: 'Phase 6', title: 'Mainnet', status: 'planned', items: ['Só após: testnet estável, auditoria independente, security testing, DR validado. MAINNET IS NOT A BUTTON.'] },
    { phase: 'Phase 7', title: 'Global Scale', status: 'planned', items: ['Expansão geográfica', 'SDKs (JS, Python, Android)', 'Developer portal', 'DAO + governança', 'Enterprise services'] },
  ]
  return (
    <section>
      <div className="container">
        <h1 style={{fontSize:'2.5rem',marginBottom:'1rem'}}>Roadmap</h1>
        <p className="section-sub" style={{textAlign:'left',margin:'0 0 3rem'}}>Progresso real, não promessas. Status reflete o estado atual do código no GitHub.</p>
        <div className="grid">
          {phases.map(p => (
            <div key={p.phase} className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                <span style={{color:'var(--muted)',fontSize:'0.8rem'}}>{p.phase}</span>
                <span className={`status status-${p.status}`}>
                  {p.status === 'done' ? '✓ concluído' : p.status === 'wip' ? '⚡ em progresso' : '○ planejado'}
                </span>
              </div>
              <h3 style={{marginBottom:'0.5rem'}}>{p.title}</h3>
              <ul style={{listStyle:'none',fontSize:'0.85rem',color:'var(--muted)'}}>
                {p.items.map((it, i) => <li key={i} style={{padding:'0.15rem 0'}}>• {it}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="disclaimer" style={{marginTop:'3rem'}}>
          <strong>Nota importante:</strong> Mainnet NÃO é um botão. É uma decisão operacional de alto risco. Só será ativada após auditorias independentes, testes de consenso, validação de disaster recovery e monitoramento completo. Qualquer alegação contrária é falsa.
        </div>
      </div>
    </section>
  )
}
