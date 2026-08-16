# NexaStream — Production Readiness Gate

This branch is a production-hardening gate. Documentation alone does not declare Mainnet or global production readiness.

## Mandatory gates

### Application
- [ ] Frontend, backend, blockchain and contracts build successfully.
- [ ] All public routes work and error states are implemented.
- [ ] No production placeholders or committed secrets.

### Data and identity
- [ ] PostgreSQL migrations work from a clean database.
- [ ] Authentication, refresh rotation, logout and recovery are tested.
- [ ] Server-side authorization is enforced.
- [ ] Encrypted backups and restore drills pass.

### Video
- [ ] Upload, transcoding, adaptive playback and retries work.
- [ ] Content integrity hashes are verified.
- [ ] CDN/range delivery is validated.

### NexaChain / Mainnet
- [ ] Genesis, chain ID and network configuration are documented and immutable.
- [ ] Deterministic block/transaction validation is tested.
- [ ] Replay, nonce and double-spend protections are tested.
- [ ] Validator keys are never committed.
- [ ] Multi-validator testing passes before any claim of decentralized production.
- [ ] Solo-validator operation is clearly labeled as a bootstrap limitation.

### Web3
- [ ] NST contracts compile and tests pass.
- [ ] Rewards are bounded.
- [ ] Staking and DAO authorization are tested.
- [ ] NFT operations are tested.
- [ ] Explorer and RPC endpoints are verified.

### Security
- [ ] Critical/high dependency vulnerabilities are resolved or formally accepted.
- [ ] Secrets scan, SAST and DAST pass.
- [ ] Auth/upload abuse controls are tested.
- [ ] CORS, CSP, security headers and TLS are verified.
- [ ] External security review is completed before high-value mainnet claims.

### Reliability and scale
- [ ] Health/readiness/liveness probes exist.
- [ ] Metrics, logs and alerts work.
- [ ] Load tests cover API, feed, playback, upload and RPC.
- [ ] Autoscaling, rate limiting and backpressure are tested.
- [ ] Disaster-recovery restoration passes.

### Domain
- [ ] nexastream.org, API, explorer and RPC DNS are verified.
- [ ] TLS/CDN/WAF/origin configuration is verified.
- [ ] Documentation contains no unavailable production services.

## Progressive rollout

internal → staging → canary → 1k → 10k → 100k → 1M → larger cohorts.

Record concurrency, RPS, p95/p99 latency, error rate, database/cache saturation, bandwidth, video starts, uploads, and blockchain metrics at each stage.

## Final sign-off

Only after evidence for every mandatory gate may the release be declared:

`NEXASTREAM MAINNET + GLOBAL PRODUCTION READY`
