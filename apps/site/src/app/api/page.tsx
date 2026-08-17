export default function Api() {
  const endpoints = [
    { cat: 'Core', port: 3002, list: [
      ['POST', '/api/auth/register', 'Criar conta'],
      ['POST', '/api/auth/login', 'Login com email+senha'],
      ['GET',  '/api/health', 'Health check'],
      ['PUT',  '/api/videos/upload?title=...', 'Upload de vídeo'],
      ['GET',  '/api/videos', 'Lista de vídeos prontos'],
      ['GET',  '/api/videos/:id', 'Detalhes do vídeo'],
      ['GET',  '/api/search?q=...', 'Busca'],
      ['GET',  '/storage/*', 'Streaming de vídeo/thumb'],
    ]},
    { cat: 'Social', port: 3011, list: [
      ['POST', '/api/social/comment', 'Publicar comentário'],
      ['GET',  '/api/social/comments?videoId=', 'Listar comentários'],
      ['POST', '/api/social/subscribe', 'Inscrever-se em canal'],
      ['GET',  '/api/social/notifications?to=', 'Notificações do usuário'],
    ]},
    { cat: 'Recomendação', port: 3012, list: [
      ['GET', '/api/reco/feed?user=', 'Feed personalizado com score'],
    ]},
    { cat: 'Content Addressing', port: 3004, list: [
      ['POST', '/api/content/index/:id', 'Gerar manifest + content ID'],
      ['GET',  '/api/content/:id', 'Manifest completo'],
      ['GET',  '/api/content/verify/:id', 'Verificar integridade'],
      ['GET',  '/api/content/:id/chunks/:n', 'Baixar chunk N'],
    ]},
    { cat: 'Blockchain', port: 3008, list: [
      ['POST', '/api/chain/wallet', 'Criar carteira secp256k1'],
      ['POST', '/api/chain/tx', 'Enviar transação assinada'],
      ['POST', '/api/chain/mine', 'Minerar bloco (testnet)'],
      ['GET',  '/api/chain', 'Últimos blocos'],
      ['GET',  '/api/chain/verify', 'Verificar toda a chain'],
      ['GET',  '/api/chain/balances', 'Saldos NST'],
    ]},
    { cat: 'Explorer', port: 3009, list: [
      ['GET',  '/api/explorer', 'Blocos recentes'],
      ['POST', '/api/explorer/bind', 'Vincular carteira a username'],
      ['POST', '/api/explorer/reward', 'Recompensar criador (1 NST)'],
    ]},
    { cat: 'Observability', port: 3010, list: [
      ['GET', '/api/metrics', 'Métricas ao vivo de todos os serviços'],
      ['GET', '/api/metrics/history', 'Histórico das últimas 40 coletas'],
    ]},
  ]
  return (
    <section>
      <div className="container">
        <h1 style={{fontSize:'2.5rem',marginBottom:'1rem'}}>API</h1>
        <p className="section-sub" style={{textAlign:'left',margin:'0 0 3rem'}}>Endpoints REST da testnet. Sujeitos a mudanças antes da mainnet. Construa integrações por sua conta e risco.</p>
        {endpoints.map(cat => (
          <div key={cat.cat} style={{marginBottom:'2.5rem'}}>
            <h2 style={{fontSize:'1.3rem',marginBottom:'0.5rem'}}>
              {cat.cat} <code style={{fontSize:'0.8rem',color:'var(--muted)'}}>: {cat.port}</code>
            </h2>
            <table>
              <thead><tr><th>Método</th><th>Endpoint</th><th>Descrição</th></tr></thead>
              <tbody>
                {cat.list.map(([m, e, d], i) => (
                  <tr key={i}>
                    <td><code style={{color: m==='GET'?'#22c55e':m==='POST'?'#3b82f6':'#f59e0b'}}>{m}</code></td>
                    <td><code>{e}</code></td>
                    <td style={{color:'var(--muted)'}}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <h2 style={{fontSize:'1.5rem',margin:'2rem 0 1rem'}}>Autenticação</h2>
        <p style={{color:'var(--muted)',marginBottom:'1rem'}}>Rotas protegidas usam JWT HS256. Envie no header:</p>
        <pre>{`Authorization: Bearer eyJhbGciOiJIUzI1NiIs...`}</pre>
        <h2 style={{fontSize:'1.5rem',margin:'2rem 0 1rem'}}>SDKs</h2>
        <p style={{color:'var(--muted)'}}>Planejados (Fase 7): JavaScript/TypeScript, Python, Android. Hoje: consuma a API REST diretamente.</p>
      </div>
    </section>
  )
}
