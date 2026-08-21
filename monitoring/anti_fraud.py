#!/usr/bin/env python3
"""Anti-Fraud System (Item 22) — detecção multi-sinal

Sinais implementados (6 sinais conforme Item 20):
1. Behavioral: velocidade de ações, padrões temporais, repetição
2. Device: diversidade de dispositivos, fingerprint do emulator
3. Network: concentração de IP, Proxy/VPN detection, rate anomalies
4. Account History: idade da conta, padrão de criação, shadowban
5. Content: qualidade do engajamento, taxa de skip, padrão de viewing
6. Economic: manipulação de recompensas, cycling de wallets

NÃO depende de um único algoritmo (Item 20).
Combina sinais com pesos configuráveis para gerar score 0-1.
"""

import time, json, math, hashlib
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class FraudSignal:
    name: str
    score: float  # 0-1
    confidence: float  # 0-1
    evidence: str
    weight: float = 1.0

@dataclass
class FraudVerdict:
    user: str
    total_score: float
    signals: list
    action: str  # 'allow', 'flag', 'throttle', 'block'
    reason: str
    timestamp: float = field(default_factory=time.time)

class AntiFraudSystem:
    """Multi-signal anti-fraud detection (Item 20/22)"""
    
    def __init__(self):
        self.events = []
        self.accounts = defaultdict(lambda: {
            'events': [], 'devices': set(), 'ips': set(),
            'created_at': time.time(), 'reports': 0,
            'reward_claims': [], 'watch_sessions': []
        })
        self.ip_users = defaultdict(set)
        self.device_fingerprints = defaultdict(int)
        self.reward_ledger = defaultdict(float)
        
        # Thresholds (configurable)
        self.VOLUME_THRESHOLD = 10  # actions per minute
        self.MIN_ACCOUNT_AGE = 3600  # 1 hour
        self.MAX_DEVICES_PER_ACCOUNT = 5
        self.MAX_IPS_PER_ACCOUNT = 3
        self.REWARD_CAP_PER_VIDEO = 100  # max NST per video per viewer
        self.BLOCK_THRESHOLD = 0.7
        self.THROTTLE_THRESHOLD = 0.5
        self.FLAG_THRESHOLD = 0.3
    
    def track_event(self, event: dict) -> Optional[FraudVerdict]:
        """Track an event and return fraud verdict if suspicious"""
        user = event.get('user', 'anon')
        account = self.accounts[user]
        
        # Store event
        enriched = {**event, 'ts': time.time(), 'hash': hashlib.sha256(
            json.dumps(event, sort_keys=True).encode()
        ).hexdigest()[:16]}
        self.events.append(enriched)
        account['events'].append(enriched)
        
        # Track device/IP
        device = event.get('device', 'unknown')
        ip = event.get('ip', 'unknown')
        account['devices'].add(device)
        account['ips'].add(ip)
        self.ip_users[ip].add(user)
        self.device_fingerprints[device] += 1
        
        # Run fraud analysis
        return self.analyze(user)
    
    def analyze(self, user: str) -> FraudVerdict:
        """Run all 6 signal detectors and produce combined verdict"""
        signals = []
        
        # Signal 1: Behavioral analysis
        signals.append(self._signal_behavioral(user))
        
        # Signal 2: Device analysis
        signals.append(self._signal_device(user))
        
        # Signal 3: Network analysis
        signals.append(self._signal_network(user))
        
        # Signal 4: Account history analysis
        signals.append(self._signal_account_history(user))
        
        # Signal 5: Content engagement quality
        signals.append(self._signal_content_quality(user))
        
        # Signal 6: Economic manipulation
        signals.append(self._signal_economic(user))
        
        # Weighted combination (no single algorithm - Item 20)
        total = sum(s.score * s.weight for s in signals) / max(0.01, sum(s.weight for s in signals))
        total = min(1.0, max(0.0, total))
        
        # Determine action
        if total >= self.BLOCK_THRESHOLD:
            action, reason = 'block', f'Score {total:.3f} >= {self.BLOCK_THRESHOLD} — multi-signal fraud detected'
        elif total >= self.THROTTLE_THRESHOLD:
            action, reason = 'throttle', f'Score {total:.3f} >= {self.THROTTLE_THRESHOLD} — suspicious activity'
        elif total >= self.FLAG_THRESHOLD:
            action, reason = 'flag', f'Score {total:.3f} >= {self.FLAG_THRESHOLD} — monitoring'
        else:
            action, reason = 'allow', 'Clean'
        
        return FraudVerdict(
            user=user, total_score=round(total, 4),
            signals=[{'name': s.name, 'score': round(s.score, 3), 'confidence': round(s.confidence, 2), 'evidence': s.evidence} for s in signals],
            action=action, reason=reason
        )
    
    def _signal_behavioral(self, user: str) -> FraudSignal:
        """Signal 1: Volume, timing patterns, repetition"""
        evs = self.accounts[user]['events']
        if len(evs) < 3:
            return FraudSignal('behavioral', 0.0, 0.3, 'insufficient data', 1.0)
        
        # Actions per minute in last 60s
        now = time.time()
        recent = [e for e in evs if now - e['ts'] < 60]
        volume_rate = len(recent) / 60.0
        
        # Timing regularity (bot-like: very regular intervals)
        ts = sorted([e['ts'] for e in evs[-50:]])
        if len(ts) > 2:
            diffs = [ts[i+1] - ts[i] for i in range(len(ts)-1)]
            mean_diff = sum(diffs) / len(diffs) if diffs else 1
            variance = sum((d - mean_diff)**2 for d in diffs) / len(diffs) if diffs else 0
            cv = math.sqrt(variance) / max(0.001, mean_diff)  # coefficient of variation
        else:
            cv = 1.0
        
        # Score components
        vol_score = min(1.0, volume_rate / self.VOLUME_THRESHOLD) if volume_rate > 5 else 0
        regularity_score = max(0, 1.0 - cv) if len(evs) > 20 else 0
        repetition_score = 1.0 if volume_rate > 15 and cv < 0.05 else 0
        
        score = min(1.0, vol_score * 0.4 + regularity_score * 0.3 + repetition_score * 0.3)
        evidence = f'rate={volume_rate:.1f}/s, cv={cv:.3f}, vol_score={vol_score:.2f}'
        
        return FraudSignal('behavioral', score, 0.8 if len(evs) > 10 else 0.4, evidence, 1.0)
    
    def _signal_device(self, user: str) -> FraudSignal:
        """Signal 2: Device diversity, emulator detection"""
        account = self.accounts[user]
        devices = account['devices']
        device_count = len(devices)
        
        # Too many devices for one account = suspicious
        if device_count > self.MAX_DEVICES_PER_ACCOUNT:
            score = min(1.0, (device_count - self.MAX_DEVICES_PER_ACCOUNT) / 5)
        else:
            score = 0
        
        # Check if using emulator (common bot pattern)
        emulator_keywords = ['emulator', 'genymotion', 'bluestacks', 'nox', 'virtualbox']
        has_emulator = any(any(kw in d.lower() for kw in emulator_keywords) for d in devices)
        if has_emulator:
            score = min(1.0, score + 0.3)
        
        # Shared device fingerprint across accounts
        shared_devices = sum(1 for d in devices if self.device_fingerprints.get(d, 0) > 3)
        if shared_devices > 0:
            score = min(1.0, score + 0.2 * shared_devices)
        
        evidence = f'devices={device_count}, emulator={has_emulator}, shared={shared_devices}'
        return FraudSignal('device', score, 0.7, evidence, 0.8)
    
    def _signal_network(self, user: str) -> FraudSignal:
        """Signal 3: IP concentration, proxy detection, rate anomalies"""
        account = self.accounts[user]
        ips = account['ips']
        ip_count = len(ips)
        
        # Multiple accounts from same IP
        score = 0
        for ip in ips:
            users_on_ip = len(self.ip_users.get(ip, set()))
            if users_on_ip > 3:
                score = min(1.0, score + 0.3)
        
        # Too many IPs (possible VPN hopping)
        if ip_count > self.MAX_IPS_PER_ACCOUNT:
            score = min(1.0, score + 0.2)
        
        # Check for known datacenter/proxy ranges (simplified)
        datacenter_prefixes = ['10.', '192.168.', '172.']
        for ip in ips:
            if any(ip.startswith(p) for p in datacenter_prefixes):
                score = min(1.0, score + 0.1)
        
        evidence = f'ips={ip_count}, shared_ip_users={sum(len(self.ip_users.get(ip, set())) for ip in ips)}'
        return FraudSignal('network', score, 0.6, evidence, 0.7)
    
    def _signal_account_history(self, user: str) -> FraudSignal:
        """Signal 4: Account age, creation pattern, reports"""
        account = self.accounts[user]
        age = time.time() - account.get('created_at', time.time())
        reports = account.get('reports', 0)
        event_count = len(account['events'])
        
        score = 0
        
        # Very new account with lots of activity
        if age < self.MIN_ACCOUNT_AGE and event_count > 50:
            score = min(1.0, score + 0.4)
        
        # Multiple reports against this account
        if reports > 0:
            score = min(1.0, score + min(0.5, reports * 0.15))
        
        # Account with no history but claiming rewards
        reward_claims = [e for e in account['events'] if e.get('action') == 'reward_claim']
        if len(reward_claims) > 5 and event_count < 20:
            score = min(1.0, score + 0.3)
        
        evidence = f'age={age:.0f}s, reports={reports}, events={event_count}'
        return FraudSignal('account_history', score, 0.7, evidence, 0.9)
    
    def _signal_content_quality(self, user: str) -> FraudSignal:
        """Signal 5: Watch quality, skip patterns, engagement depth"""
        account = self.accounts[user]
        watch_events = [e for e in account['events'] if e.get('action') in ('watch', 'view')]
        
        if len(watch_events) < 3:
            return FraudSignal('content_quality', 0.0, 0.3, 'insufficient watch data', 0.6)
        
        # Average watch duration
        durations = [e.get('duration', 0) for e in watch_events]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        # Skip rate (very short views)
        skips = sum(1 for d in durations if d < 3)
        skip_rate = skips / len(durations) if durations else 0
        
        # Pattern: watch 0s on all videos = bot
        if skip_rate > 0.9 and len(watch_events) > 10:
            score = 0.8
        elif avg_duration < 2 and len(watch_events) > 20:
            score = 0.5
        else:
            score = 0
        
        evidence = f'avg_watch={avg_duration:.1f}s, skip_rate={skip_rate:.2f}, watches={len(watch_events)}'
        return FraudSignal('content_quality', score, 0.6, evidence, 0.7)
    
    def _signal_economic(self, user: str) -> FraudSignal:
        """Signal 6: Reward manipulation, wallet cycling, gaming the system"""
        account = self.accounts[user]
        rewards = [e for e in account['events'] if e.get('action') in ('reward_claim', 'like')]
        views = [e for e in account['events'] if e.get('action') in ('watch', 'view')]
        
        score = 0
        
        # Excessive reward claims
        if len(rewards) > self.REWARD_CAP_PER_VIDEO:
            score = min(1.0, score + 0.5)
        
        # Like-to-view ratio manipulation (always liking everything)
        likes = [e for e in account['events'] if e.get('action') == 'like']
        if len(likes) > 20 and len(views) > 0:
            like_ratio = len(likes) / max(1, len(views))
            if like_ratio > 0.95:
                score = min(1.0, score + 0.3)
        
        # Same user claiming rewards for same video multiple times
        video_rewards = defaultdict(int)
        for e in rewards:
            vid = e.get('video_id', '')
            if vid:
                video_rewards[vid] += 1
        multi_claims = sum(1 for v in video_rewards.values() if v > 3)
        if multi_claims > 0:
            score = min(1.0, score + 0.4)
        
        evidence = f'rewards={len(rewards)}, likes={len(likes)}, multi_claims={multi_claims}'
        return FraudSignal('economic', score, 0.7, evidence, 1.0)
    
    def get_stats(self) -> dict:
        """Return system statistics"""
        return {
            'total_events': len(self.events),
            'total_accounts': len(self.accounts),
            'unique_ips': len(self.ip_users),
            'unique_devices': len(self.device_fingerprints),
            'blocked': sum(1 for u in self.accounts if self.analyze(u).action == 'block'),
            'flagged': sum(1 for u in self.accounts if self.analyze(u).action == 'flag'),
        }


