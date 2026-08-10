# NexaStream Mainnet — Production Gate

This document is the release gate for `nexastream.org`.

## Rule

A feature may only be marked **LIVE** when it is verified in production. Documentation, mocks, placeholder balances, simulated transactions, and unverified infrastructure do not count as production evidence.

## Release gates

- [ ] `nexastream.org` serves the intended production frontend
- [ ] HTTPS and security headers verified
- [ ] Frontend uses production API configuration
- [ ] Backend health endpoint verified
- [ ] Database connectivity verified
- [ ] Blockchain binary builds successfully
- [ ] Genesis file/hash verified and published
- [ ] Independent blockchain nodes can synchronize
- [ ] Consensus tests pass
- [ ] P2P peer discovery verified
- [ ] RPC endpoints respond to real chain data
- [ ] Wallet creates/signs transactions
- [ ] Explorer reads blocks and transactions from RPC
- [ ] NST maximum supply is enforced at protocol level
- [ ] Distributed storage replication verified across independent nodes
- [ ] Video retrieval through P2P verified
- [ ] Live streaming path verified
- [ ] Creator revenue accounting uses real received revenue only
- [ ] Creator/platform split is exactly 50/50 for eligible net distributable revenue
- [ ] No fabricated balances, views, revenue, payouts, blocks, peers, or transactions
- [ ] Anti-fraud controls are enabled before creator payouts
- [ ] Automated unit/integration/E2E tests pass
- [ ] Dependency security scan has no release-blocking critical vulnerabilities
- [ ] Backup and recovery procedure tested
- [ ] Mobile responsive verification completed
- [ ] Accessibility checks completed
- [ ] Production monitoring and alerts enabled
- [ ] Rollback procedure documented and tested

## 50/50 accounting invariant

For every eligible revenue event:

```text
net_distributable_revenue = creator_share + platform_share
creator_share = net_distributable_revenue * 0.50
platform_share = net_distributable_revenue * 0.50
```

Revenue that has not actually been received must not be represented as available revenue.

## Evidence required for mainnet release

The release record must contain:

- production deployment commit SHA;
- genesis hash;
- chain/network identifier;
- verified block height;
- verified RPC endpoint;
- verified explorer endpoint;
- independent node count;
- test results;
- security scan results;
- deployment timestamp;
- rollback reference.

Until these artifacts exist, the project should use **PRE-MAINNET / DEVELOPMENT** language rather than claiming a public mainnet launch.
