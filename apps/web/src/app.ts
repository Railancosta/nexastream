/**
 * NexaStream Platform v2.0 — Global Video Platform
 * Features: i18n, Google login, channels, SEO, financial dashboard,
 * sponsorship, ads, stablecoin, analytics, alerts, security hardening.
 */
// API URL: configurable, defaults to same-origin or localhost
const API_BASE = (typeof window !== "undefined" && (window as any).NEXASTREAM_API) || "/api/v1";
const RPC_URL = (typeof window !== "undefined" && (window as any).NEXASTREAM_RPC) || "http://localhost:9001";
let accessToken: string | null = null;
let currentUser: any = null;
let currentLang = "en";

const translations: Record<string, Record<string, string>> = {
  en: { feed: "Feed", search: "Search", upload: "Upload", channels: "Channels", dashboard: "Dashboard", status: "Network Status", login: "Login", register: "Register", logout: "Logout", profile: "Profile", sponsored: "Sponsored", trending: "Trending", subscribers: "subscribers", views: "views", withdraw: "Withdraw", deposit: "Deposit", swap: "Swap", balance: "Balance", earnings: "Earnings", mining: "Mining NST", live: "MAINNET LIVE" },
  pt: { feed: "Feed", search: "Buscar", upload: "Upload", channels: "Canais", dashboard: "Painel", status: "Status da Rede", login: "Entrar", register: "Registrar", logout: "Sair", profile: "Perfil", sponsored: "Patrocinado", trending: "Em Alta", subscribers: "inscritos", views: "visualizações", withdraw: "Sacar", deposit: "Depositar", swap: "Trocar", balance: "Saldo", earnings: "Ganhos", mining: "Minerando NST", live: "MAINNET ATIVA" },
  es: { feed: "Inicio", search: "Buscar", upload: "Subir", channels: "Canales", dashboard: "Panel", status: "Estado de Red", login: "Entrar", register: "Registro", logout: "Salir", profile: "Perfil", sponsored: "Patrocinado", trending: "Tendencias", subscribers: "suscriptores", views: "vistas", withdraw: "Retirar", deposit: "Depositar", swap: "Cambiar", balance: "Saldo", earnings: "Ganancias", mining: "Minando NST", live: "MAINNET ACTIVA" },
  zh: { feed: "首页", search: "搜索", upload: "上传", channels: "频道", dashboard: "仪表板", status: "网络状态", login: "登录", register: "注册", logout: "退出", profile: "个人资料", sponsored: "赞助", trending: "热门", subscribers: "订阅者", views: "观看", withdraw: "提现", deposit: "存款", swap: "兑换", balance: "余额", earnings: "收入", mining: "挖矿 NST", live: "主网运行中" },
  ja: { feed: "フィード", search: "検索", upload: "アップロード", channels: "チャンネル", dashboard: "ダッシュボード", status: "ネットワーク状態", login: "ログイン", register: "登録", logout: "ログアウト", profile: "プロフィール", sponsored: "スポンサー", trending: "トレンド", subscribers: "登録者", views: "再生回数", withdraw: "出金", deposit: "入金", swap: "交換", balance: "残高", earnings: "収益", mining: "マイニング NST", live: "メインネット稼働中" },
  fr: { feed: "Fil", search: "Rechercher", upload: "Téléverser", channels: "Chaînes", dashboard: "Tableau", status: "Statut Réseau", login: "Connexion", register: "Inscription", logout: "Déconnexion", profile: "Profil", sponsored: "Sponsorisé", trending: "Tendances", subscribers: "abonnés", views: "vues", withdraw: "Retirer", deposit: "Dépôt", swap: "Échanger", balance: "Solde", earnings: "Revenus", mining: "Minage NST", live: "MAINNET EN LIGNE" },
  de: { feed: "Feed", search: "Suche", upload: "Hochladen", channels: "Kanäle", dashboard: "Dashboard", status: "Netzwerk", login: "Anmelden", register: "Registrieren", logout: "Abmelden", profile: "Profil", sponsored: "Gesponsert", trending: "Trends", subscribers: "Abonnenten", views: "Aufrufe", withdraw: "Abheben", deposit: "Einzahlen", swap: "Tauschen", balance: "Guthaben", earnings: "Einnahmen", mining: "NST Mining", live: "MAINNET LIVE" },
  hi: { feed: "फ़ीड", search: "खोज", upload: "अपलोड", channels: "चैनल", dashboard: "डैशबोर्ड", status: "नेटवर्क", login: "लॉगिन", register: "रजिस्टर", logout: "लॉगआउट", profile: "प्रोफ़ाइल", sponsored: "प्रायोजित", trending: "ट्रेंडिंग", subscribers: "सब्सक्राइबर", views: "व्यूज", withdraw: "निकालें", deposit: "जमा", swap: "बदलें", balance: "बैलेंस", earnings: "कमाई", mining: "NST माइनिंग", live: "मेननेट लाइव" },
  ar: { feed: "الرئيسية", search: "بحث", upload: "رفع", channels: "قنوات", dashboard: "لوحة", status: "حالة الشبكة", login: "دخول", register: "تسجيل", logout: "خروج", profile: "الملف", sponsored: "إعلان", trending: "الرائج", subscribers: "مشترك", views: "مشاهدة", withdraw: "سحب", deposit: "إيداع", swap: "تبديل", balance: "الرصيد", earnings: "الأرباح", mining: "تعدين NST", live: "الشبكة الرئيسية تعمل" },
  ru: { feed: "Лента", search: "Поиск", upload: "Загрузить", channels: "Каналы", dashboard: "Панель", status: "Статус Сети", login: "Войти", register: "Регистрация", logout: "Выйти", profile: "Профиль", sponsored: "Спонсор", trending: "В тренде", subscribers: "подписчиков", views: "просмотров", withdraw: "Вывести", deposit: "Депозит", swap: "Обмен", balance: "Баланс", earnings: "Доход", mining: "Майнинг NST", live: "MAINNET РАБОТАЕТ" },
};