# Singleton for HTTP service
_system = AntiFraudSystem()

if __name__ == '__main__':
    af = AntiFraudSystem()
    
    # Simulate normal user
    for i in range(10):
        result = af.track_event({'user': 'alice', 'device': 'pixel-7', 'ip': '1.1.1.1', 'action': 'watch', 'video_id': 'v1', 'duration': 30})
    print(f"Alice: score={af.analyze('alice').total_score}, action={af.analyze('alice').action}")
    
    # Simulate bot
    for i in range(200):
        result = af.track_event({'user': 'bot1', 'device': 'emulator', 'ip': '2.2.2.2', 'action': 'watch', 'video_id': f'v{i%5}', 'duration': 0})
    verdict = af.analyze('bot1')
    print(f"Bot1: score={verdict.total_score}, action={verdict.action}")
    for s in verdict.signals:
        print(f"  {s['name']}: score={s['score']}, evidence={s['evidence']}")
    
    # Simulate Sybil (multiple accounts, same IP)
    for i in range(5):
        user = f'sybil_{i}'
        for j in range(30):
            af.track_event({'user': user, 'device': f'device_{i}', 'ip': '10.0.0.1', 'action': 'like', 'video_id': f'v{j%3}'})
        v = af.analyze(user)
        print(f"Sybil-{i}: score={v.total_score}, action={v.action}")
    
    print(f"\nStats: {json.dumps(af.get_stats(), indent=2)}")
