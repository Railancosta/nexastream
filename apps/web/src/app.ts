const API_BASE = (typeof window !== "undefined" && (window as any).NEXASTREAM_API) || "http://localhost:4000";
let accessToken: string | null = null;
let currentUser: any = null;

function navigate(path: string) {
  if (typeof window !== "undefined") { window.history.pushState({}, "", path); render(); }
}

function render() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  const app = document.getElementById("app");
  if (!app) return;
  const token = localStorage.getItem("nst_access_token");
  const user = localStorage.getItem("nst_user");
  if (token && user) { accessToken = token; currentUser = JSON.parse(user); }
  if (path === "/" || path === "/index.html") renderFeed(app);
  else if (path === "/login") renderLogin(app);
  else if (path === "/register") renderRegister(app);
  else if (path === "/upload") requireAuth(() => renderUpload(app));
  else if (path.startsWith("/watch/")) renderWatch(app, path.split("/")[2]);
  else if (path === "/search") renderSearch(app);
  else if (path === "/profile") requireAuth(() => renderProfile(app));
  else if (path === "/status") renderStatus(app);
  else app.innerHTML = '<div class="center"><h1>404</h1><a href="/">Voltar</a></div>';
}

function requireAuth(cb: () => void) { if (!accessToken) navigate("/login"); else cb(); }

async function api(method: string, path: string, body?: any): Promise<any> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = "Bearer " + accessToken;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const e = await res.json().catch(() => ({error:"HTTP " + res.status})); throw new Error(e.error); }
  return res.json();
}

async function doRegister(email: string, username: string, password: string) {
  const data = await api("POST", "/api/v1/auth/register", { email, username, password });
  accessToken = data.accessToken; currentUser = data.user;
  localStorage.setItem("nst_access_token", accessToken!);
  localStorage.setItem("nst_user", JSON.stringify(currentUser));
  navigate("/");
}

async function doLogin(email: string, password: string) {
  const data = await api("POST", "/api/v1/auth/login", { email, password });
  accessToken = data.accessToken; currentUser = data.user;
  localStorage.setItem("nst_access_token", accessToken!);
  localStorage.setItem("nst_user", JSON.stringify(currentUser));
  navigate("/");
}

function doLogout() {
  accessToken = null; currentUser = null;
  localStorage.removeItem("nst_access_token");
  localStorage.removeItem("nst_user");
  navigate("/");
}

function layout(content: string): string {
  const a = !!currentUser;
  return '<nav class="nav"><div class="nav-l"><a href="/" class="logo">NexaStream</a>'
    + '<a href="/" class="nl">Feed</a><a href="/search" class="nl">Buscar</a>'
    + (a ? '<a href="/upload" class="nl">Upload</a>' : '')
    + '<a href="/status" class="nl">Status</a></div><div class="nav-r">'
    + (a ? '<span class="ui">' + currentUser.username + '</span>'
    + '<a href="/profile" class="nl">Perfil</a>'
    + '<button onclick="doLogout()" class="btn-g">Sair</button>'
    : '<a href="/login" class="btn-g">Entrar</a><a href="/register" class="btn-p">Registrar</a>')
    + '</div></nav><main class="container">' + content + '</main>';
}

function renderFeed(app: HTMLElement) {
  app.innerHTML = layout('<div class="fh"><h1>Feed</h1><p>Algoritmo: recencia + watch time + engagement</p></div><div id="fc" class="vg"><div class="load">Carregando...</div></div>');
  api("GET", "/api/v1/feed?limit=24").then(d => {
    const g = document.getElementById("fc"); if (!g) return;
    if (!d.videos || !d.videos.length) {
      g.innerHTML = '<div class="empty"><h2>Nenhum video ainda</h2><p>A rede esta em desenvolvimento.</p>'
        + (currentUser ? '<a href="/upload" class="btn-p">Upload</a>' : '<a href="/register" class="btn-p">Registrar</a>') + '</div>';
      return;
    }
    g.innerHTML = d.videos.map((v: any) => '<div class="vc" onclick="navigate(\'/watch/' + v.id + '\')">'
      + '<div class="vt"><div class="pi">\u25B6</div></div>'
      + '<div class="vi"><h3>' + esc(v.title) + '</h3>'
      + '<p class="vm">' + (v.views||0) + ' views \u00B7 ' + ft(v.createdAt) + '</p>'
      + '<p>por ' + esc(v.creatorId) + '</p>'
      + '<span>\uD83D\uDC4D ' + (v.likes||0) + '</span></div></div>').join("");
  }).catch(() => {
    const g = document.getElementById("fc");
    if (g) g.innerHTML = '<div class="empty"><h2>API offline</h2><p>Backend nao respondendo.</p><a href="/status" class="btn-g">Status</a></div>';
  });
}