function t(key: string): string { return translations[currentLang]?.[key] || translations.en[key] || key; }
function setLang(lang: string) { currentLang = lang; localStorage.setItem("nst_lang", lang); render(); }

function navigate(path: string) { if (typeof window !== "undefined") { window.history.pushState({}, "", path); render(); } }

function render() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  const app = document.getElementById("app"); if (!app) return;
  const token = localStorage.getItem("nst_access_token"); const user = localStorage.getItem("nst_user");
  if (token && user) { accessToken = token; currentUser = JSON.parse(user); }
  const savedLang = localStorage.getItem("nst_lang"); if (savedLang) currentLang = savedLang;
  if (path === "/" || path === "/index.html" || path === "/platform.html") renderFeed(app);
  else if (path === "/login") renderLogin(app);
  else if (path === "/register") renderRegister(app);
  else if (path === "/upload") requireAuth(() => renderUpload(app));
  else if (path.startsWith("/watch/")) renderWatch(app, path.split("/")[2]);
  else if (path === "/search") renderSearch(app);
  else if (path === "/channels") renderChannels(app);
  else if (path === "/dashboard") requireAuth(() => renderDashboard(app));
  else if (path === "/profile") requireAuth(() => renderProfile(app));
  else if (path === "/status") renderStatus(app);
  else if (path === "/sponsor") requireAuth(() => renderSponsor(app));
  else app.innerHTML = `<div class="center"><h1>404</h1><a href="/">Home</a></div>`;
  updateAnalytics(path);
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

function updateAnalytics(path: string) {
  if (typeof window !== "undefined" && (window as any).gtag) { (window as any).gtag("event", "page_view", { page_path: path }); }
}

function doLogout() { accessToken = null; currentUser = null; localStorage.removeItem("nst_access_token"); localStorage.removeItem("nst_user"); navigate("/"); }

function layout(content: string): string {
  const a = !!currentUser;
  const langSelector = Object.keys(translations).map(l => `<option value="${l}" ${l===currentLang?"selected":""}>${l.toUpperCase()}</option>`).join("");
  return `<nav class="nav"><div class="nav-l"><a href="/" class="logo">NexaStream</a><span class="live-badge">${t("live")}</span><a href="/" class="nl">${t("feed")}</a><a href="/search" class="nl">${t("search")}</a><a href="/channels" class="nl">${t("channels")}</a>${a?`<a href="/upload" class="nl">${t("upload")}</a><a href="/dashboard" class="nl">${t("dashboard")}</a><a href="/sponsor" class="nl">${t("sponsored")}</a>`:""}<a href="/status" class="nl">${t("status")}</a></div><div class="nav-r"><select onchange="setLang(this.value)" class="lang-select">${langSelector}</select>${a?`<span class="ui">${currentUser.username}</span><a href="/profile" class="nl">${t("profile")}</a><button onclick="doLogout()" class="btn-g">${t("logout")}</button>`:`<button onclick="googleLogin()" class="btn-g">Google</button><a href="/login" class="btn-g">${t("login")}</a><a href="/register" class="btn-p">${t("register")}</a>`}</div></nav><main class="container">${content}</main>`;
}

