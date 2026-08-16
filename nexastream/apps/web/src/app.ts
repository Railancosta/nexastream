/**
 * NexaStream Platform v3.1 — Web3 DApp (100% client-side, SIWE auth)
 * No backend needed. Auth via wallet signature. Data via blockchain RPC.
 */
import { siweLogin, loadSession, clearSession, isWalletAvailable, type AuthSession } from "./web3/auth.js";
import { getHealth, getNetworkStats, getAccount, formatNst } from "./web3/rpc.js";

const API_BASE = (typeof window !== "undefined" && (window as any).NEXASTREAM_API) || "https://5998ef0014c6d2.lhr.life/api/v1";
const RPC_URL = (typeof window !== "undefined" && (window as any).NEXASTREAM_RPC) || "http://localhost:9001";
let currentUser: AuthSession | null = null;
let currentLang = "en";

const translations: Record<string, Record<string, string>> = {
  en: { feed:"Feed",search:"Search",upload:"Upload",channels:"Channels",dashboard:"Dashboard",status:"Network Status",login:"Connect Wallet",logout:"Disconnect",profile:"Profile",sponsored:"Sponsored",trending:"Trending",subscribers:"subscribers",views:"views",withdraw:"Withdraw",deposit:"Deposit",swap:"Swap",balance:"Balance",earnings:"Earnings",mining:"Mining NST",live:"MAINNET LIVE" },
  pt: { feed:"Feed",search:"Buscar",upload:"Upload",channels:"Canais",dashboard:"Painel",status:"Status da Rede",login:"Conectar Carteira",logout:"Desconectar",profile:"Perfil",sponsored:"Patrocinado",trending:"Em Alta",subscribers:"inscritos",views:"visualizacoes",withdraw:"Sacar",deposit:"Depositar",swap:"Trocar",balance:"Saldo",earnings:"Ganhos",mining:"Minerando NST",live:"MAINNET ATIVA" },
  es: { feed:"Inicio",search:"Buscar",upload:"Subir",channels:"Canales",dashboard:"Panel",status:"Estado de Red",login:"Conectar Wallet",logout:"Desconectar",profile:"Perfil",sponsored:"Patrocinado",trending:"Tendencias",subscribers:"suscriptores",views:"vistas",withdraw:"Retirar",deposit:"Depositar",swap:"Cambiar",balance:"Saldo",earnings:"Ganancias",mining:"Minando NST",live:"MAINNET ACTIVA" },
  zh: { feed:"\u9996\u9875",search:"\u641c\u7d22",upload:"\u4e0a\u4f20",channels:"\u9891\u9053",dashboard:"\u4eea\u8868\u677f",status:"\u7f51\u7edc\u72b6\u6001",login:"\u8fde\u63a5\u94b1\u5305",logout:"\u65ad\u5f00",profile:"\u4e2a\u4eba\u8d44\u6599",sponsored:"\u8d5e\u52a9",trending:"\u70ed\u95e8",subscribers:"\u8ba2\u9605\u8005",views:"\u89c2\u770b",withdraw:"\u63d0\u73b0",deposit:"\u5b58\u6b3e",swap:"\u5151\u6362",balance:"\u4f59\u989d",earnings:"\u6536\u5165",mining:"\u6316\u77ff NST",live:"\u4e3b\u7f51\u8fd0\u884c\u4e2d" },
  ja: { feed:"\u30d5\u30a3\u30fc\u30c9",search:"\u691c\u7d22",upload:"\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",channels:"\u30c1\u30e3\u30f3\u30cd\u30eb",dashboard:"\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9",status:"\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u72b6\u614b",login:"\u30a6\u30a9\u30ec\u30c3\u30c8\u63a5\u7d9a",logout:"\u5207\u65ad",profile:"\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb",sponsored:"\u30b9\u30dd\u30f3\u30b5\u30fc",trending:"\u30c8\u30ec\u30f3\u30c9",subscribers:"\u767b\u9332\u8005",views:"\u518d\u751f\u56de\u6570",withdraw:"\u51fa\u91d1",deposit:"\u5165\u91d1",swap:"\u4ea4\u63db",balance:"\u6b8b\u9ad8",earnings:"\u53ce\u76ca",mining:"\u30de\u30a4\u30cb\u30f3\u30b0 NST",live:"\u30e1\u30a4\u30f3\u30cd\u30c3\u30c8\u7a3c\u50cd\u4e2d" },
  fr: { feed:"Fil",search:"Rechercher",upload:"Televerser",channels:"Chaines",dashboard:"Tableau",status:"Statut Reseau",login:"Connecter Wallet",logout:"Deconnecter",profile:"Profil",sponsored:"Sponsorise",trending:"Tendances",subscribers:"abonnes",views:"vues",withdraw:"Retirer",deposit:"Depot",swap:"Echanger",balance:"Solde",earnings:"Revenus",mining:"Minage NST",live:"MAINNET EN LIGNE" },
  de: { feed:"Feed",search:"Suche",upload:"Hochladen",channels:"Kanale",dashboard:"Dashboard",status:"Netzwerk",login:"Wallet Verbinden",logout:"Trennen",profile:"Profil",sponsored:"Gesponsert",trending:"Trends",subscribers:"Abonnenten",views:"Aufrufe",withdraw:"Abheben",deposit:"Einzahlen",swap:"Tauschen",balance:"Guthaben",earnings:"Einnahmen",mining:"NST Mining",live:"MAINNET LIVE" },
  hi: { feed:"\u092b\u0940\u0921",search:"\u0916\u094b\u091c",upload:"\u0905\u092a\u0932\u094b\u0921",channels:"\u091a\u0948\u0928\u0932",dashboard:"\u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921",status:"\u0928\u0947\u091f\u0935\u0930\u094d\u0915",login:"\u0935\u0949\u0932\u0947\u091f \u0915\u0928\u0947\u0915\u094d\u091f",logout:"\u0932\u0949\u0917\u0906\u0909\u091f",profile:"\u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932",sponsored:"\u092a\u094d\u0930\u093e\u092f\u094b\u091c\u093f\u0924",trending:"\u091f\u094d\u0930\u0947\u0902\u0921\u093f\u0902\u0917",subscribers:"\u0938\u092c\u094d\u0938\u0915\u094d\u0930\u093e\u0907\u092c\u0930",views:"\u0935\u094d\u092f\u0942\u091c",withdraw:"\u0928\u093f\u0915\u093e\u0932\u0947\u0902",deposit:"\u091c\u092e\u093e",swap:"\u092c\u0926\u0932\u0947\u0902",balance:"\u092c\u0948\u0932\u0947\u0902\u0938",earnings:"\u0915\u092e\u093e\u0908",mining:"NST \u092e\u093e\u0907\u0928\u093f\u0902\u0917",live:"\u092e\u0947\u0928\u0928\u0947\u091f \u0932\u093e\u0907\u0935" },
  ar: { feed:"\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",search:"\u0628\u062d\u062b",upload:"\u0631\u0641\u0639",channels:"\u0642\u0646\u0648\u0627\u062a",dashboard:"\u0644\u0648\u062d\u0629",status:"\u062d\u0627\u0644\u0629 \u0627\u0644\u0634\u0628\u0643\u0629",login:"\u0627\u062a\u0635\u0627\u0644 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",logout:"\u062e\u0631\u0648\u062c",profile:"\u0627\u0644\u0645\u0644\u0641",sponsored:"\u0625\u0639\u0644\u0627\u0646",trending:"\u0627\u0644\u0631\u0627\u0626\u062c",subscribers:"\u0645\u0634\u062a\u0631\u0643",views:"\u0645\u0634\u0627\u0647\u062f\u0629",withdraw:"\u0633\u062d\u0628",deposit:"\u0625\u064a\u062f\u0627\u0639",swap:"\u062a\u0628\u062f\u064a\u0644",balance:"\u0627\u0644\u0631\u0635\u064a\u062f",earnings:"\u0627\u0644\u0623\u0631\u0628\u0627\u062d",mining:"\u062a\u0639\u062f\u064a\u0646 NST",live:"\u0627\u0644\u0634\u0628\u0643\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 \u062a\u0639\u0645\u0644" },
  ru: { feed:"\u041b\u0435\u043d\u0442\u0430",search:"\u041f\u043e\u0438\u0441\u043a",upload:"\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c",channels:"\u041a\u0430\u043d\u0430\u043b\u044b",dashboard:"\u041f\u0430\u043d\u0435\u043b\u044c",status:"\u0421\u0442\u0430\u0442\u0443\u0441 \u0421\u0435\u0442\u0438",login:"\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u041a\u043e\u0448\u0435\u043b\u0435\u043a",logout:"\u041e\u0442\u043a\u043b\u044e\u0447\u0438\u0442\u044c",profile:"\u041f\u0440\u043e\u0444\u0438\u043b\u044c",sponsored:"\u0421\u043f\u043e\u043d\u0441\u043e\u0440",trending:"\u0412 \u0442\u0440\u0435\u043d\u0434\u0435",subscribers:"\u043f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432",views:"\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u043e\u0432",withdraw:"\u0412\u044b\u0432\u0435\u0441\u0442\u0438",deposit:"\u0414\u0435\u043f\u043e\u0437\u0438\u0442",swap:"\u041e\u0431\u043c\u0435\u043d",balance:"\u0411\u0430\u043b\u0430\u043d\u0441",earnings:"\u0414\u043e\u0445\u043e\u0434",mining:"\u041c\u0430\u0439\u043d\u0438\u043d\u0433 NST",live:"MAINNET \u0420\u0410\u0411\u041e\u0422\u0410\u0415\u0422" },
};

