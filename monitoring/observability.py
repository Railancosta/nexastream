#!/usr/bin/env python3
"""Observabilidade (Item 27) — monitora todos os endpoints críticos"""
import urllib.request, json, time, sys

ENDPOINTS = [
    ("auth",    3001, "/api/health"),
    ("videos",  3002, "/api/health"),
    ("reco",    3012, "/api/health"),
    ("live",    3013, "/api/health"),
    ("mod",     3014, "/api/health"),
    ("dao",     3015, "/api/health"),
    ("nft",     3016, "/api/health"),
    ("chain",   3008, "/api/health"),
    ("wallet",  3009, "/api/health"),
    ("analytics",3018,"/api/health"),
]

def check(name, port, path):
    t0 = time.time()
    try:
        r = urllib.request.urlopen(f"http://localhost:{port}{path}", timeout=3)
        ms = int((time.time()-t0)*1000)
        return f"{name:12s} ✅ {ms:4d}ms"
    except Exception as e:
        return f"{name:12s} ❌ {type(e).__name__}"

if __name__ == '__main__':
    results = [check(*e) for e in ENDPOINTS]
    print("\n".join(results))
    up = sum(1 for r in results if '✅' in r)
    print(f"\n📊 Health: {up}/{len(results)} serviços UP")
    sys.exit(0 if up==len(results) else 1)
