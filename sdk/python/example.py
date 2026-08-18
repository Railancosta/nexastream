from nexastream import NexaStream
ns = NexaStream()
print('videos:', len(ns.videos()['videos']))
print('chain valid:', ns.verify_chain()['valid'])
w = ns.wallet()
print('wallet:', w['address'][:12] + '...')
print('kpi uptime(s):', ns.kpi()['uptimeS'])
print('SDK PYTHON OK')
