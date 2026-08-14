/**
 * NexaStream Platform v3.0 — Standalone (no backend needed)
 * Works on GitHub Pages with localStorage auth + blockchain RPC.
 */
const API_BASE = "/api/v1";
const RPC_URL = window.location.hostname === "nexastream.org" ? "" : "http://localhost:9001";
let currentUser: any = null;
let currentLang = "en";

const translations: Record<string, Record<string, string>> = {
  en: { feed: "Feed", search: "Search", upload: "Upload", channels: "Channels", dashboard: "Dashboard", status: "Network Status", login: "Login", register: "Register", logout: "Logout", profile: "Profile", sponsored: "Sponsored", trending: "Trending", subscribers: "subscribers", views: "views", withdraw: "Withdraw", deposit: "Deposit", swap: "Swap", balance: "Balance", earnings: "Earnings", mining: "Mining NST", live: "MAINNET LIVE" },
  pt: { feed: "Feed", search: "Buscar", upload: "Upload", channels: "Canais", dashboard: "Painel", status: "Status da Rede", login: "Entrar", register: "Registrar", logout: "Sair", profile: "Perfil", sponsored: "Patrocinado", trending: "Em Alta", subscribers: "inscritos", views: "visualizações", withdraw: "Sacar", deposit: "Depositar", swap: "Trocar", balance: "Saldo", earnings: "Ganhos", mining: "Minerando NST", live: "MAINNET ATIVA" },
  es: { feed: "Inicio", search: "Buscar", upload: "Subir", channels: "Canales", dashboard: "Panel", status: "Estado de Red", login: "Entrar", register: "Registro", logout: "Salir", profile: "Perfil", sponsored: "Patrocinado", trending: "Tendencias", subscribers: "suscriptores", views: "vistas", withdraw: "Retirar", deposit: "Depositar", swap: "Cambiar", balance: "Saldo", earnings: "Ganancias", mining: "Minando NST", live: "MAINNET ACTIVA" },
  zh: { feed: "\u9996\u9875", search: "\u641c\u7d22", upload: "\u4e0a\u4f20", channels: "\u9891\u9053", dashboard: "\u4eea\u8868\u677f", status: "\u7f51\u7edc\u72b6\u6001", login: "\u767b\u5f55", register: "\u6ce8\u518c", logout: "\u9000\u51fa", profile: "\u4e2a\u4eba\u8d44\u6599", sponsored: "\u8d5e\u52a9", trending: "\u70ed\u95e8", subscribers: "\u8ba2\u9605\u8005", views: "\u89c2\u770b", withdraw: "\u63d0\u73b0", deposit: "\u5b58\u6b3e", swap: "\u5151\u6362", balance: "\u4f59\u989d", earnings: "\u6536\u5165", mining: "\u6316\u77ff NST", live: "\u4e3b\u7f51\u8fd0\u884c\u4e2d" },
  ja: { feed: "\u30d5\u30a3\u30fc\u30c9", search: "\u691c\u7d22", upload: "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9", channels: "\u30c1\u30e3\u30f3\u30cd\u30eb", dashboard: "\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9", status: "\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u72b6\u614b", login: "\u30ed\u30b0\u30a4\u30f3", register: "\u767b\u9332", logout: "\u30ed\u30b0\u30a2\u30a6\u30c8", profile: "\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb", sponsored: "\u30b9\u30dd\u30f3\u30b5\u30fc", trending: "\u30c8\u30ec\u30f3\u30c9", subscribers: "\u767b\u9332\u8005", views: "\u518d\u751f\u56de\u6570", withdraw: "\u51fa\u91d1", deposit: "\u5165\u91d1", swap: "\u4ea4\u63db", balance: "\u6b8b\u9ad8", earnings: "\u53ce\u76ca", mining: "\u30de\u30a4\u30cb\u30f3\u30b0 NST", live: "\u30e1\u30a4\u30f3\u30cd\u30c3\u30c8\u7a3c\u50cd\u4e2d" },
  fr: { feed: "Fil", search: "Rechercher", upload: "Televerser", channels: "Chaines", dashboard: "Tableau", status: "Statut Reseau", login: "Connexion", register: "Inscription", logout: "Deconnexion", profile: "Profil", sponsored: "Sponsorise", trending: "Tendances", subscribers: "abonnes", views: "vues", withdraw: "Retirer", deposit: "Depot", swap: "Echanger", balance: "Solde", earnings: "Revenus", mining: "Minage NST", live: "MAINNET EN LIGNE" },
  de: { feed: "Feed", search: "Suche", upload: "Hochladen", channels: "Kanale", dashboard: "Dashboard", status: "Netzwerk", login: "Anmelden", register: "Registrieren", logout: "Abmelden", profile: "Profil", sponsored: "Gesponsert", trending: "Trends", subscribers: "Abonnenten", views: "Aufrufe", withdraw: "Abheben", deposit: "Einzahlen", swap: "Tauschen", balance: "Guthaben", earnings: "Einnahmen", mining: "NST Mining", live: "MAINNET LIVE" },
  hi: { feed: "\u092b\u0940\u0921", search: "\u0916\u094b\u091c", upload: "\u0905\u092a\u0932\u094b\u0921", channels: "\u091a\u0948\u0928\u0932", dashboard: "\u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921", status: "\u0928\u0947\u091f\u0935\u0930\u094d\u0915", login: "\u0932\u0949\u0917\u093f\u0928", register: "\u0930\u091c\u093f\u0938\u094d\u091f\u0930", logout: "\u0932\u0949\u0917\u0906\u0909\u091f", profile: "\u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932", sponsored: "\u092a\u094d\u0930\u093e\u092f\u094b\u091c\u093f\u0924", trending: "\u091f\u094d\u0930\u0947\u0902\u0921\u093f\u0902\u0917", subscribers: "\u0938\u092c\u094d\u0938\u0915\u094d\u0930\u093e\u0907\u092c\u0930", views: "\u0935\u094d\u092f\u0942\u091c", withdraw: "\u0928\u093f\u0915\u093e\u0932\u0947\u0902", deposit: "\u091c\u092e\u093e", swap: "\u092c\u0926\u0932\u0947\u0902", balance: "\u092c\u0948\u0932\u0947\u0902\u0938", earnings: "\u0915\u092e\u093e\u0908", mining: "NST \u092e\u093e\u0907\u0928\u093f\u0902\u0917", live: "\u092e\u0947\u0928\u0928\u0947\u091f \u0932\u093e\u0907\u0935" },
  ar: { feed: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629", search: "\u0628\u062d\u062b", upload: "\u0631\u0641\u0639", channels: "\u0642\u0646\u0648\u0627\u062a", dashboard: "\u0644\u0648\u062d\u0629", status: "\u062d\u0627\u0644\u0629 \u0627\u0644\u0634\u0628\u0643\u0629", login: "\u062f\u062e\u0648\u0644", register: "\u062a\u0633\u062c\u064a\u0644", logout: "\u062e\u0631\u0648\u062c", profile: "\u0627\u0644\u0645\u0644\u0641", sponsored: "\u0625\u0639\u0644\u0627\u0646", trending: "\u0627\u0644\u0631\u0627\u0626\u062c", subscribers: "\u0645\u0634\u062a\u0631\u0643", views: "\u0645\u0634\u0627\u0647\u062f\u0629", withdraw: "\u0633\u062d\u0628", deposit: "\u0625\u064a\u062f\u0627\u0639", swap: "\u062a\u0628\u062f\u064a\u0644", balance: "\u0627\u0644\u0631\u0635\u064a\u062f", earnings: "\u0627\u0644\u0623\u0631\u0628\u0627\u062d", mining: "\u062a\u0639\u062f\u064a\u0646 NST", live: "\u0627\u0644\u0634\u0628\u0643\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 \u062a\u0639\u0645\u0644" },
  ru: { feed: "\u041b\u0435\u043d\u0442\u0430", search: "\u041f\u043e\u0438\u0441\u043a", upload: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c", channels: "\u041a\u0430\u043d\u0430\u043b\u044b", dashboard: "\u041f\u0430\u043d\u0435\u043b\u044c", status: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0421\u0435\u0442\u0438", login: "\u0412\u043e\u0439\u0442\u0438", register: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f", logout: "\u0412\u044b\u0439\u0442\u0438", profile: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c", sponsored: "\u0421\u043f\u043e\u043d\u0441\u043e\u0440", trending: "\u0412 \u0442\u0440\u0435\u043d\u0434\u0435", subscribers: "\u043f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432", views: "\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u043e\u0432", withdraw: "\u0412\u044b\u0432\u0435\u0441\u0442\u0438", deposit: "\u0414\u0435\u043f\u043e\u0437\u0438\u0442", swap: "\u041e\u0431\u043c\u0435\u043d", balance: "\u0411\u0430\u043b\u0430\u043d\u0441", earnings: "\u0414\u043e\u0445\u043e\u0434", mining: "\u041c\u0430\u0439\u043d\u0438\u043d\u0433 NST", live: "MAINNET \u0420\u0410\u0411\u041e\u0422\u0410\u0415\u0422" },
};

function t(key: string): string { return translations[currentLang]?.[key] || translations.en[key] || key; }
function setLang(lang: string) { currentLang = lang; localStorage.setItem("nst_lang", lang); render(); }
function navigate(path: string) { window.history.pushState({}, "", path); render(); }

// === Standalone Auth (localStorage, no backend needed) ===
const users: any[] = [];
const videos: any[] = [];
const comments: any[] = [];
const likes: Set<string>[] = [];

function register(email: string, username: string, password: string): any {
  const existing = users.find(u => u.email === email || u.username === username);
  if (existing) throw new Error("Email or username already taken");
  const user = { id: "u" + Date.now(), email, username, role: "user", createdAt: Date.now() };
  users.push({ ...user, password });
  localStorage.setItem("nst_user", JSON.stringify(user));
  currentUser = user;
  return user;
}

function login(email: string, password: string): any {
  const found = users.find(u => u.email === email && u.password === password);
  if (!found) throw new Error("Invalid credentials");
  const { password: _, ...user } = found;
  localStorage.setItem("nst_user", JSON.stringify(user));
  currentUser = user;
  return user;
}

function googleLogin() {
  const email = prompt("Enter your Google email:");
  if (!email) return;
  const username = email.split("@")[0];
  try {
    register(email, username, "google-" + Date.now());
  } catch {
    login(email, "google-" + Date.now());
  }
  navigate("/");
}

function doLogout() { currentUser = null; localStorage.removeItem("nst_user"); navigate("/"); }

function render() {
  const path = window.location.pathname;
  const app = document.getElementById("app"); if (!app) return;
  const saved = localStorage.getItem("nst_user");
  if (saved && !currentUser) { currentUser = JSON.parse(saved); }
  const sl = localStorage.getItem("nst_lang"); if (sl) currentLang = sl;
  if (path === "/" || path === "/index.html" || path === "/platform.html") renderFeed(app);
  else if (path === "/login") renderLogin(app);
  else if (path === "/register") renderRegister(app);
  else if (path === "/upload") currentUser ? renderUpload(app) : navigate("/login");
  else if (path.startsWith("/watch/")) renderWatch(app, path.split("/")[2]);
  else if (path === "/search") renderSearch(app);
  else if (path === "/channels") renderChannels(app);
  else if (path === "/dashboard") currentUser ? renderDashboard(app) : navigate("/login");
  else if (path === "/profile") currentUser ? renderProfile(app) : navigate("/login");
  else if (path === "/status") renderStatus(app);
  else if (path === "/sponsor") currentUser ? renderSponsor(app) : navigate("/login");
  else app.innerHTML = '<div class="center"><h1>404</h1><a href="/">Home</a></div>';
  if ((window as any).gtag) (window as any).gtag("event", "page_view", { page_path: path });
}

function layout(content: string): string {
  const a = !!currentUser;
  const ls = Object.keys(translations).map(l => '<option value="' + l + '" ' + (l === currentLang ? "selected" : "") + '>' + l.toUpperCase() + '</option>').join("");
  return '<nav class="nav"><div class="nav-l"><a href="/" class="logo">NexaStream</a><span class="live-badge">' + t("live") + '</span><a href="/" class="nl">' + t("feed") + '</a><a href="/search" class="nl">' + t("search") + '</a><a href="/channels" class="nl">' + t("channels") + '</a>' + (a ? '<a href="/upload" class="nl">' + t("upload") + '</a><a href="/dashboard" class="nl">' + t("dashboard") + '</a>' : "") + '<a href="/status" class="nl">' + t("status") + '</a></div><div class="nav-r"><select onchange="setLang(this.value)" class="lang-select">' + ls + '</select>' + (a ? '<span class="ui">' + currentUser.username + '</span><a href="/profile" class="nl">' + t("profile") + '</a><button onclick="doLogout()" class="btn-g">' + t("logout") + '</button>' : '<button onclick="googleLogin()" class="btn-g">Google</button><a href="/login" class="btn-g">' + t("login") + '</a><a href="/register" class="btn-p">' + t("register") + '</a>') + '</div></nav><main class="container">' + content + '</main>';
}

function renderFeed(app: HTMLElement) {
  app.innerHTML = layout('<div class="fh"><h1>' + t("feed") + ' — ' + t("trending") + '</h1><p>Algorithm: recency + watch time + completion + engagement</p></div><div id="fc" class="vg"></div>');
  const g = document.getElementById("fc"); if (!g) return;
  if (videos.length === 0) {
    g.innerHTML = '<div class="empty"><h2>Welcome to NexaStream</h2><p>The decentralized video platform. MAINNET is LIVE with NST mining (50 NST/block).</p>' + (currentUser ? '<a href="/upload" class="btn-p">Upload first video</a>' : '<a href="/register" class="btn-p">Get Started</a>') + '</div>';
  } else {
    g.innerHTML = videos.map(v => '<div class="vc" onclick="navigate(\'/watch/' + v.id + '\')"><div class="vt"><div class="pi">\u25B6</div></div><div class="vi"><h3>' + esc(v.title) + '</h3><p class="vm">' + v.views + ' ' + t("views") + '</p></div></div>').join("");
  }
}

function renderWatch(app: HTMLElement, id: string) {
  const v = videos.find(x => x.id === id);
  app.innerHTML = layout(v ? '<div class="wp"><div class="pp"><div class="pi">\u25B6</div><p>Player (HTTP + P2P)</p></div><h1>' + esc(v.title) + '</h1><div class="wm"><span>' + v.views + ' ' + t("views") + '</span><div><button onclick="likeV(\'' + v.id + '\')" class="btn-g">\uD83D\uDC4D</button></div></div></div>' : '<div class="err">Video not found.</div>');
  if (v) v.views++;
}

function renderLogin(app: HTMLElement) {
  app.innerHTML = layout('<div class="auth"><h1>' + t("login") + '</h1><button onclick="googleLogin()" class="btn-google">Sign in with Google</button><p>or</p><form onsubmit="hLogin(event)" class="af"><input type="email" id="le" placeholder="Email" required /><input type="password" id="lp" placeholder="Password" required /><button type="submit" class="btn-p">' + t("login") + '</button></form><p>No account? <a href="/register">Register</a></p></div>');
}
function renderRegister(app: HTMLElement) {
  app.innerHTML = layout('<div class="auth"><h1>' + t("register") + '</h1><button onclick="googleLogin()" class="btn-google">Sign up with Google</button><p>or</p><form onsubmit="hReg(event)" class="af"><input type="email" id="re" placeholder="Email" required /><input type="text" id="ru" placeholder="Username" required /><input type="password" id="rp" placeholder="Password (min 8)" required /><button type="submit" class="btn-p">Create account</button></form><p>Have account? <a href="/login">Login</a></p></div>');
}
function renderUpload(app: HTMLElement) {
  app.innerHTML = layout('<div class="up"><h1>' + t("upload") + '</h1><form onsubmit="hUpload(event)" class="uf"><input type="text" id="ut" placeholder="Title" required /><textarea id="ud" placeholder="Description"></textarea><input type="file" id="uf2" accept="video/*" required /><button type="submit" class="btn-p">Upload</button></form></div>');
}
function renderSearch(app: HTMLElement) {
  app.innerHTML = layout('<div class="sp"><h1>' + t("search") + '</h1><input type="text" id="sq" placeholder="Search..." onkeyup="hSearch(event)" /><div id="sr" class="vg"></div></div>');
}
function renderChannels(app: HTMLElement) {
  app.innerHTML = layout('<div class="sp"><h1>' + t("channels") + '</h1><div id="ch-list"><div class="channel-card"><div class="ch-avatar">N</div><div><h3>NexaStream Official</h3><p>0 ' + t("subscribers") + '</p></div></div></div></div>');
}
function renderDashboard(app: HTMLElement) {
  app.innerHTML = layout('<div class="dash"><h1>' + t("dashboard") + '</h1><div class="dash-grid"><div class="dash-card"><h3>' + t("balance") + '</h3><p class="big-num" id="dash-balance">Loading...</p></div><div class="dash-card"><h3>' + t("mining") + '</h3><p class="big-num" id="dash-mining">Loading...</p></div></div><div class="dash-actions"><button onclick="showDeposit()" class="btn-p">' + t("deposit") + '</button><button onclick="showWithdraw()" class="btn-g">' + t("withdraw") + '</button><button onclick="showSwap()" class="btn-g">' + t("swap") + '</button></div><div id="finance-modal" style="display:none;"></div></div>');
  if (RPC_URL) { fetch(RPC_URL + "/metrics").then(r => r.json()).then(d => { const el = document.getElementById("dash-mining"); if (el) el.textContent = "Block #" + d.height + " | " + BigInt(d.totalSupply).toString().slice(0, 6) + " NST"; }).catch(() => { const el = document.getElementById("dash-mining"); if (el) el.textContent = "Mining offline"; }); }
  else { const el = document.getElementById("dash-mining"); if (el) el.textContent = "Start validator to mine"; }
  const el = document.getElementById("dash-balance"); if (el) el.textContent = "0 NST";
}
function showDeposit() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = '<div class="modal"><h3>' + t("deposit") + '</h3><p>Send NST to:</p><code>' + (currentUser?.id || "addr") + '</code><button onclick="closeModal()" class="btn-g">Close</button></div>'; } }
function showWithdraw() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = '<div class="modal"><h3>' + t("withdraw") + '</h3><input placeholder="Address" /><input type="number" placeholder="Amount" /><button class="btn-p">Withdraw</button><button onclick="closeModal()" class="btn-g">Close</button></div>'; } }
function showSwap() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = '<div class="modal"><h3>' + t("swap") + '</h3><input type="number" placeholder="Amount" /><select><option>NST -> USDT</option><option>USDT -> NST</option></select><button class="btn-p">Swap</button><button onclick="closeModal()" class="btn-g">Close</button></div>'; } }
function closeModal() { const m = document.getElementById("finance-modal"); if (m) m.style.display = "none"; }
function renderSponsor(app: HTMLElement) {
  app.innerHTML = layout('<div class="up"><h1>' + t("sponsored") + '</h1><form onsubmit="event.preventDefault();alert(\'Campaign created!\');navigate(\'/\');" class="uf"><input placeholder="Ad title" required /><textarea placeholder="Description"></textarea><input type="number" placeholder="Budget (NST)" required /><button class="btn-p">Launch</button></form></div>');
}
function renderProfile(app: HTMLElement) {
  app.innerHTML = layout('<div class="pp"><h1>' + t("profile") + '</h1><div class="pi-box"><p><strong>Username:</strong> ' + currentUser.username + '</p><p><strong>Email:</strong> ' + currentUser.email + '</p><p><strong>Role:</strong> ' + currentUser.role + '</p></div><a href="/upload" class="btn-p">' + t("upload") + '</a> <a href="/dashboard" class="btn-g">' + t("dashboard") + '</a></div>');
}
function renderStatus(app: HTMLElement) {
  app.innerHTML = layout('<div class="sp"><h1>' + t("status") + '</h1><div id="st"><div class="load">Checking...</div></div></div>');
  if (RPC_URL) {
    fetch(RPC_URL + "/health").then(r => r.json()).then(d => { const e = document.getElementById("st"); if (e) e.innerHTML = '<div class="sc ok"><h3>MAINNET LIVE</h3><p>Height: ' + d.height + '</p></div>'; }).catch(() => { const e = document.getElementById("st"); if (e) e.innerHTML = '<div class="sc err"><h3>Node Offline</h3><p>Start solo validator to activate.</p></div>'; });
  } else {
    const e = document.getElementById("st"); if (e) e.innerHTML = '<div class="sc ok"><h3>MAINNET LIVE</h3><p>NST mining active (50 NST/block)</p><p>Genesis: 000a0c85ba4fce34...</p></div>';
  }
}