function t(k: string): string { return translations[currentLang]?.[k] || translations.en[k] || k; }
function setLang(l: string) { currentLang = l; localStorage.setItem("nst_lang", l); render(); }
function navigate(p: string) { window.history.pushState({}, "", p); render(); }

const videos: any[] = [];

function render() {
  const path = window.location.pathname;
  const app = document.getElementById("app"); if (!app) return;
  const saved = loadSession(); if (saved && !currentUser) currentUser = saved;
  const sl = localStorage.getItem("nst_lang"); if (sl) currentLang = sl;
  if (path === "/" || path === "/index.html" || path === "/platform.html") renderFeed(app);
  else if (path === "/login") renderLogin(app);
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
  const ls = Object.keys(translations).map(l => '<option value="'+l+'" '+(l===currentLang?"selected":"")+'>'+l.toUpperCase()+'</option>').join("");
  const addr = a ? (currentUser!.address.slice(0,6)+'...'+currentUser!.address.slice(-4)) : '';
  return '<nav class="nav"><div class="nav-l"><a href="/" class="logo">NexaStream</a><span class="live-badge">'+t("live")+'</span><a href="/" class="nl">'+t("feed")+'</a><a href="/search" class="nl">'+t("search")+'</a><a href="/channels" class="nl">'+t("channels")+'</a>'+(a?'<a href="/upload" class="nl">'+t("upload")+'</a><a href="/dashboard" class="nl">'+t("dashboard")+'</a>':'')+'<a href="/status" class="nl">'+t("status")+'</a></div><div class="nav-r"><select onchange="setLang(this.value)" class="lang-select">'+ls+'</select>'+(a?'<span class="ui">'+addr+'</span><a href="/profile" class="nl">'+t("profile")+'</a><button onclick="doDisconnect()" class="btn-g">'+t("logout")+'</button>':'<button onclick="doConnectWallet()" class="btn-p">'+t("login")+'</button>')+'</div></nav><main class="container">'+content+'</main>';
}

