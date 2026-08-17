# API Spec (testnet)
core:3002 — POST /api/auth/register | POST /api/auth/login | GET /api/health | PUT /api/videos/upload?title= | GET /api/videos | GET /api/videos/:id | GET /api/search?q= | GET /storage/*
content:3004 — POST /api/content/index/:id | GET /api/content/:id | GET /api/content/verify/:id | GET /api/content/:id/chunks/:n | GET /api/content/dedup
chain:3008 — POST /api/chain/wallet | POST /api/chain/tx | POST /api/chain/faucet | POST /api/chain/mine | GET /api/chain | GET /api/chain/verify | GET /api/chain/balances
explorer:3009 — GET /api/explorer | GET /api/explorer/balances | POST /api/explorer/bind | POST /api/explorer/reward | GET /api/explorer/rewards
monitor:3010 — GET /api/metrics | GET /api/metrics/history
