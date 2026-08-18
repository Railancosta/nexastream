"""NexaStream Python SDK (Item 26, prioridade 2). Zero deps externas (so urllib)."""
import json
import urllib.request
import urllib.parse

class NexaStream:
    def __init__(self, core='http://localhost:3002', chain='http://localhost:3008',
                 explorer='http://localhost:3009', social='http://localhost:3011',
                 mod='http://localhost:3014', dao='http://localhost:3015',
                 nft='http://localhost:3016', kpi='http://localhost:3017'):
        self.u = dict(core=core, chain=chain, explorer=explorer, social=social,
                      mod=mod, dao=dao, nft=nft, kpi=kpi)
        self.token = None

    def _req(self, base, path, method='GET', body=None):
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(base + path, data=data, method=method)
        r.add_header('Content-Type', 'application/json')
        if self.token:
            r.add_header('Authorization', 'Bearer ' + self.token)
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read().decode())

    # Auth
    def register(self, email, password, username):
        d = self._req(self.u['core'], '/api/auth/register', 'POST',
                      dict(email=email, password=password, username=username))
        self.token = d['token']; return d
    def login(self, email, password):
        d = self._req(self.u['core'], '/api/auth/login', 'POST',
                      dict(email=email, password=password))
        self.token = d['token']; return d

    # Video
    def videos(self): return self._req(self.u['core'], '/api/videos')
    def video(self, vid): return self._req(self.u['core'], '/api/videos/' + vid)
    def search(self, q): return self._req(self.u['core'], '/api/search?q=' + urllib.parse.quote(q))

    # Blockchain
    def wallet(self): return self._req(self.u['chain'], '/api/chain/wallet', 'POST', {})
    def balances(self): return self._req(self.u['chain'], '/api/chain/balances')
    def verify_chain(self): return self._req(self.u['chain'], '/api/chain/verify')

    # Ecossistema
    def comment(self, video_id, username, content):
        return self._req(self.u['social'], '/api/social/comment', 'POST',
                         dict(videoId=video_id, username=username, content=content))
    def report(self, video_id, reason, reporter):
        return self._req(self.u['mod'], '/api/mod/report', 'POST',
                         dict(targetType='video', targetId=video_id, reason=reason, reporter=reporter))
    def proposals(self): return self._req(self.u['dao'], '/api/dao/proposals')
    def nft_market(self): return self._req(self.u['nft'], '/api/nft/market')
    def kpi(self): return self._req(self.u['kpi'], '/api/kpi')