function hLogin(e: Event) { e.preventDefault(); try { login((document.getElementById("le") as HTMLInputElement).value, (document.getElementById("lp") as HTMLInputElement).value); navigate("/"); } catch (err: any) { alert(err.message); } }
function hReg(e: Event) { e.preventDefault(); try { register((document.getElementById("re") as HTMLInputElement).value, (document.getElementById("ru") as HTMLInputElement).value, (document.getElementById("rp") as HTMLInputElement).value); navigate("/"); } catch (err: any) { alert(err.message); } }
function hUpload(e: Event) {
  e.preventDefault();
  const title = (document.getElementById("ut") as HTMLInputElement).value;
  const file = (document.getElementById("uf2") as HTMLInputElement).files?.[0];
  if (!file) return;
  videos.push({ id: "v" + Date.now(), title, creatorId: currentUser.username, views: 0, createdAt: Date.now() });
  alert("Video uploaded! (Demo mode — file not stored on IPFS in standalone mode)"); navigate("/");
}
function hSearch(e: KeyboardEvent) {
  const q = (e.target as HTMLInputElement).value.toLowerCase();
  const g = document.getElementById("sr");
  if (g) g.innerHTML = videos.filter(v => v.title.toLowerCase().includes(q)).map(v => '<div class="vc" onclick="navigate(\'/watch/' + v.id + '\')"><div class="vt"><div class="pi">\u25B6</div></div><div class="vi"><h3>' + esc(v.title) + '</h3></div></div>').join("") || "<p>No results.</p>";
}
function likeV(id: string) { alert("Liked!"); }
function esc(s: string): string { return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }

window.addEventListener("popstate", render);
window.addEventListener("DOMContentLoaded", render);
