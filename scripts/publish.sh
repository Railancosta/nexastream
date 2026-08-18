#!/data/data/com.termux/files/usr/bin/bash
# uso: ./scripts/publish.sh "Titulo" "magnet:?..." [bytes] [cid]
cd "$(dirname "$0")/.."
REG=apps/site/public/registry.json
T="$1"; M="$2"; S="${3:-0}"; C="${4:-}"
node -e '
const fs=require("fs");
const reg=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
reg.videos.push({id:Date.now().toString(36),title:process.argv[2],magnet:process.argv[3],size:Number(process.argv[4]||0),cid:process.argv[5]||"",author:process.env.USER||"anon",ts:new Date().toISOString()});
fs.writeFileSync(process.argv[1],JSON.stringify(reg,null,2));
' "$REG" "$T" "$M" "$S" "$C"
git add "$REG" && git commit -m "content: publish $T" && git push
echo "✅ publicado. Em ~1 min aparece em nexastream.org/feed.html"