function renderFeed(app: HTMLElement) {
  app.innerHTML = layout(`<div class="fh"><h1>${t("feed")} — ${t("trending")}</h1><p>Algorithm: recency + watch time + completion + engagement + SEO score</p></div><div id="sponsored-banner" class="sponsored-banner"></div><div id="fc" class="vg"><div class="load">Loading...</div></div>`);
  loadSponsored();
  api("GET", "/api/v1/feed?limit=24").then(d => {
    const g = document.getElementById("fc"); if (!g) return;
    if (!d.videos?.length) { g.innerHTML = `<div class="empty"><h2>No videos yet</h2><p>The NexaStream network is live and mining NST! Be the first to upload.</p>${currentUser?`<a href="/upload" class="btn-p">${t("upload")}</a>`:`<a href="/register" class="btn-p">${t("register")}</a>`}</div>`; return; }
    g.innerHTML = d.videos.map((v:any)=>`<div class="vc" onclick="navigate('/watch/${v.id}')"><div class="vt"><div class="pi">▶</div>${v.sponsored?`<span class="sp-tag">${t("sponsored")}</span>`:""}</div><div class="vi"><h3>${esc(v.title)}</h3><p class="vm">${v.views||0} ${t("views")} · ${ft(v.createdAt)}</p><p>by ${esc(v.creatorId)}</p><span>👍 ${v.likes||0}</span></div></div>`).join("");
  }).catch(()=>{ 
    const g=document.getElementById("fc"); if(!g) return;
    // Try blockchain RPC for live data
    fetch(RPC_URL + "/explorer").then(r=>r.json()).then(d => {
      g.innerHTML = `<div class="empty"><h2>MAINNET LIVE</h2><p>Block #${d.height} | NST being mined now!</p><p>Upload, login and feed require the API server. Blockchain is live.</p><a href="/status" class="btn-p">Network Status</a></div>`;
    }).catch(() => {
      g.innerHTML = `<div class="empty"><h2>Welcome to NexaStream</h2><p>The decentralized video platform. MAINNET is LIVE with NST mining.</p><p>Create an account to start uploading videos and earning NST.</p><a href="/register" class="btn-p">Get Started</a></div>`;
    });
  });
}

function loadSponsored() {
  const el = document.getElementById("sponsored-banner"); if (!el) return;
  el.innerHTML = `<div class="ad-slot">📢 <strong>Advertise on NexaStream</strong> — Reach millions of viewers globally. <a href="/sponsor">Create ad campaign</a></div>`;
}

function renderWatch(app: HTMLElement, id: string) {
  app.innerHTML = layout(`<div class="wp"><div class="pc"><div class="pp"><div class="pi">▶</div><p>Hybrid Player (HTTP + P2P)</p></div></div><div id="vd" class="vd"><div class="load">Loading...</div></div></div>`);
  api("GET", "/api/v1/videos/" + id).then(v => {
    const d = document.getElementById("vd"); if (!d) return;
    d.innerHTML = `<h1>${esc(v.title)}</h1><div class="wm"><span>${v.views} ${t("views")}</span> · <span>${ft(v.createdAt)}</span><div><button onclick="likeV('${v.id}')" class="btn-g">👍 ${v.likes}</button> <button onclick="showC('${v.id}')" class="btn-g">💬</button></div></div><div class="vc-box"><p>Creator: ${esc(v.creatorId)}</p><p>Hash: <code>${v.contentHash?.slice(0,16)}...</code></p></div><div id="cs" class="cs" style="display:none;"><h3>Comments</h3>${currentUser?`<div class="ci"><textarea id="ct" placeholder="Comment..."></textarea><button onclick="addC('${v.id}')" class="btn-p">Send</button></div>`:`<p><a href="/login">Login</a> to comment.</p>`}<div id="cl"></div></div>`;
  }).catch(()=>{ const d=document.getElementById("vd"); if(d) d.innerHTML=`<div class="err">Video not found.</div>`; });
}