function renderWatch(app: HTMLElement, id: string) {
  app.innerHTML = layout('<div class="wp"><div class="pc"><div class="pp"><div class="pi">\u25B6</div><p>Player hibrido (HTTP + P2P)</p></div></div><div id="vd" class="vd"><div class="load">Carregando...</div></div></div>');
  api("GET", "/api/v1/videos/" + id).then(v => {
    const d = document.getElementById("vd"); if (!d) return;
    d.innerHTML = '<h1>' + esc(v.title) + '</h1>'
      + '<div class="wm"><span>' + v.views + ' views</span> \u00B7 <span>' + ft(v.createdAt) + '</span>'
      + '<div><button onclick="likeV(\'' + v.id + '\')" class="btn-g">\uD83D\uDC4D ' + v.likes + '</button> '
      + '<button onclick="showC(\'' + v.id + '\')" class="btn-g">\uD83D\uDCAC Comentarios</button></div></div>'
      + '<div class="vc-box"><p>Criador: ' + esc(v.creatorId) + '</p>'
      + '<p>Hash: <code>' + (v.contentHash?v.contentHash.slice(0,16):"") + '...</code></p>'
      + '<p>Status: ' + v.status + '</p></div>'
      + '<div id="cs" class="cs" style="display:none;"><h3>Comentarios</h3>'
      + (currentUser ? '<div class="ci"><textarea id="ct" placeholder="Comentario..."></textarea><button onclick="addC(\'' + v.id + '\')" class="btn-p">Enviar</button></div>'
        : '<p><a href="/login">Login</a> para comentar.</p>')
      + '<div id="cl"></div></div>';
  }).catch(() => {
    const d = document.getElementById("vd");
    if (d) d.innerHTML = '<div class="err">Video nao encontrado.</div>';
  });
}

function renderLogin(app: HTMLElement) {
  app.innerHTML = layout('<div class="auth"><h1>Entrar</h1><form onsubmit="hLogin(event)" class="af">'
    + '<input type="email" id="le" placeholder="Email" required />'
    + '<input type="password" id="lp" placeholder="Senha" required />'
    + '<button type="submit" class="btn-p">Entrar</button></form>'
    + '<p>Sem conta? <a href="/register">Registrar</a></p></div>');
}

function renderRegister(app: HTMLElement) {
  app.innerHTML = layout('<div class="auth"><h1>Registrar</h1><form onsubmit="hReg(event)" class="af">'
    + '<input type="email" id="re" placeholder="Email" required />'
    + '<input type="text" id="ru" placeholder="Usuario" required />'
    + '<input type="password" id="rp" placeholder="Senha (min 8)" required />'
    + '<button type="submit" class="btn-p">Criar conta</button></form>'
    + '<p>Com conta? <a href="/login">Entrar</a></p></div>');
}

function renderUpload(app: HTMLElement) {
  app.innerHTML = layout('<div class="up"><h1>Upload de video</h1><p>Upload resumivel com chunking e SHA-256.</p>'
    + '<form onsubmit="hUpload(event)" class="uf">'
    + '<input type="text" id="ut" placeholder="Titulo" required />'
    + '<textarea id="ud" placeholder="Descricao"></textarea>'
    + '<input type="file" id="uf2" accept="video/*" required />'
    + '<div id="up-p" style="display:none;"><div class="pb"><div class="pf" id="pf"></div></div><span id="pt">0%</span></div>'
    + '<button type="submit" class="btn-p">Enviar</button></form></div>');
}

function renderSearch(app: HTMLElement) {
  app.innerHTML = layout('<div class="sp"><h1>Buscar videos</h1>'
    + '<input type="text" id="sq" placeholder="Buscar..." onkeyup="hSearch(event)" />'
    + '<div id="sr" class="vg"></div></div>');
}

function renderProfile(app: HTMLElement) {
  app.innerHTML = layout('<div class="pp"><h1>Perfil</h1>'
    + '<div class="pi-box"><p><strong>Usuario:</strong> ' + currentUser.username + '</p>'
    + '<p><strong>Email:</strong> ' + currentUser.email + '</p>'
    + '<p><strong>Role:</strong> ' + currentUser.role + '</p></div>'
    + '<a href="/upload" class="btn-p">Upload</a></div>');
}

function renderStatus(app: HTMLElement) {
  app.innerHTML = layout('<div class="sp"><h1>Status da Rede</h1><div id="st"><div class="load">Verificando...</div></div></div>');
  api("GET", "/api/v1/health").then(d => {
    const e = document.getElementById("st");
    if (e) e.innerHTML = '<div class="sc ok"><h3>\u2705 API Online</h3><p>Status: ' + d.status + '</p><p>Versao: ' + d.version + '</p></div>';
  }).catch(() => {
    const e = document.getElementById("st");
    if (e) e.innerHTML = '<div class="sc err"><h3>\u274C API Offline</h3><p>Backend nao rodando.</p></div>';
  });
}

