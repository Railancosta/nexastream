// NexaStream SDK (prioridade 1: JavaScript) — Item 26/58
export class NexaStream {
  constructor(o = {}) {
    this.core = o.core || 'http://localhost:3002';
    this.chain = o.chain || 'http://localhost:3008';
    this.explorer = o.explorer || 'http://localhost:3009';
    this.social = o.social || 'http://localhost:3011';
    this.mod = o.mod || 'http://localhost:3014';
    this.dao = o.dao || 'http://localhost:3015';
    this.token = o.token || null;
  }
  async _r(base, p, opts = {}) {
    const h = { ...(opts.headers || {}) };
    if (opts.json) h['Content-Type'] = 'application/json';
    if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    const r = await fetch(base + p, { method: opts.method || 'GET', headers: h, body: opts.json ? JSON.stringify(opts.json) : opts.raw });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
    return d;
  }
  // Auth
  async register(email, password, username) { const d = await this._r(this.core, '/api/auth/register', { method: 'POST', json: { email, password, username } }); this.token = d.token; return d; }
  async login(email, password) { const d = await this._r(this.core, '/api/auth/login', { method: 'POST', json: { email, password } }); this.token = d.token; return d; }
  // Vídeo
  videos() { return this._r(this.core, '/api/videos'); }
  video(id) { return this._r(this.core, '/api/videos/' + id); }
  search(q) { return this._r(this.core, '/api/search?q=' + encodeURIComponent(q)); }
  upload(fileBytes, title) { return this._r(this.core, '/api/videos/upload?title=' + encodeURIComponent(title), { method: 'PUT', raw: fileBytes }); }
  // Blockchain
  wallet() { return this._r(this.chain, '/api/chain/wallet', { method: 'POST', json: {} }); }
  balances() { return this._r(this.chain, '/api/chain/balances'); }
  verifyChain() { return this._r(this.chain, '/api/chain/verify'); }
  mine(miner) { return this._r(this.chain, '/api/chain/mine', { method: 'POST', json: { miner } }); }
  // Social / Moderação
  comment(videoId, username, content) { return this._r(this.social, '/api/social/comment', { method: 'POST', json: { videoId, username, content } }); }
  report(videoId, reason, reporter) { return this._r(this.mod, '/api/mod/report', { method: 'POST', json: { targetType: 'video', targetId: videoId, reason, reporter } }); }
  // DAO
  propose(p) { return this._r(this.dao, '/api/dao/proposal', { method: 'POST', json: p }); }
  vote(v) { return this._r(this.dao, '/api/dao/vote', { method: 'POST', json: v }); }
  proposals() { return this._r(this.dao, '/api/dao/proposals'); }
}
export default NexaStream;