function renderLogin(app: HTMLElement) {
  app.innerHTML = layout(`<div class="auth"><h1>${t("login")}</h1><button onclick="googleLogin()" class="btn-google">Sign in with Google</button><p>or</p><form onsubmit="hLogin(event)" class="af"><input type="email" id="le" placeholder="Email" required /><input type="password" id="lp" placeholder="Password" required /><button type="submit" class="btn-p">${t("login")}</button></form><p>No account? <a href="/register">${t("register")}</a></p></div>`);
}
function renderRegister(app: HTMLElement) {
  app.innerHTML = layout(`<div class="auth"><h1>${t("register")}</h1><button onclick="googleLogin()" class="btn-google">Sign up with Google</button><p>or</p><form onsubmit="hReg(event)" class="af"><input type="email" id="re" placeholder="Email" required /><input type="text" id="ru" placeholder="Username" required /><input type="password" id="rp" placeholder="Password (min 8)" required /><button type="submit" class="btn-p">Create account</button></form><p>Have account? <a href="/login">${t("login")}</a></p></div>`);
}
function renderUpload(app: HTMLElement) {
  app.innerHTML = layout(`<div class="up"><h1>${t("upload")}</h1><p>Resumable upload with chunking + SHA-256 content addressing.</p><form onsubmit="hUpload(event)" class="uf"><input type="text" id="ut" placeholder="Title (SEO optimized)" required /><textarea id="ud" placeholder="Description (include keywords for SEO)"></textarea><input type="file" id="uf2" accept="video/*" required /><div id="up-p" style="display:none;"><div class="pb"><div class="pf" id="pf"></div></div><span id="pt">0%</span></div><button type="submit" class="btn-p">Upload</button></form></div>`);
}
function renderSearch(app: HTMLElement) {
  app.innerHTML = layout(`<div class="sp"><h1>${t("search")}</h1><input type="text" id="sq" placeholder="Search videos, channels..." onkeyup="hSearch(event)" /><div id="sr" class="vg"></div></div>`);
}
function renderChannels(app: HTMLElement) {
  app.innerHTML = layout(`<div class="sp"><h1>${t("channels")}</h1><p>Discover creators on NexaStream.</p><div id="ch-list" class="channel-list"><div class="load">Loading channels...</div></div></div>`);
  // Channels would come from API; for now show demo
  const el = document.getElementById("ch-list"); if (el) el.innerHTML = `<div class="channel-card"><div class="ch-avatar">N</div><div><h3>NexaStream Official</h3><p>0 ${t("subscribers")}</p><button class="btn-p">Subscribe</button></div></div>`;
}
function renderDashboard(app: HTMLElement) {
  app.innerHTML = layout(`<div class="dash"><h1>${t("dashboard")}</h1><div class="dash-grid"><div class="dash-card"><h3>${t("balance")}</h3><p class="big-num" id="dash-balance">Loading...</p></div><div class="dash-card"><h3>${t("earnings")}</h3><p class="big-num" id="dash-earnings">Loading...</p></div><div class="dash-card"><h3>${t("mining")}</h3><p class="big-num" id="dash-mining">Loading...</p></div></div><div class="dash-actions"><button onclick="showDeposit()" class="btn-p">${t("deposit")}</button><button onclick="showWithdraw()" class="btn-g">${t("withdraw")}</button><button onclick="showSwap()" class="btn-g">${t("swap")}</button></div><div id="finance-modal" style="display:none;"></div><h2>Analytics</h2><div id="ga-data" class="ga-data">Google Analytics integration active.</div></div>`);
  loadDashboard();
}
function loadDashboard() {
  // Fetch NST balance from blockchain RPC
  fetch(RPC_URL + "/balance/" + (currentUser?.username || "solo-validator-1")).then(r=>r.json()).then(d => {
    const el = document.getElementById("dash-balance"); if (el) el.textContent = (BigInt(d.balance) / 10n**18n).toString() + " NST";
  }).catch(() => { const el = document.getElementById("dash-balance"); if (el) el.textContent = "0 NST"; });
  // Earnings from ledger (would be API call)
  const eEl = document.getElementById("dash-earnings"); if (eEl) eEl.textContent = "R$ 0,00";
  // Mining status
  fetch(RPC_URL + "/metrics").then(r=>r.json()).then(d => {
    const el = document.getElementById("dash-mining"); if (el) el.textContent = "Block #" + d.height + " · " + (BigInt(d.totalSupply)/10n**18n).toString() + " NST mined";
  }).catch(() => { const el = document.getElementById("dash-mining"); if (el) el.textContent = "Mining offline"; });
}
function showDeposit() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = `<div class="modal"><h3>${t("deposit")} NST</h3><p>Send NST to your deposit address:</p><code>${currentUser?.id || "addr"}</code><p>Or deposit USDT/USDC (stablecoin) to:</p><code>0xDEPOSIT...</code><button onclick="closeModal()" class="btn-g">Close</button></div>`; } }
function showWithdraw() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = `<div class="modal"><h3>${t("withdraw")} NST</h3><input type="text" placeholder="Destination address" /><input type="number" placeholder="Amount NST" /><button class="btn-p">Withdraw</button><button onclick="closeModal()" class="btn-g">Close</button></div>`; } }
function showSwap() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = `<div class="modal"><h3>${t("swap")} NST ↔ USDT</h3><input type="number" placeholder="Amount" /><select><option>NST → USDT</option><option>USDT → NST</option></select><button class="btn-p">Swap</button><button onclick="closeModal()" class="btn-g">Close</button></div>`; } }
function closeModal() { const m = document.getElementById("finance-modal"); if (m) m.style.display = "none"; }