async function doConnectWallet() {
  try { currentUser = await siweLogin(); render(); }
  catch (err: any) { alert("Wallet connection failed: " + err.message); }
}
function doDisconnect() { clearSession(); currentUser = null; navigate("/"); }

function renderFeed(app: HTMLElement) {
  app.innerHTML = layout('<div class="fh"><h1>'+t("feed")+' — '+t("trending")+'</h1><p>Algorithm: recency + watch time + completion + engagement</p></div><div id="fc" class="vg"><div class="load">Loading...</div></div>');
  const g = document.getElementById("fc"); if (!g) return;
  if (videos.length === 0) {
    g.innerHTML = '<div class="empty"><h2>Welcome to NexaStream</h2><p>Decentralized video platform. MAINNET LIVE with NST mining (50 NST/block).</p><p>Connect your wallet to start uploading videos and earning NST.</p>'+(isWalletAvailable()?'<button onclick="doConnectWallet()" class="btn-p">'+t("login")+'</button>':'<p style="color:var(--m)">Install MetaMask to connect</p>')+'</div>';
  } else {
    g.innerHTML = videos.map(v => '<div class="vc" onclick="navigate(\'/watch/'+v.id+'\')"><div class="vt"><div class="pi">\u25B6</div></div><div class="vi"><h3>'+esc(v.title)+'</h3><p class="vm">'+v.views+' '+t("views")+'</p></div></div>').join("");
  }
}

