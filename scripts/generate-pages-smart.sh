#!/bin/bash
# Generate ~400 pages — kept under 5MB for reliable upload
set -e
OUT_DIR="out"
mkdir -p "$OUT_DIR"

create_page() {
  local dir="$1" title="$2" desc="$3" content="$4"
  mkdir -p "$OUT_DIR/$dir"
  cat > "$OUT_DIR/$dir/index.html" << EOF
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>$title — NexaStream</title>
<meta name="description" content="$desc">
<link rel="icon" href="/favicon.ico">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e0e0e0;min-height:100vh}
.hdr{background:linear-gradient(135deg,#1a1a2e,#16213e);border-bottom:1px solid #333;padding:14px 20px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100}
.logo{width:30px;height:30px;background:linear-gradient(135deg,#00d4ff,#7b2ff7);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;color:#fff}
.t{font-size:17px;font-weight:600;color:#fff}.t span{color:#00d4ff}
.bc{padding:10px 20px;font-size:12px;color:#888}.bc a{color:#00d4ff;text-decoration:none}
.ct{max-width:1100px;margin:0 auto;padding:20px}
.hero{text-align:center;padding:50px 20px;background:linear-gradient(135deg,rgba(0,212,255,.1),rgba(123,47,247,.1));border-radius:16px;margin-bottom:32px}
.hero h1{font-size:clamp(24px,4vw,42px);font-weight:800;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
.hero p{font-size:16px;color:#aaa;max-width:560px;margin:0 auto 20px}
.sec{margin-bottom:32px}.sec h2{font-size:22px;margin-bottom:14px;color:#fff}.sec p{color:#aaa;line-height:1.6;margin-bottom:10px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin:20px 0}
.c{background:#1a1a2e;border-radius:10px;padding:16px;border:1px solid #333;transition:all .3s}.c:hover{border-color:#00d4ff;transform:translateY(-2px)}
.c h3{font-size:15px;margin-bottom:6px;color:#fff}.c p{font-size:13px;color:#888}
.ft{background:#111;border-top:1px solid #333;padding:32px 20px;margin-top:48px;text-align:center;color:#666;font-size:12px}
.ft a{color:#00d4ff;text-decoration:none}
.nv{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:16px}
.nv a{color:#888;text-decoration:none;font-size:12px;padding:5px 10px;border-radius:6px}
</style>
</head>
<body>
<header class="hdr"><div class="logo">N</div><div class="t">Nexa<span>Stream</span></div></header>
<nav class="bc"><a href="/">Home</a> / $title</nav>
<main class="ct">$content</main>
<footer class="ft">
<p>&copy; 2026 NexaStream — Rede Descentralizada de Vídeos</p>
<div class="nv"><a href="/">Home</a><a href="/login">Login</a><a href="/register">Cadastro</a><a href="/search">Buscar</a><a href="/upload">Upload</a><a href="/shorts">Shorts</a><a href="/studio">Studio</a><a href="/dao">DAO</a></div>
<p style="margin-top:10px"><a href="https://github.com/Railancosta/nexastream">Open Source</a> · Powered by Cloudflare + WebTorrent</p>
</footer>
</body>
</html>
EOF
}

CATS=("gaming" "music" "tech" "crypto" "education" "news" "sports" "art" "science" "cooking" "travel" "fitness" "comedy" "podcast" "anime" "films" "photography" "code" "design" "finance")
TITLES=("Top 10" "Tutorial" "Review" "Guia" "Dicas" "Estratégia" "Highlights" "Masterclass" "Crash Course" "Workshop")

echo "Generating pages..."

# 200 video pages
for i in $(seq 1 200); do
  ci=$((i % 20)); ti=$((i % 10))
  cat="${CATS[$ci]}"; tit="${TITLES[$ti]}"
  views=$((RANDOM * 100 + 1000)); likes=$((RANDOM * 500 + 100))
  create_page "video/$i" "$tit — ${cat^} #$i" "Vídeo $tit na categoria ${cat^}" \
    "<div class='hero'><h1>$tit — ${cat^}</h1><p>#$i · $views views · $likes likes</p><div style='margin-top:16px;background:#222;border-radius:12px;height:340px;display:flex;align-items:center;justify-content:center;font-size:42px'>▶️</div></div><div class='sec'><h2>Sobre</h2><p>Conteúdo ${cat^} na NexaStream. Distribuído via P2P WebTorrent, sem servidores centralizados.</p></div><div class='sec'><h2>Comentários</h2><div class='grid'><div class='c'><h3>@user$((RANDOM%1000))</h3><p>Incrível! 🔥</p></div><div class='c'><h3>@creator$((RANDOM%100))</h3><p>Obrigado!</p></div></div></div>"
done
echo "✅ 200 video pages"

# 100 creator pages
for i in $(seq 1 100); do
  ci=$((i % 20)); cat="${CATS[$ci]}"
  subs=$((RANDOM * 50000 + 1000))
  create_page "creator/$i" "Criador ${cat^} #$i" "Perfil criador ${cat^} na NexaStream" \
    "<div class='hero'><h1>👤 ${cat^} Creator #$i</h1><p>$subs inscritos · $((RANDOM%200+10)) vídeos</p></div><div class='sec'><h2>Vídeos</h2><div class='g'>$(
      for v in 1 2 3 4; do vid=$((RANDOM%200+1)); echo "<div class='c'><h3>📹 #$vid</h3><p>${cat^} · $((RANDOM%5000+100)) views</p></div>"; done
    )</div></div>"
done
echo "✅ 100 creator pages"

# 50 category pages
TOPICS=("python" "javascript" "react" "nextjs" "web3" "bitcoin" "ethereum" "solana" "nft" "defi" "docker" "kubernetes" "ai" "machine-learning" "blockchain" "solidity" "rust" "typescript" "nodejs" "graphql" "linux" "devops" "cloud" "database" "redis" "postgresql" "mongodb" "firebase" "tailwind" "sass" "webpack" "vite" "testing" "jest" "cypress" "api" "jwt" "oauth" "encryption" "video" "streaming" "transcoding" "p2p" "webtorrent" "ipfs" "live" "shorts" "gaming" "music" "tech")
for i in $(seq 1 50); do
  topic="${TOPICS[$((i-1))]}"
  count=$((RANDOM % 500 + 50))
  create_page "category/$topic" "${topic^} — Videos" "$count+ vídeos na NexaStream" \
    "<div class='hero'><h1>${topic^}</h1><p>$count+ vídeos · $((RANDOM%100+10)) criadores</p></div><div class='sec'><h2>Vídeos</h2><div class='g'>$(
      for v in $(seq 1 8); do vid=$((RANDOM%200+1)); echo "<div class='c'><h3>📹 #$vid</h3><p>${topic^} · $((RANDOM%10000+100)) views</p></div>"; done
    )</div></div>"
done
echo "✅ 50 category pages"

# 20 docs pages
for topic in "getting-started" "api-reference" "authentication" "video-upload" "webtorrent" "p2p-network" "blockchain" "nst-token" "dao-governance" "creator-studio" "monetization" "analytics" "moderation" "deployment" "dns-setup" "ssl-tls" "rate-limiting" "sdk-javascript" "mobile-app" "security"; do
  create_page "docs/$topic" "Docs: ${topic//-/ }" "Documentação NexaStream — ${topic//-/ }" \
    "<div class='hero'><h1>📄 ${topic//-/ }</h1><p>Documentação NexaStream</p></div><div class='sec'><h2>Visão Geral</h2><p>Documentação completa do módulo ${topic//-/ }.</p></div><div class='sec'><h2>Arquitetura</h2><div class='g'><div class='c'><h3>🌐 P2P</h3><p>WebTorrent + DHT</p></div><div class='c'><h3>⛓️ Blockchain</h3><p>NexaChain + NST</p></div><div class='c'><h3>💾 Storage</h3><p>IPFS + R2</p></div></div></div>"
done
echo "✅ 20 docs pages"

# 30 live pages
for i in $(seq 1 30); do
  ci=$((i % 20)); cat="${CATS[$ci]}"
  viewers=$((RANDOM * 1000 + 50))
  create_page "live/$i" "Live: ${cat^} #$i" "Live stream ${cat^} na NexaStream" \
    "<div class='hero'><h1>🔴 LIVE: ${cat^}</h1><p>$viewers espectadores · P2P/WebRTC</p><div style='margin-top:16px;background:#222;border-radius:12px;height:300px;display:flex;align-items:center;justify-content:center;font-size:42px;border:3px solid #ff0040'>🔴 AO VIVO</div></div><div class='sec'><h2>Chat</h2><div class='c'><h3>@viewer$((RANDOM%100))</h3><p>Top! 🔥</p></div></div>"
done
echo "✅ 30 live pages"

TOTAL=$(find "$OUT_DIR" -name "index.html" | wc -l)
SIZE=$(du -sh "$OUT_DIR" | cut -f1)
echo ""
echo "=========================================="
echo "✅ TOTAL: $TOTAL pages ($SIZE)"
echo "=========================================="
