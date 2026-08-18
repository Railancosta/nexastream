// NexaStream JS SDK (Item 26)
export class NexaStream {
  constructor({api='http://localhost:3002',chain='http://localhost:3008'}={}) {
    this.api=api; this.chain=chain; this.token=null;
  }
  async _req(url,opts={}){const r=await fetch(url,opts);return r.json()}
  async register(email,password,username){
    const d=await this._req(this.api+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,username})});
    this.token=d.token; return d;
  }
  async login(email,password){
    const d=await this._req(this.api+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    this.token=d.token; return d;
  }
  async feed(){return this._req(this.api+'/api/reco/feed')}
  async liveStreams(){return this._req(this.api+'/api/live/streams')}
  async watch(videoId,seconds,completed=0){
    return this._req(this.api.replace(':3002',':3018')+'/api/analytics/watch',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({videoId,viewerId:'sdk_'+Math.random().toString(36).slice(2,8),seconds,completed})});
  }
  async chainInfo(){return this._req(this.chain+'/api/chain')}
  async mainnetGate(){return this._req(this.chain+'/api/chain/mainnet-gate')}
  async createWallet(){return this._req(this.chain.replace(':3008',':3009')+'/api/wallet/create',{method:'POST'})}
}
export default NexaStream;