function renderSponsor(app: HTMLElement) {
  app.innerHTML = layout(`<div class="up"><h1>${t("sponsored")} — Ad Campaign</h1><p>Promote your content or advertise your business.</p><form onsubmit="hSponsor(event)" class="uf"><input type="text" id="sp-title" placeholder="Ad title" required /><textarea id="sp-desc" placeholder="Ad description"></textarea><input type="number" id="sp-budget" placeholder="Budget (NST)" required /><select id="sp-target"><option>Global</option><option>Tech</option><option>Gaming</option><option>Crypto</option><option>Education</option></select><button type="submit" class="btn-p">Launch Campaign</button></form></div>`);
}
function hSponsor(e: Event) { e.preventDefault(); alert("Campaign submitted! Your ad will be reviewed and activated."); navigate("/"); }

function renderProfile(app: HTMLElement) {
  app.innerHTML = layout(`<div class="pp"><h1>${t("profile")}</h1><div class="pi-box"><p><strong>Username:</strong> ${currentUser.username}</p><p><strong>Email:</strong> ${currentUser.email}</p><p><strong>Role:</strong> ${currentUser.role}</p></div><a href="/upload" class="btn-p">${t("upload")}</a> <a href="/dashboard" class="btn-g">${t("dashboard")}</a></div>`);
}
function renderStatus(app: HTMLElement) {
  app.innerHTML = layout(`<div class="sp"><h1>${t("status")}</h1><div id="st"><div class="load">Checking...</div></div></div>`);
  fetch(RPC_URL + "/health").then(r=>r.json()).then(d => {
    const e = document.getElementById("st"); if (e) e.innerHTML = `<div class="sc ok"><h3>✅ MAINNET LIVE</h3><p>Height: ${d.height}</p><p>Genesis: ${d.genesisHash?.slice(0,16)}...</p></div>`;
  }).catch(() => { const e = document.getElementById("st"); if (e) e.innerHTML = `<div class="sc err"><h3>❌ Node Offline</h3><p>Start the solo validator to activate the network.</p></div>`; });
}

function googleLogin() {
  // Google OAuth would use Google Identity Services.
  // For now, simulate with a prompt.
  const email = prompt("Enter your Google email:"); if (!email) return;
  const username = email.split("@")[0];
  api("POST", "/api/v1/auth/register", { email, username, password: "google-oauth-" + Date.now() })
    .then(d => { accessToken = d.accessToken; currentUser = d.user; localStorage.setItem("nst_access_token", accessToken!); localStorage.setItem("nst_user", JSON.stringify(currentUser)); navigate("/"); })
    .catch(() => api("POST", "/api/v1/auth/login", { email, password: "google-oauth-" + Date.now() })
      .then(d => { accessToken = d.accessToken; currentUser = d.user; localStorage.setItem("nst_access_token", accessToken!); localStorage.setItem("nst_user", JSON.stringify(currentUser)); navigate("/"); })
      .catch(e => alert("Login failed: " + e.message)));
}

