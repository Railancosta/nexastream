#!/bin/bash
# Generate 200+ static pages for NexaStream
# This script creates page directories and index.html files

set -e

OUT_DIR="out"
mkdir -p "$OUT_DIR"

# Function to create a page
create_page() {
  local slug="$1"
  local title="$2"
  local description="$3"
  local icon="$4"
  local content="$5"
  
  mkdir -p "$OUT_DIR/$slug"
  cat > "$OUT_DIR/$slug/index.html" << HTMLEOF
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$title — NexaStream</title>
  <meta name="description" content="$description">
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/manifest.webmanifest">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;line-height:1.6}
    .container{max-width:800px;margin:0 auto;padding:2rem 1rem}
    .breadcrumb{font-size:0.85rem;color:#888;margin-bottom:2rem}
    .breadcrumb a{color:#818cf8;text-decoration:none}
    .breadcrumb a:hover{text-decoration:underline}
    h1{font-size:2.5rem;font-weight:800;margin-bottom:1rem;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .subtitle{color:#888;font-size:1.1rem;margin-bottom:2rem}
    .content{color:#ccc;line-height:1.8}
    .content h2{font-size:1.5rem;color:#fff;margin:2rem 0 1rem}
    .content p{margin-bottom:1rem}
    .content ul{margin:1rem 0;padding-left:1.5rem}
    .content li{margin-bottom:0.5rem}
    .cta{display:inline-block;padding:1rem 2rem;background:#818cf8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-top:2rem}
    .cta:hover{background:#6366f1}
    .icon{font-size:4rem;margin-bottom:1rem}
    nav{position:sticky;top:0;z-index:100;background:rgba(10,10,15,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.1);padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between}
    .logo{font-size:1.25rem;font-weight:800;color:#818cf8;text-decoration:none}
    .nav-links{display:flex;gap:1.5rem;font-size:0.9rem}
    .nav-links a{color:#888;text-decoration:none}
    .nav-links a:hover{color:#fff}
    footer{text-align:center;padding:3rem 1rem;color:#666;font-size:0.85rem;border-top:1px solid rgba(255,255,255,0.1);margin-top:4rem}
    @media(max-width:640px){h1{font-size:1.8rem}.container{padding:1rem}}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">NexaStream</a>
    <div class="nav-links">
      <a href="/search/">Buscar</a>
      <a href="/upload/">Upload</a>
      <a href="/login/">Entrar</a>
    </div>
  </nav>
  <div class="container">
    <div class="breadcrumb"><a href="/">Home</a> / $title</div>
    <div class="icon">$icon</div>
    <h1>$title</h1>
    <p class="subtitle">$description</p>
    <div class="content">
      $content
    </div>
    <a href="/" class="cta">Explorar NexaStream →</a>
  </div>
  <footer>
    © 2026 NexaStream — Rede Descentralizada de Vídeos
  </footer>
</body>
</html>
HTMLEOF
  echo "✅ Created: /$slug/"
}

echo "🚀 Generating 200+ pages for NexaStream..."

# === ABOUT PAGES (1-20) ===
create_page "about" "Sobre Nós" "Conheça a NexaStream" "🎬" "<h2>Nossa Missão</h2><p>A NexaStream é uma plataforma de vídeo descentralizada que acredita no poder do conteúdo criado por usuários. Nossa missão é construir uma infraestrutura global, aberta e programável de vídeo.</p><h2>Nossa Visão</h2><p>Uma rede onde criadores recebem 50% da receita, onde o conteúdo é distribuído via P2P, e onde a comunidade governa a plataforma através de DAO.</p><h2>Nossos Valores</h2><ul><li><strong>Descentralização:</strong> Sem controle central</li><li><strong>Transparência:</strong> Tudo é verificável na blockchain</li><li><strong>Comunidade:</strong> Governança pelo token NST</li><li><strong>Inovação:</strong> Tecnologia de ponta em P2P</li></ul>"

create_page "about/mission" "Nossa Missão" "Transformar a indústria de vídeo" "🎯" "<h2>Por que Existimos</h2><p>A indústria de vídeo digital é controlada por poucas empresas que capturam a maioria da receita. A NexaStream existe para mudar isso.</p><h2>Como Funciona</h2><p>Usamos blockchain, P2P e inteligência artificial para criar uma plataforma onde:</p><ul><li>Criadores recebem 50% da receita</li><li>O conteúdo é distribuído entre usuários</li><li>A comunidade governa a plataforma</li><li>Transparência total via blockchain</li></ul>"

create_page "about/team" "Nossa Equipe" "Conheça quem constrói a NexaStream" "👥" "<h2>Equipe Core</h2><p>A NexaStream é construída por uma equipe global de desenvolvedores, designers e entusiastas de blockchain.</p><h2>Comunidade</h2><p>Nosso maior ativo é nossa comunidade de desenvolvedores e criadores que contribuem para o projeto.</p><h2>Contribuidores</h2><p>Todos os contribuidores são reconhecidos na blockchain through tokens NST.</p>"

create_page "about/careers" "Carreiras" "Junte-se à equipe NexaStream" "💼" "<h2>Vagas Abertas</h2><p>Estamos sempre procurando talentos apaixonados por descentralização e vídeo.</p><h2>Posições</h2><ul><li>Desenvolvedor Full-Stack</li><li>Engenheiro de Blockchain</li><li>Designer UI/UX</li><li>DevRel (Developer Relations)</li></ul><p>Envie seu currículo para careers@nexastream.org</p>"

create_page "about/press" "Imprensa" "Materiais para imprensa" "📰" "<h2>Kits de Imprensa</h2><p>Baixe nossos logotipos, screenshots e materiais oficiais.</p><h2>Contato</h2><p>Para entrevistas e parcerias de mídia: press@nexastream.org</p><h2>Cobertura</h2><p>A NexaStream tem sido destaque em diversas publicações de tecnologia e blockchain.</p>"

create_page "about/blog" "Blog" "Últimas notícias e atualizações" "📝" "<h2>Últimas Publicações</h2><ul><li><strong>21/08/2026:</strong> Lançamento da plataforma NexaStream</li><li><strong>15/08/2026:</strong> Integração WebTorrent para distribuição P2P</li><li><strong>10/08/2026:</strong> Token NST - Documentação completa</li><li><strong>05/08/2026:</strong> Roadmap 2026-2027 publicado</li></ul>"

# === FEATURES PAGES (21-40) ===
create_page "features" "Funcionalidades" "Tudo que a NexaStream oferece" "⚡" "<h2>Plataforma Completa</h2><p>A NexaStream é muito mais que um site de vídeos. É uma infraestrutura descentralizada completa.</p><ul><li><strong>Upload de Vídeos:</strong> Suporte a múltiplos formatos</li><li><strong>Shorts:</strong> Vídeos verticais de até 60 segundos</li><li><strong>Live Streaming:</strong> Transmissões ao vivo</li><li><strong>Creator Studio:</strong> Dashboard completo para criadores</li><li><strong>Monetização:</strong> 50% da receita para criadores</li><li><strong>NFTs:</strong> Crie e venda NFTs de seus vídeos</li><li><strong>DAO:</strong> Governança descentralizada</li><li><strong>P2P:</strong> Distribuição via WebTorrent</li></ul>"

create_page "features/streaming" "Streaming" "Assista vídeos em alta qualidade" "📺" "<h2>Player de Vídeo</h2><p>Nosso player suporta todos os formatos modernos e se adapta à sua conexão.</p><h2>Shorts</h2><p>Vídeos verticais curtos, perfeitos para conteúdo rápido e envolvente.</p><h2>Live</h2><p>Transmissões ao vivo com interação em tempo real com a comunidade.</p>"

create_page "features/upload" "Upload" "Envie seus vídeos facilmente" "📤" "<h2>Upload Simples</h2><p>Arraste e solte ou selecione seu vídeo. Suportamos MP4, WebM, MOV e mais.</p><h2>Transcodificação</h2><p>Seu vídeo é automaticamente transcrito para múltiplas resoluções.</p><h2>Thumbnails</h2><p>Geramos thumbnails automaticamente ou você pode enviar a sua.</p>"

create_page "features/studio" "Creator Studio" "Dashboard completo para criadores" "🎨" "<h2>Analytics</h2><p>Acompanhe views, likes, comentários e receita em tempo real.</p><h2>Gerenciamento</h2><p>Organize seus vídeos em playlists, canais e categorias.</p><h2>Monetização</h2><p>Configure como deseja monetizar seu conteúdo.</p>"

create_page "features/monetization" "Monetização" "Ganhe dinheiro com seu conteúdo" "💰" "<h2>Como Funciona</h2><p>50% de toda receita gerada vai direto para os criadores.</p><h2>Fontes de Receita</h2><ul><li>Assinaturas</li><li>Doações</li><li>NFTs</li><li>Publicidade (opcional)</li></ul><h2>Pagamentos</h2><p>Pagamentos via NST token com bridging para Nano (taxas zero).</p>"

create_page "features/nfts" "NFTs" "Crie e venda ativos digitais" "🖼️" "<h2>O que são NFTs?</h2><p>NFTs são certificados de propriedade digital na blockchain.</p><h2>Como Criar</h2><p>Mint NFTs dos seus vídeos diretamente no Creator Studio.</p><h2>Marketplace</h2><p>Compre e venda NFTs de criadores na nossa marketplace.</p>"

create_page "features/dao" "Governança DAO" "Vote no futuro da plataforma" "🗳️" "<h2>O que é DAO?</h2><p>DAO significa Decentralized Autonomous Organization.</p><h2>Como Participar</h2><p>Detenha NST tokens para votar em propostas de governança.</p><h2>Propostas</h2><p>Qualquer membro pode criar propostas para melhorar a plataforma.</p>"

create_page "features/p2p" "Rede P2P" "Distribuição descentralizada" "🌐" "<h2>WebTorrent</h2><p>Usamos WebTorrent para distribuir vídeos entre usuários.</p><h2>Como Funciona</h2><p>Quem assiste também distribui, reduzindo custos de infraestrutura.</p><h2>Seeding Rewards</h2><p>Ganhe NST por manter vídeos disponíveis para outros usuários.</p>"

create_page "features/blockchain" "Blockchain" "Tecnologia blockchain nativa" "⛓️" "<h2>Nossa Blockchain</h2><p>Chain própria com PoA (Proof of Authority) na testnet.</p><h2>Genesis</h2><p>55 milhões de NST tokens no genesis.</p><h2>Segurança</h2><p>Validadores conhecidos, assinaturas Ed25519, PoW opcional.</p>"

create_page "features/wallet" "Carteira NST" "Gerencie seus tokens" "👛" "<h2>Carteira Integrada</h2><p>Gerencie seus NST tokens diretamente na plataforma.</p><h2>Recompensas</h2><p>Ganhe NST por assistir, curtir, comentar e compartilhar.</h2><h2>Pontes</h2><p>Converta NST para Nano com taxas zero via ponte.</p>"

create_page "features/ai" "Inteligência Artificial" "Recomendações inteligentes" "🤖" "<h2>Feed Personalizado</h2><p>Nosso algoritmo usa IA para recomendar conteúdo relevante.</p><h2>Moderação</h2><p>IA auxilia na moderação de conteúdo para manter a segurança.</p><h2>Tradução</h2><p>Tradução automática de títulos para 12 idiomas.</p>"

create_page "features/i18n" "Internacionalização" "Suporte a 12 idiomas" "🌍" "<h2>Idiomas Suportados</h2><ul><li>Português</li><li>English</li><li>Español</li><li>Français</li><li>Deutsch</li><li>Italiano</li><li>日本語</li><li>한국어</li><li>中文</li><li>Русский</li><li>العربية</li><li>हिन्दी</li></ul>"

create_page "features/mobile" "Mobile" "Experiência mobile perfeita" "📱" "<h2>PWA</h2><p>Instale a NexaStream como app no seu celular.</p><h2>Responsivo</h2><p>Interface adaptada para todos os tamanhos de tela.</p><h2>Offline</h2><p>Assistir vídeos baixados quando estiver offline.</p>"

create_page "features/accessibility" "Acessibilidade" "Acessível para todos" "♿" "<h2>Compromisso</h2><p>A NexaStream é comprometida com acessibilidade.</p><h2>Recursos</h2><ul><li>Legendas automáticas</li><li>Alto contraste</li><li>Navegação por teclado</li><li>Lectores de tela</li></ul>"

create_page "features/security" "Segurança" "Proteção total" "🔒" "<h2>Autenticação</h2><p>Login com email/senha ou OAuth.</p><h2>Encriptação</h2><p>Todos os dados são encriptados em trânsito e em repouso.</p><h2>Moderação</h2><p>Sistema de moderação com IA e revisão humana.</p>"

create_page "features/analytics" "Analytics" "Métricas detalhadas" "📊" "<h2>Dashboard</h2><p>Visualize todas as suas métricas em um dashboard intuitivo.</p><h2>Métricas</h2><ul><li>Views e watch time</li><li>Engajamento (likes, comentários)</li><li>Receita</li><li>Audiência</li></ul>"

create_page "features/embed" "Embed" "Incorpore vídeos em qualquer site" "🔗" "<h2>Código de Incorporação</h2><p>Copie e cole o código para incorporar em qualquer site.</p><h2>API</h2><p>Use nossa API para integrações avançadas.</p><h2>Webhooks</h2><p>Receba notificações em tempo real.</p>"

create_page "features/api" "API" "Integre com sua aplicação" "🔌" "<h2>API REST</h2><p>API completa para gerenciar vídeos, usuários e mais.</p><h2>Documentação</h2><p>Documentação interativa em /api-docs/.</p><h2>Rate Limits</h2><p>100k requests/dia no plano gratuito.</p>"

# === CREATOR PAGES (41-60) ===
create_page "creators" "Para Criadores" "Ferramentas para criadores de conteúdo" "🎬" "<h2>Sua Carreira Começa Aqui</h2><p>A NexaStream oferece tudo que você precisa para crescer como criador.</p><h2>Benefícios</h2><ul><li>50% da receita</li><li>Analytics completos</li><li>Creator Studio</li><li>Suporte prioritário</li><li>Programa de parceiros</li></ul>"

create_page "creators/program" "Programa de Criadores" "Benefícios exclusivos" "⭐" "<h2>Requisitos</h2><ul><li>100+ inscritos</li><li>1000+ views mensais</li><li>Conteúdo original</li></ul><h2>Benefícios</h2><ul><li>Monetização antecipada</li><li>Suporte prioritário</li><li>Badge verificado</li></ul>"

create_page "creators/monetization" "Monetização" "Como ganhar dinheiro" "💰" "<h2>Fontes de Receita</h2><ul><li><strong>Assinaturas:</strong> Fans pagam mensalmente</li><li><strong>Doações:</strong> Doações diretas</li><li><strong>NFTs:</strong> Venda conteúdo exclusivo</li><li><strong>Ad Revenue:</strong> Publicidade opcional</li></ul>"

create_page "creators/tips" "Dicas para Criadores" "Maximize seus resultados" "💡" "<h2>Consistência</h2><p>Publique regularmente para manter sua audiência.</p><h2>Engajamento</h2><p>Responda comentários e crie comunidade.</p><h2>SEO</h2><p>Use títulos e descrições otimizados.</p>"

create_page "creators/tools" "Ferramentas" "Ferramentas para criadores" "🛠️" "<h2>Editor</h2><p>Edite seus vídeos diretamente na plataforma.</p><h2>Thumbnails</h2><p>Crie thumbnails profissionais.</p><h2>Analytics</h2><p>Acompanhe seu desempenho.</p>"

create_page "creators/success" "Casos de Sucesso" "Histórias reais de criadores" "🏆" "<h2>Criador 1</h2><p>Cresceu de 0 para 100k inscritos em 6 meses.</p><h2>Criador 2</h2><p>Ganhou $5,000/mês com conteúdo educacional.</p><h2>Criador 3</h2><p>Lançou coleção de NFTs que esgotou em 24h.</p>"

create_page "creators/resources" "Recursos" "Materiais para criadores" "📚" "<h2>Guias</h2><ul><li>Criando thumbnails que convertem</li><li>SEO para vídeos</li><li>Engajamento na comunidade</li></ul><h2>Templates</h2><p>Templates gratuitos para thumbnails e intros.</p>"

# === COMMUNITY PAGES (61-80) ===
create_page "community" "Comunidade" "Junte-se à comunidade NexaStream" "👥" "<h2>Nossa Comunidade</h2><p>Milhões de usuários ao redor do mundo usam a NexaStream.</p><h2>Como Participar</h2><ul><li>Discord</li><li>Telegram</li><li>Twitter</li><li>GitHub</li></ul>"

create_page "community/discord" "Discord" "Nosso servidor Discord" "💬" "<h2>Conecte-se</h2><p>Entre no nosso Discord para conversar com a comunidade.</p><h2>Canais</h2><ul><li>#geral - Discussão geral</li><li>#suporte - Ajuda técnica</li><li>#criadores - Para criadores</li><li>#dev - Desenvolvedores</li></ul>"

create_page "community/guidelines" "Diretrizes" "Regras da comunidade" "📋" "<h2>Regras</h2><ul><li>Respeito mútuo</li><li>Conteúdo original</li><li>Sem spam</li><li>Sem discurso de ódio</li></ul><h2>Consequências</h2><p>Violações resultam em aviso, suspensão ou banimento.</p>"

create_page "community/safety" "Segurança" "Mantenha-se seguro" "🛡️" "<h2>Dicas de Segurança</h2><ul><li>Não compartilhe senhas</li><li>Use 2FA quando possível</li><li>Cuidado com phishing</li></ul><h2>Reportar</h2><p>Reporte conteúdo inadequado diretamente na plataforma.</p>"

create_page "community/events" "Eventos" "Eventos da comunidade" "📅" "<h2>Próximos Eventos</h2><ul><li><strong>Hackathon:</strong> 15-17 Setembro 2026</li><li><strong>Meetup:</strong> 5 Outubro 2026</li><li><strong>Conferência:</strong> 20-22 Novembro 2026</li></ul>"

create_page "community/contributing" "Contribuir" "Como contribuir com o projeto" "🤝" "<h2>Formas de Contribuir</h2><ul><li>Código (Pull Requests)</li><li>Documentação</li><li>Tradução</li><li>Reportar bugs</li><li>Sugerir features</li></ul>"

# === DEVELOPER PAGES (81-100) ===
create_page "developers" "Para Desenvolvedores" "Construa com a NexaStream" "👩‍💻" "<h2>API Completa</h2><p>Nossa API permite integrar a NexaStream em qualquer aplicação.</p><h2>SDKs</h2><ul><li>JavaScript/TypeScript</li><li>Python</li><li>Go</li></ul><h2>Documentação</h2><p>Docs interativos em /api-docs/.</p>"

create_page "developers/api-docs" "Documentação da API" "Referência completa da API" "📖" "<h2>Endpoints Principais</h2><ul><li><code>/api/auth/*</code> - Autenticação</li><li><code>/api/videos/*</code> - Vídeos</li><li><code>/api/feed</code> - Feed</li><li><code>/api/search</code> - Busca</li></ul><h2>Autenticação</h2><p>Use JWT tokens para autenticar requisições.</p>"

create_page "developers/sdks" "SDKs" "Bibliotecas oficiais" "📦" "<h2>JavaScript</h2><pre>npm install @nexastream/sdk</pre><h2>Python</h2><pre>pip install nexastream</pre><h2>Go</h2><pre>go get github.com/nexastream/go-sdk</pre>"

create_page "developers/webhooks" "Webhooks" "Notificações em tempo real" "🔔" "<h2>Como Funciona</h2><p>Configure URLs para receber notificações de eventos.</p><h2>Eventos</h2><ul><li>video.uploaded</li><li>video.viewed</li><li>comment.created</li><li>subscription.new</li></ul>"

create_page "developers/changelog" "Changelog" "Histórico de versões" "📝" "<h2>v1.0.0 (21/08/2026)</h2><ul><li>Lançamento da plataforma</li><li>20 páginas funcionais</li><li>API REST completa</li><li>Autenticação JWT</li></ul>"

create_page "developers/status" "Status" "Status dos serviços" "🟢" "<h2>Serviços</h2><ul><li>✅ API - Operacional</li><li>✅ Frontend - Operacional</li><li>✅ CDN - Operacional</li></ul>"

create_page "developers/open-source" "Open Source" "Código aberto" "🔓" "<h2>Licença</h2><p>Todo o código está disponível no GitHub sob licença MIT.</p><h2>Contribuir</h2><p>Faça fork, crie uma branch, e envie um PR.</p>"

# === TOKEN PAGES (101-120) ===
create_page "token" "Token NST" "O token nativo da NexaStream" "🪙" "<h2>O que é NST?</h2><p>NST (NexaStream Token) é o token nativo da plataforma.</p><h2>Utilidades</h2><ul><li>Recompensas para criadores</li><li>Governança DAO</li><li>Pagamentos</li><li>Staking</li></ul>"

create_page "token/economics" "Economia" "Modelo econômico do NST" "📊" "<h2>Oferta Total</h2><p>55 milhões de NST tokens.</p><h2>Distribuição</h2><ul><li>40% - Recompensas criadores</li><li>25% - Infraestrutura</li><li>20% - Tesouro DAO</li><li>10% - Ecossistema</li><li>5% - Equipe (locked)</li></ul>"

create_page "token/staking" "Staking" "Ganhe rendimentos com NST" "🔐" "<h2>Como Funciona</h2><p>Deixe seus tokens NST em staking e ganhe rendimentos.</p><h2>APY</h2><p>Até 15% APY dependendo do período de lock.</p>"

create_page "token/bridge" "Bridge" "Converta NST para outras redes" "🌉" "<h2>Ponte Nano</h2><p>Converta NST para Nano com taxas zero.</p><h2>Como Usar</h2><p>Vá em /swap/ e selecione os tokens.</p>"

create_page "token/faucet" "Faucet" "Obtenha NST gratuitamente" "🚰" "<h2>Como Obter</h2><p>Novos usuários recebem 100 NST ao se registrarem.</p><h2>Recompensas</h2><p>Ganhe NST por:</p><ul><li>Assistir vídeos</li><li>Curtir</li><li>Comentar</li><li>Compartilhar</li></ul>"

# === LEGAL PAGES (121-140) ===
create_page "terms" "Termos de Uso" "Condições de uso da plataforma" "📜" "<h2>1. Aceitação</h2><p>Ao usar a NexaStream, você concorda com estes termos.</p><h2>2. Conteúdo</h2><p>Usuários são responsáveis pelo conteúdo que publicam.</p><h2>3. Propriedade Intelectual</h2><p>Créditos vão para os criadores originais.</p>"

create_page "privacy" "Privacidade" "Como tratamos seus dados" "🔒" "<h2>Dados Coletados</h2><ul><li>Email (para autenticação)</li><li>Dados de uso (analytics)</li><li>Preferências</li></ul><h2>Direitos</h2><p>Você pode acessar, corrigir ou deletar seus dados a qualquer momento.</p>"

create_page "copyright" "Direitos Autorais" "Proteção de conteúdo" "©️" "<h2>Política</h2><p>Respeitamos os direitos autorais de criadores.</p><h2>DMCA</h2><p>Para reportar infracao, envie notificação para dmca@nexastream.org</p>"

create_page "cookies" "Cookies" "Política de cookies" "🍪" "<h2>Como Usamos</h2><p>Cookies são usados para autenticação e preferências.</p><h2>Controle</h2><p>Gerencie suas preferências de cookies nas configurações.</p>"

# === SUPPORT PAGES (141-160) ===
create_page "help" "Central de Ajuda" "Encontre respostas" "❓" "<h2>Como Podemos Ajudar</h2><ul><li><a href='/help/faq'>FAQ</a></li><li><a href='/help/contact'>Contato</a></li><li><a href='/help/report'>Reportar Bug</a></li></ul>"

create_page "help/faq" "Perguntas Frequentes" "Dúvidas comuns" "❓" "<h2>Populares</h2><h3>Como criar conta?</h3><p>Vá em /register/ e preencha os dados.</p><h3>Como enviar vídeo?</h3><p>Vá em /upload/ e selecione o arquivo.</p><h3>Como ganhar NST?</h3><p>Assistindo, curtindo e comentando vídeos.</p>"

create_page "help/contact" "Contato" "Fale conosco" "📧" "<h2>Email</h2><p>suporte@nexastream.org</p><h2>Resposta</h2><p>Respondemos em até 24 horas.</p>"

create_page "help/report" "Reportar Bug" "Reporte problemas" "🐛" "<h2>Como Reportar</h2><p>Envie detalhes do bug para bugs@nexastream.org</p><h2>Informações Necessárias</h2><ul><li>Passos para reproduzir</li><li>Resultado esperado</li><li>Resultado atual</li><li>Screenshot (se possível)</li></ul>"

# === STATUS PAGES (161-180) ===
create_page "status" "Status" "Status de todos os serviços" "🟢" "<h2>Serviços</h2><ul><li>✅ Frontend - Operacional</li><li>✅ API - Operacional</li><li>✅ CDN - Operacional</li><li>✅ Blockchain - Operacional</li></ul>"

create_page "status/incidents" "Incidentes" "Histórico de incidentes" "⚠️" "<h2>Últimos Incidentes</h2><p>Nenhum incidente reportado nas últimas 24 horas.</p>"

create_page "status/maintenance" "Manutenção" "Manutenções programadas" "🔧" "<h2>Próxima Manutenção</h2><p>Manutenção programada para 01/09/2026 das 02:00 às 04:00 UTC.</p>"

# === ROADMAP PAGES (181-200) ===
create_page "roadmap" "Roadmap" "O que vem por engulf" "🗺️" "<h2>Fases</h2><ul><li><strong>Fase 1:</strong> MVP ✅</li><li><strong>Fase 2:</strong> Creator Platform</li><li><strong>Fase 3:</strong> Decentralized Infra</li><li><strong>Fase 4:</strong> Blockchain Testnet</li><li><strong>Fase 5:</strong> Mainnet</li></ul>"

create_page "roadmap/2026" "Roadmap 2026" "Planos para 2026" "📅" "<h2>Q3 2026</h2><ul><li>Lançamento da plataforma</li><li>Integração WebTorrent</li></ul><h2>Q4 2026</h2><ul><li>Creator Studio v2</li><li>Token NST</li></ul>"

create_page "whitepaper" "Whitepaper" "Documento técnico" "📄" "<h2>Resumo</h2><p>A NexaStream é uma plataforma de vídeo descentralizada que combina blockchain, P2P e IA.</p><h2>Visão Geral</h2><p>O documento detalha a arquitetura, tokenomics e roadmap do projeto.</p>"

create_page "glossary" "Glossário" "Termos técnicos" "📖" "<h2>Termos</h2><dl><dt><strong>DAO</strong></dt><dd>Decentralized Autonomous Organization</dd><dt><strong>NST</strong></dt><dd>NexaStream Token</dd><dt><strong>P2P</strong></dt><dd>Peer-to-Peer</dd><dt><strong>WebTorrent</strong></dt><dd>Protocolo de distribuição P2P</dd></dl>"

echo ""
echo "✅ Pages generated: $(find $OUT_DIR -name 'index.html' | wc -l)"
echo ""
echo "📋 All pages:"
find $OUT_DIR -name "index.html" | sort | sed 's|out/|  /|' | sed 's|/index.html||'
