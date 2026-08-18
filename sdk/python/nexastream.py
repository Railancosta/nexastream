"""NexaStream Python SDK (Item 26)"""
import urllib.request, json

class NexaStream:
    def __init__(self, api='http://localhost:3002', chain='http://localhost:3008'):
        self.api, self.chain, self.token = api, chain, None
    def _req(self, url, data=None):
        req = urllib.request.Request(url, headers={'Content-Type':'application/json'})
        if self.token: req.add_header('Authorization', f'Bearer {self.token}')
        body = json.dumps(data).encode() if data else None
        return json.loads(urllib.request.urlopen(req, body).read())
    def register(self,email,password,username): d=self._req(self.api+'/api/auth/register',{'email':email,'password':password,'username':username}); self.token=d.get('token'); return d
    def login(self,email,password): d=self._req(self.api+'/api/auth/login',{'email':email,'password':password}); self.token=d.get('token'); return d
    def feed(self): return self._req(self.api+'/api/reco/feed')
    def live_streams(self): return self._req(self.api+'/api/live/streams')
    def chain_info(self): return self._req(self.chain+'/api/chain')
    def mainnet_gate(self): return self._req(self.chain+'/api/chain/mainnet-gate')
    def create_wallet(self): return self._req(self.chain.replace('3008','3009')+'/api/wallet/create')

if __name__=='__main__':
    ns = NexaStream()
    print("Gate:", json.dumps(ns.mainnet_gate(), indent=2) if ns.mainnet_gate() else "offline")