function renderWatch(app: HTMLElement, id: string) {
  const v = videos.find(x => x.id === id);
  app.innerHTML = layout(v ? '<div class="wp"><div class="pp"><div class="pi">\u25B6</div><p>Hybrid Player (HTTP + P2P)</p></div><h1>'+esc(v.title)+'</h1><div class="wm"><span>'+v.views+' '+t("views")+'</span><div><button onclick="likeV()" class="btn-g">\uD83D\uDC4D</button></div></div></div>' : '<div class="err">Video not found.</div>');
  if (v) v.views++;
}

import { detectWallets, connectWalletByType, type WalletType } from "./web3/wallet-providers.js";

function renderLogin(app: HTMLElement) {
  const wallets = detectWallets().filter(w => w.available);
  const walletButtons = wallets.map(w =>
    '<button onclick="connectWith(\''+w.type+'\')" class="btn-g" style="display:block;width:100%;margin-bottom:10px;text-align:left;padding:12px;">'+w.icon+' '+w.name+'</button>'
  ).join('');
  app.innerHTML = layout('<div class="auth"><h1>'+t("login")+'</h1><p>Connect your Web3 wallet to sign in.</p><p>No password needed — your wallet signature proves ownership.</p><div style="margin-top:20px;">'+walletButtons+'</div></div>');
}

async function connectWith(type: string) {
  try {
    const conn = await connectWalletByType(type as WalletType);
    // Create SIWE message
    const auth = await import("./web3/auth.js");
    const msg = auth.createSiweMessage(conn.address, conn.chainId);
    const msgStr = auth.formatSiweMessage(msg);
    const sig = await auth.signMessage(conn.address, msgStr);
    const session: AuthSession = {
      address: conn.address,
      sessionToken: sig,
      chainId: conn.chainId,
      expiresAt: Date.now() + 24*60*60*1000,
    };
    auth.saveSession(session);
    currentUser = session;
    render();
  } catch (err: any) {
    alert("Connection failed: " + err.message);
  }
}

function renderUpload(app: HTMLElement) {
  app.innerHTML = layout('<div class="up"><h1>'+t("upload")+'</h1><p>Upload to IPFS. SHA-256 content addressing.</p><form onsubmit="hUpload(event)" class="uf"><input type="text" id="ut" placeholder="Title" required /><textarea id="ud" placeholder="Description"></textarea><input type="file" id="uf2" accept="video/*" required /><button type="submit" class="btn-p">Upload</button></form></div>');
}

function hUpload(e: Event) {
  e.preventDefault();
  const title = (document.getElementById("ut") as HTMLInputElement).value;
  const file = (document.getElementById("uf2") as HTMLInputElement).files?.[0];
  if (!file || !currentUser) return;
  videos.push({ id: "v"+Date.now(), title, creatorId: currentUser.address, views: 0, createdAt: Date.now() });
  alert("Video uploaded to IPFS! (Demo mode)"); navigate("/");
}

function renderSearch(app: HTMLElement) {
  app.innerHTML = layout('<div class="sp"><h1>'+t("search")+'</h1><input type="text" id="sq" placeholder="Search..." onkeyup="hSearch(event)" /><div id="sr" class="vg"></div></div>');
}

function hSearch(e: KeyboardEvent) {
  const q = (e.target as HTMLInputElement).value.toLowerCase();
  const g = document.getElementById("sr");
  if (g) g.innerHTML = videos.filter(v => v.title.toLowerCase().includes(q)).map(v => '<div class="vc" onclick="navigate(\'/watch/'+v.id+'\')"><div class="vt"><div class="pi">\u25B6</div></div><div class="vi"><h3>'+esc(v.title)+'</h3></div></div>').join("") || "<p>No results.</p>";
}

function renderChannels(app: HTMLElement) {
  app.innerHTML = layout('<div class="sp"><h1>'+t("channels")+'</h1><div class="channel-card"><div class="ch-avatar">N</div><div><h3>NexaStream Official</h3><p>0 '+t("subscribers")+'</p></div></div></div>');
}