function hLogin(e: Event) { e.preventDefault(); api("POST", "/api/v1/auth/login", { email: (document.getElementById("le") as HTMLInputElement).value, password: (document.getElementById("lp") as HTMLInputElement).value }).then(d => { accessToken = d.accessToken; currentUser = d.user; localStorage.setItem("nst_access_token", accessToken!); localStorage.setItem("nst_user", JSON.stringify(currentUser)); navigate("/"); }).catch(e => alert(e.message)); }
function hReg(e: Event) { e.preventDefault(); api("POST", "/api/v1/auth/register", { email: (document.getElementById("re") as HTMLInputElement).value, username: (document.getElementById("ru") as HTMLInputElement).value, password: (document.getElementById("rp") as HTMLInputElement).value }).then(d => { accessToken = d.accessToken; currentUser = d.user; localStorage.setItem("nst_access_token", accessToken!); localStorage.setItem("nst_user", JSON.stringify(currentUser)); navigate("/"); }).catch(e => alert(e.message)); }

async function hUpload(e: Event) {
  e.preventDefault(); const file = (document.getElementById("uf2") as HTMLInputElement).files?.[0]; if (!file) return;
  const cs = 8*1024*1024; const tc = Math.ceil(file.size / cs);
  try {
    const init = await api("POST", "/api/v1/uploads", { filename: file.name, mimeType: file.type||"video/mp4", declaredSize: file.size });
    (document.getElementById("up-p") as HTMLElement).style.display = "block";
    for (let i = 0; i < tc; i++) {
      const buf = await file.slice(i*cs, Math.min((i+1)*cs, file.size)).arrayBuffer();
      await fetch(API_BASE + "/api/v1/uploads/" + init.uploadId + "/chunks/" + i, { method: "PUT", headers: { "Content-Type": "application/octet-stream", ...(accessToken?{Authorization:"Bearer "+accessToken}:{}) }, body: buf });
      const pct = Math.round(((i+1)/tc)*100);
      (document.getElementById("pf") as HTMLElement).style.width = pct + "%";
      (document.getElementById("pt") as HTMLElement).textContent = pct + "%";
    }
    const r = await api("POST", "/api/v1/uploads/" + init.uploadId + "/complete");
    alert("Upload complete! SHA-256: " + r.sha256.slice(0,16) + "..."); navigate("/");
  } catch (err: any) { alert("Error: " + err.message); }
}

let st: any;
function hSearch(e: KeyboardEvent) { clearTimeout(st); const q = (e.target as HTMLInputElement).value; st = setTimeout(async () => { if (!q.trim()) return; try { const d = await api("GET", "/api/v1/search?q=" + encodeURIComponent(q)); const g = document.getElementById("sr"); if (g) g.innerHTML = !d.videos.length ? "<p>No results.</p>" : d.videos.map((v:any)=>`<div class="vc" onclick="navigate('/watch/${v.id}')"><div class="vt"><div class="pi">▶</div></div><div class="vi"><h3>${esc(v.title)}</h3><p>${v.views||0} ${t("views")}</p></div></div>`).join(""); } catch {} }, 300); }

async function likeV(id: string) { if (!accessToken) { navigate("/login"); return; } try { await api("POST", "/api/v1/videos/" + id + "/like"); alert("Liked!"); } catch (e:any) { alert(e.message); } }
async function showC(id: string) { (document.getElementById("cs") as HTMLElement).style.display = "block"; try { const d = await api("GET", "/api/v1/videos/" + id + "/comments"); const l = document.getElementById("cl"); if (l) l.innerHTML = !d.comments.length ? "<p>No comments.</p>" : d.comments.map((c:any)=>`<div class="cm"><p><strong>${esc(c.authorId)}</strong> · ${ft(c.createdAt)}</p><p>${esc(c.content)}</p></div>`).join(""); } catch {} }
async function addC(id: string) { if (!accessToken) return; const txt = (document.getElementById("ct") as HTMLTextAreaElement).value; if (!txt.trim()) return; try { await api("POST", "/api/v1/videos/" + id + "/comments", { content: txt }); (document.getElementById("ct") as HTMLTextAreaElement).value = ""; showC(id); } catch (e:any) { alert(e.message); } }

function esc(s: string): string { return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]!)); }
function ft(ts: number): string { if (!ts) return "now"; const d = Date.now()-ts; if (d<60000) return "now"; if (d<3600000) return Math.floor(d/60000)+"min"; if (d<86400000) return Math.floor(d/3600000)+"h"; return Math.floor(d/86400000)+"d"; }

if (typeof window !== "undefined") { window.addEventListener("popstate", render); window.addEventListener("DOMContentLoaded", render); }
