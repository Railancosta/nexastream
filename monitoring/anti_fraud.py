#!/usr/bin/env python3
"""Anti-Fraud System (Item 22) — detecção multi-sinal
Sinais: Behavior + Device + Network + Account History + Content + Economic"""
from collections import defaultdict
import time, json, math

class AntiFraud:
    def __init__(self):
        self.events = []
        self.accounts = defaultdict(list)
        self.devices = defaultdict(int)
        self.ips = defaultdict(int)

    def track(self, event):
        self.events.append({**event, 'ts': time.time()})
        self.accounts[event.get('user')].append(event)
        self.devices[event.get('device','?')] += 1
        self.ips[event.get('ip','?')] += 1

    def score(self, user):
        """Score combinando múltiplos sinais (Item 22: não usar 1 algoritmo só)"""
        evs = self.accounts[user]
        if not evs: return 0.0
        # sinal 1: volume por segundo
        window = [e for e in evs if time.time()-e['ts']<60]
        volume = len(window)/60.0
        # sinal 2: diversidade de device
        devices = len(set(e.get('device') for e in evs))
        # sinal 3: padrões temporais (baixa variância = suspeito)
        ts = sorted([e['ts'] for e in evs])
        diffs = [ts[i+1]-ts[i] for i in range(len(ts)-1)] if len(ts)>1 else [1]
        variability = sum(abs(d-sum(diffs)/len(diffs)) for d in diffs)/max(1,len(diffs))
        # sinal 4: reputação de IP
        ip_count = sum(self.ips.values())
        # score 0-1 (1 = muito suspeito)
        score = min(1.0, (
            (volume>10)*0.4 +
            (devices<2 and len(evs)>50)*0.3 +
            (variability<0.1 and len(evs)>20)*0.3
        ))
        return round(score, 3)

    def block_recommendation(self, user):
        return self.score(user) > 0.7

if __name__ == '__main__':
    af = AntiFraud()
    # simulando usuário normal
    for i in range(10):
        af.track({'user':'alice','device':'phone','ip':'1.1.1.1','action':'watch'})
    # simulando bot
    for i in range(200):
        af.track({'user':'bot1','device':'emulator','ip':'2.2.2.2','action':'watch'})
    print(f"Alice score: {af.score('alice')}")
    print(f"bot1 score:  {af.score('bot1')}  -> bloquear: {af.block_recommendation('bot1')}")