function hLogin(e: Event) {
  e.preventDefault();
  doLogin((document.getElementById("le") as HTMLInputElement).value,
    (document.getElementById("lp") as HTMLInputElement).value)
    .catch(err => alert("Erro: " + err.message));
}

function hReg(e: Event) {
  e.preventDefault();
  doRegister((document.getElementById("re") as HTMLInputElement).value,
    (document.getElementById("ru") as HTMLInputElement).value,
    (document.getElementById("rp") as HTMLInputElement).value)
    .catch(err => alert("Erro: " + err.message));
}

async function hUpload(e: Event) {
  e.preventDefault();
  const file = (document.getElementById("uf2") as HTMLInputElement).files?.[0];
  if (!file) return;
  const cs = 8*1024*1024;
  const tc = Math.ceil(file.size / cs);
  try {
    const init = await api("POST", "/api/v1/uploads", { filename: file.name, mimeType: file.type||"video/mp4", declaredSize: file.size });
    const uid = init.uploadId;
    (document.getElementById("up-p") as HTMLElement).style.display = "block";
    for (let i = 0; i < tc; i++) {
      const buf = await file.slice(i*cs, Math.min((i+1)*cs, file.size)).arrayBuffer();
      await fetch(API_BASE + "/api/v1/uploads/" + uid + "/chunks/" + i, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream", ...(accessToken ? {Authorization: "Bearer " + accessToken} : {}) },
        body: buf,
      });
      const pct = Math.round(((i+1)/tc)*100);
      (document.getElementById("pf") as HTMLElement).style.width = pct + "%";
      (document.getElementById("pt") as HTMLElement).textContent = pct + "%";
    }
    const r = await api("POST", "/api/v1/uploads/" + uid + "/complete");
    alert("Upload completo! SHA-256: " + r.sha256.slice(0,16) + "...");
    navigate("/");
  } catch (err: any) { alert("Erro: " + err.message); }
}

let st: any;
function hSearch(e: KeyboardEvent) {
  clearTimeout(st);
  const q = (e.target as HTMLInputElement).value;
  st = setTimeout(async () => {
    if (!q.trim()) return;
    try {
      const d = await api("GET", "/api/v1/search?q=" + encodeURIComponent(q));
      const g = document.getElementById("sr");
      if (g) g.innerHTML = !d.videos.length ? "<p>Nenhum resultado.</p>"
        : d.videos.map((v: any) => '<div class="vc" onclick="navigate(\'/watch/' + v.id + '\')">'
          + '<div class="vt"><div class="pi">\u25B6</div></div>'
          + '<div class="vi"><h3>' + esc(v.title) + '</h3><p>' + (v.views||0) + ' views</p></div></div>').join("");
    } catch {}
  }, 300);
}

async function likeV(id: string) {
  if (!accessToken) { navigate("/login"); return; }
  try { await api("POST", "/api/v1/videos/" + id + "/like"); alert("Curtido!"); }
  catch (e: any) { alert(e.message); }
}

async function showC(id: string) {
  (document.getElementById("cs") as HTMLElement).style.display = "block";
  try {
    const d = await api("GET", "/api/v1/videos/" + id + "/comments");
    const l = document.getElementById("cl");
    if (l) l.innerHTML = !d.comments.length ? "<p>Sem comentarios.</p>"
      : d.comments.map((c: any) => '<div class="cm"><p><strong>' + esc(c.authorId) + '</strong> \u00B7 ' + ft(c.createdAt) + '</p><p>' + esc(c.content) + '</p></div>').join("");
  } catch {}
}

async function addC(id: string) {
  if (!accessToken) return;
  const t = (document.getElementById("ct") as HTMLTextAreaElement).value;
  if (!t.trim()) return;
  try {
    await api("POST", "/api/v1/videos/" + id + "/comments", { content: t });
    (document.getElementById("ct") as HTMLTextAreaElement).value = "";
    showC(id);
  } catch (e: any) { alert(e.message); }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]!));
}

function ft(ts: number): string {
  if (!ts) return "agora";
  const d = Date.now() - ts;
  if (d < 60000) return "agora";
  if (d < 3600000) return Math.floor(d/60000) + "min";
  if (d < 86400000) return Math.floor(d/3600000) + "h";
  return Math.floor(d/86400000) + "d";
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", render);
  window.addEventListener("DOMContentLoaded", render);
}