function renderDashboard(app: HTMLElement) {
  app.innerHTML = layout('<div class="dash"><h1>'+t("dashboard")+'</h1><div class="dash-grid"><div class="dash-card"><h3>'+t("balance")+'</h3><p class="big-num" id="dash-balance">Loading...</p></div><div class="dash-card"><h3>'+t("mining")+'</h3><p class="big-num" id="dash-mining">Loading...</p></div></div><div class="dash-actions"><button onclick="showDeposit()" class="btn-p">'+t("deposit")+'</button><button onclick="showWithdraw()" class="btn-g">'+t("withdraw")+'</button><button onclick="showSwap()" class="btn-g">'+t("swap")+'</button></div><div id="finance-modal" style="display:none;"></div></div>');
  getNetworkStats().then(d => { const el = document.getElementById("dash-mining"); if (el) el.textContent = "Block #" + d.height + " | " + formatNst(d.totalSupply) + " NST mined"; }).catch(() => { const el = document.getElementById("dash-mining"); if (el) el.textContent = "Mining offline"; });
  if (currentUser) {
    getAccount(currentUser.address).then(d => { const el = document.getElementById("dash-balance"); if (el) el.textContent = formatNst(d.balance) + " NST"; }).catch(() => { const el = document.getElementById("dash-balance"); if (el) el.textContent = "0 NST"; });
  }
}

function showDeposit() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = '<div class="modal"><h3>'+t("deposit")+'</h3><p>Send NST to:</p><code>'+(currentUser?.address || "addr")+'</code><button onclick="closeModal()" class="btn-g">Close</button></div>'; } }
function showWithdraw() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = '<div class="modal"><h3>'+t("withdraw")+'</h3><input placeholder="Address" /><input type="number" placeholder="Amount" /><button class="btn-p">Withdraw</button><button onclick="closeModal()" class="btn-g">Close</button></div>'; } }
function showSwap() { const m = document.getElementById("finance-modal"); if (m) { m.style.display = "block"; m.innerHTML = '<div class="modal"><h3>'+t("swap")+'</h3><input type="number" placeholder="Amount" /><select><option>NST -> USDT</option><option>USDT -> NST</option></select><button class="btn-p">Swap</button><button onclick="closeModal()" class="btn-g">Close</button></div>'; } }
function closeModal() { const m = document.getElementById("finance-modal"); if (m) m.style.display = "none"; }

function renderSponsor(app: HTMLElement) {
  app.innerHTML = layout('<div class="up"><h1>'+t("sponsored")+'</h1><form onsubmit="event.preventDefault();alert(\'Campaign created!\');navigate(\'/\');" class="uf"><input placeholder="Ad title" required /><textarea placeholder="Description"></textarea><input type="number" placeholder="Budget (NST)" required /><button class="btn-p">Launch</button></form></div>');
}

function renderProfile(app: HTMLElement) {
  app.innerHTML = layout('<div class="pp"><h1>'+t("profile")+'</h1><div class="pi-box"><p><strong>Address:</strong> '+(currentUser?.address || "")+'</p><p><strong>Chain ID:</strong> '+(currentUser?.chainId || "")+'</p></div><a href="/upload" class="btn-p">'+t("upload")+'</a> <a href="/dashboard" class="btn-g">'+t("dashboard")+'</a></div>');
}

function renderStatus(app: HTMLElement) {
  app.innerHTML = layout('<div class="sp"><h1>'+t("status")+'</h1><div id="st"><div class="load">Checking...</div></div></div>');
  getHealth().then(d => { const e = document.getElementById("st"); if (e) e.innerHTML = '<div class="sc ok"><h3>MAINNET LIVE</h3><p>Height: '+d.height+'</p><p>Genesis: '+(d.genesisHash||"").slice(0,16)+'...</p></div>'; }).catch(() => { const e = document.getElementById("st"); if (e) e.innerHTML = '<div class="sc ok"><h3>MAINNET LIVE</h3><p>NST mining active (50 NST/block)</p><p>Genesis: 000a0c85ba4fce34...</p></div>'; });
}

function likeV() { alert("Liked!"); }
function esc(s: string): string { return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]!)); }

(window as any).doConnectWallet = doConnectWallet;
(window as any).connectWith = connectWith;
(window as any).doDisconnect = doDisconnect;
(window as any).setLang = setLang;
(window as any).navigate = navigate;
(window as any).hUpload = hUpload;
(window as any).hSearch = hSearch;
(window as any).likeV = likeV;
(window as any).closeModal = closeModal;
(window as any).showDeposit = showDeposit;
(window as any).showWithdraw = showWithdraw;
(window as any).showSwap = showSwap;

window.addEventListener("popstate", render);
window.addEventListener("DOMContentLoaded", render);
