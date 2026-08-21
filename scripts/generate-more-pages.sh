#!/bin/bash
# Generate more pages for NexaStream to reach 200+

set -e

OUT_DIR="out"

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
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;line-height:1.6}
    .container{max-width:800px;margin:0 auto;padding:2rem 1rem}
    h1{font-size:2.5rem;font-weight:800;margin-bottom:1rem;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .subtitle{color:#888;font-size:1.1rem;margin-bottom:2rem}
    .content{color:#ccc;line-height:1.8}
    .content h2{font-size:1.5rem;color:#fff;margin:2rem 0 1rem}
    .content ul{margin:1rem 0;padding-left:1.5rem}
    .content li{margin-bottom:0.5rem}
    .cta{display:inline-block;padding:1rem 2rem;background:#818cf8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-top:2rem}
    nav{position:sticky;top:0;z-index:100;background:rgba(10,10,15,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.1);padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between}
    .logo{font-size:1.25rem;font-weight:800;color:#818cf8;text-decoration:none}
    .nav-links{display:flex;gap:1.5rem;font-size:0.9rem}
    .nav-links a{color:#888;text-decoration:none}
    footer{text-align:center;padding:3rem 1rem;color:#666;font-size:0.85rem;border-top:1px solid rgba(255,255,255,0.1);margin-top:4rem}
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
    <h1>$icon $title</h1>
    <p class="subtitle">$description</p>
    <div class="content">$content</div>
    <a href="/" class="cta">Explorar NexaStream →</a>
  </div>
  <footer>© 2026 NexaStream</footer>
</body>
</html>
HTMLEOF
}

echo "🚀 Generating additional pages..."

# === CATEGORIES (201-220) ===
create_page "category/music" "Música" "Vídeos musicais" "🎵" "<ul><li>Videoclipes</li><li>Performances ao vivo</li><li>Tutoriais de instrumentos</li><li>Covers</li><li>Produção musical</li></ul>"
create_page "category/gaming" "Games" "Conteúdo gaming" "🎮" "<ul><li>Gameplay</li><li>Tutoriais</li><li>Reviews</li><li>Speedruns</li><li>eSports</li></ul>"
create_page "category/tech" "Tecnologia" "Conteúdo tech" "💻" "<ul><li>Reviews de gadgets</li><li>Programação</li><li>IA</li><li>Crypto</li><li>Startups</li></ul>"
create_page "category/education" "Educação" "Aprenda algo novo" "📚" "<ul><li>Cursos online</li><li>Tutoriais</li><li>Documentários</li><li>Idiomas</li><li>Ciências</li></ul>"
create_page "category/cooking" "Culinária" "Receitas e dicas" "🍳" "<ul><li>Receitas rápidas</li><li>Cozinha internacional</li><li>Confeitaria</li><li>Alimentação saudável</li></ul>"
create_page "category/fitness" "Fitness" "Saúde e bem-estar" "💪" "<ul><li>Treinos</li><li>Yoga</li><li>Meditação</li><li>Nutrição</li><li>Corrida</li></ul>"
create_page "category/travel" "Viagens" "Explore o mundo" "✈️" "<ul><li>Vlogs de viagem</li><li>Dicas de destino</li><li>Budget travel</li><li>Aventura</li></ul>"
create_page "category/fashion" "Moda" "Tendências e estilo" "👗" "<ul><li>Lookbooks</li><li>DIY</li><li>Thrift</li><li>Sustentabilidade</li></ul>"
create_page "category/photography" "Fotografia" "Arte visual" "📷" "<ul><li>Técnicas</li><li>Edição</li><li>Paisagens</li><li>Retratos</li><li>Street photography</li></ul>"
create_page "category/art" "Arte" "Expressão criativa" "🎨" "<ul><li>Pintura</li><li>Desenho</li><li>Escultura</li><li>Arte digital</li><li>Arte tradicional</li></ul>"
create_page "category/science" "Ciência" "Descobertas e explicações" "🔬" "<ul><li>Física</li><li>Química</li><li>Biologia</li><li>Astronomia</li><li>Neurociência</li></ul>"
create_page "category/history" "História" "Aprendizado histórico" "📜" "<ul><li>Documentários</li><li>Análises</li><li>Biografias</li><li>Guerras</li><li>Civilizações</li></ul>"
create_page "category/sports" "Esportes" "Conteúdo esportivo" "⚽" "<ul><li>Futebol</li><li>Basquete</li><li>Tênis</li><li>Fórmula 1</li><li>Olimpíadas</li></ul>"
create_page "category/comedy" "Comédia" "Risos garantidos" "😂" "<ul><li>Stand-up</li><li>Sketches</li><li>Vlogs cômicos</li><li>Paródias</li></ul>"
create_page "category/podcast" "Podcasts" "Áudio e entrevistas" "🎙️" "<ul><li>Entrevistas</li><li>Notícias</li><li>Storytelling</li><li>Educação</li></ul>"
create_page "category/documentary" "Documentários" "Histórias reais" "🎬" "<ul><li>Natureza</li><li>Ciência</li><li>Sociedade</li><li>Tecnologia</li></ul>"
create_page "category/cryptocurrency" "Crypto" "Mundo cripto" "₿" "<ul><li>Tutoriais</li><li>Market analysis</li><li>DeFi</li><li>NFTs</li><li>Web3</li></ul>"
create_page "category/programming" "Programação" "Aprenda código" "👨‍💻" "<ul><li>JavaScript</li><li>Python</li><li>Rust</li><li>Web Dev</li><li>Mobile</li></ul>"
create_page "category/ai" "Inteligência Artificial" "IA e Machine Learning" "🤖" "<ul><li>Tutoriais</li><li>Projetos</li><li>News</li><li>Ética</li></ul>"
create_page "category/web3" "Web3" "Próxima geração da web" "🌐" "<ul><li>Blockchain</li><li>DeFi</li><li>NFTs</li><li>DAOs</li><li>Metaverso</li></ul>"

# === COUNTRY PAGES (221-240) ===
create_page "country/brazil" "Brasil" "Conteúdo brasileiro" "🇧🇷" "<ul><li>Música brasileira</li><li>Cultura</li><li>Notícias</li><li>Entretenimento</li></ul>"
create_page "country/usa" "Estados Unidos" "Conteúdo americano" "🇺🇸" "<ul><li>News</li><li>Entertainment</li><li>Tech</li><li>Sports</li></ul>"
create_page "country/japan" "Japão" "Conteúdo japonês" "🇯🇵" "<ul><li>Anime</li><li>Música</li><li>Tecnologia</li><li>Cultura</li></ul>"
create_page "country/germany" "Alemanha" "Conteúdo alemão" "🇩🇪" "<ul><li>Música</li><li>Ciência</li><li>Engenharia</li></ul>"
create_page "country/france" "França" "Conteúdo francês" "🇫🇷" "<ul><li>Cultura</li><li>Gastronomia</li><li>Arte</li></ul>"
create_page "country/spain" "Espanha" "Conteúdo espanhol" "🇪🇸" "<ul><li>Música</li><li>Esportes</li><li>Cultura</li></ul>"
create_page "country/india" "Índia" "Conteúdo indiano" "🇮🇳" "<ul><li>Bollywood</li><li>Tech</li><li>Cultura</li></ul>"
create_page "country/korea" "Coreia do Sul" "Conteúdo coreano" "🇰🇷" "<ul><li>K-Pop</li><li>Gaming</li><li>Tech</li></ul>"
create_page "country/china" "China" "Conteúdo chinês" "🇨🇳" "<ul><li>Tech</li><li>Música</li><li>Cultura</li></ul>"
create_page "country/russia" "Rússia" "Conteúdo russo" "🇷🇺" "<ul><li>Ciência</li><li>Space</li><li>Música</li></ul>"
create_page "country/mexico" "México" "Conteúdo mexicano" "🇲🇽" "<ul><li>Música</li><li>Cultura</li><li>Gastronomia</li></ul>"
create_page "country/argentina" "Argentina" "Conteúdo argentino" "🇦🇷" "<ul><li>Futebol</li><li>Música</li><li>Cultura</li></ul>"
create_page "country/uk" "Reino Unido" "Conteúdo britânico" "🇬🇧" "<ul><li>Música</li><li>Futebol</li><li>Cultura</li></ul>"
create_page "country/italy" "Itália" "Conteúdo italiano" "🇮🇹" "<ul><li>Gastronomia</li><li>Arte</li><li>Fashion</li></ul>"
create_page "country/portugal" "Portugal" "Conteúdo português" "🇵🇹" "<ul><li>Cultura</li><li>Música</li><li>Futebol</li></ul>"
create_page "country/nigeria" "Nigéria" "Conteúdo nigeriano" "🇳🇬" "<ul><li>Afrobeats</li><li>Cultura</li><li>Notícias</li></ul>"
create_page "country/egypt" "Egito" "Conteúdo egípcio" "🇪🇬" "<ul><li>História</li><li>Cultura</li><li>Música</li></ul>"
create_page "country/australia" "Austrália" "Conteúdo australiano" "🇦🇺" "<ul><li>Natureza</li><li>Esportes</li><li>Vida</li></ul>"
create_page "country/canada" "Canadá" "Conteúdo canadense" "🇨🇦" "<ul><li>Natureza</li><li>Cultura</li><li>Tech</li></ul>"
create_page "country/south-africa" "África do Sul" "Conteúdo sul-africano" "🇿🇦" "<ul><li>Cultura</li><li>Esportes</li><li>Natureza</li></ul>"

# === TRENDING PAGES (241-260) ===
create_page "trending" "Em Alta" "Conteúdo trending" "🔥" "<ul><li>Vídeos mais assistidos</li><li>Crescimento rápido</li><li>Virais</li><li>Destaque da semana</li></ul>"
create_page "trending/weekly" "Semana" "Trending da semana" "📅" "<ul><li>Top 10 da semana</li><li>Maiores crescimentos</li><li>Novos criadores em alta</li></ul>"
create_page "trending/monthly" "Mês" "Trending do mês" "📊" "<ul><li>Top 100 do mês</li><li>Melhores criadores</li><li>Melhores vídeos</li></ul>"
create_page "trending/yearly" "Ano" "Trending do ano" "🏆" "<ul><li>Top 1000 do ano</li><li>Criadores do ano</li><li>Melhor conteúdo</li></ul>"
create_page "trending/new" "Novos" "Conteúdo recente" "🆕" "<ul><li>Últimas publicações</li><li>Novos criadores</li><li>Promessas</li></ul>"
create_page "trending/featured" "Destaque" "Conteúdo selecionado" "⭐" "<ul><li>Seleção da equipe</li><li>Qualidade garantida</li><li>Diversidade</li></ul>"
create_page "trending/viral" "Viral" "Conteúdo viral" "🚀" "<ul><li>Mais compartilhados</li><li>Em alta agora</li><li>Tendências</li></ul>"

# === LEADERBOARD PAGES (261-280) ===
create_page "leaderboard" "Leaderboard" "Rankings da comunidade" "🏆" "<ul><li>Top Criadores</li><li>Top Visualizações</li><li>Top Engajamento</li><li>Top NST Ganho</li></ul>"
create_page "leaderboard/creators" "Criadores" "Top criadores" "👑" "<ul><li>Por inscritos</li><li>Por views</li><li>Por receita</li></ul>"
create_page "leaderboard/videos" "Vídeos" "Top vídeos" "🎬" "<ul><li>Por views</li><li>Por likes</li><li>Por compartilhamentos</li></ul>"
create_page "leaderboard/validators" "Validadores" "Top validadores" "🛡️" "<ul><li>Por uptime</li><li>Por stake</li><li>Por recompensas</li></ul>"
create_page "leaderboard/seeding" "Seeding" "Top seeders" "🌱" "<ul><li>Por GB servidos</li><li>Por horas online</li><li>Por recompensas</li></ul>"

# === REWARD PAGES (281-300) ===
create_page "rewards" "Recompensas" "Ganhe NST" "🎁" "<h2>Como Ganhar</h2><ul><li>Assistir vídeos: 1 NST/min</li><li>Curtir: 5 NST</li><li>Comentar: 10 NST</li><li>Compartilhar: 15 NST</li><li>Upload: 100 NST</li><li>Seeding: 100 NST/GB</li></ul>"
create_page "rewards/daily" "Diárias" "Missões diárias" "📅" "<ul><li>Assistir 5 vídeos: 50 NST</li><li>Curtir 3 vídeos: 30 NST</li><li>Comentar 1 vez: 20 NST</li><li>Compartilhar 1 vez: 25 NST</li></ul>"
create_page "rewards/weekly" "Semanais" "Missões semanais" "📆" "<ul><li>Assistir 20 vídeos: 200 NST</li><li>Criar 1 vídeo: 500 NST</li><li>Ganhar 100 inscritos: 1000 NST</li></ul>"
create_page "rewards/streak" "Sequência" "Bônus de sequência" "🔥" "<ul><li>3 dias: 1.5x</li><li>7 dias: 2x</li><li>30 dias: 3x</li><li>90 dias: 5x</li></ul>"
create_page "rewards/referral" "Indicação" "Convide amigos" "👥" "<ul><li>Amigo se registra: 100 NST</li><li>Amigo faz upload: 200 NST</li><li>Amigo atinge 100 subs: 500 NST</li></ul>"

echo ""
echo "✅ Total pages: $(find $OUT_DIR -name 'index.html' | wc -l)"
