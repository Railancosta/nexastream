# NexaStream Testnet Specification

## Overview

The NexaStream Testnet is a pre-production blockchain network designed to test all components of the NexaStream ecosystem before mainnet launch.

## Network Configuration

| Parameter | Value |
|-----------|-------|
| Network Name | NexaStream Testnet |
| Chain ID | 9999 |
| Network ID | 9999 |
| Consensus | Hybrid PoW/PoS |
| Block Time | 3 seconds |
| Minimum Validators | 4 |
| Maximum Validators | 21 |

## Testnet Tiers

### Tier 1: Validators (4 replicas)
- Full participation in consensus
- Block production
- Transaction validation
- High availability

### Tier 2: Full Nodes (3 replicas)
- Transaction relay
- Block synchronization
- RPC endpoints
- Read-only queries

## Deployment

### Prerequisites

1. Kubernetes cluster (v1.24+)
2. kubectl configured
3. Docker for building images

### Quick Start

```bash
# Deploy testnet
kubectl apply -f testnet.yaml

# Check status
kubectl get pods -n nexastream-testnet

# View logs
kubectl logs -l app=nexachain,component=validator -n nexastream-testnet
```

### Local Development

```bash
# Initialize node
./deploy.sh init <validator_address>

# Build binary
./deploy.sh build

# Start node
./deploy.sh start

# Check status
./deploy.sh status

# View logs
./deploy.sh logs

# Stop node
./deploy.sh stop
```

## Tokenomics

### NST Token

| Parameter | Value |
|-----------|-------|
| Name | NexaStream Token |
| Symbol | NST |
| Decimals | 18 |
| Max Supply | 55,000,000 NST |
| Initial Supply | 55,000,000 NST |

### Initial Distribution

| Allocation | Amount | Percentage |
|------------|--------|------------|
| Treasury | 10B | 18.18% |
| Foundation | 5B | 9.09% |
| Development | 5B | 9.09% |
| Public Sale | 10B | 18.18% |
| Airdrop | 1B | 1.82% |
| Team | 1B | 1.82% |
| Strategic | 5B | 9.09% |

## Consensus

### Hybrid PoW/PoS

- **PoW Blocks**: 10% of blocks (miners)
- **PoS Blocks**: 90% of blocks (validators)
- **Block Time**: 3 seconds
- **Finality**: 2 blocks (~6 seconds)

### Validator Rewards

| Metric | Value |
|-------|-------|
| PoS Block Reward | 2 NST |
| PoW Block Reward | 10 NST |
| Validator Share | 10% |
| Developer Share | 10% |

### Staking

| Parameter | Value |
|-----------|-------|
| Minimum Stake | 100 NST |
| Maximum per Validator | 11,000 NST |
| Unstake Period | 300 blocks |
| Reward Distribution | Every block |

### Slashing

| Offense | Penalty |
|---------|---------|
| Double Sign | 5% of stake |
| Unavailability | 1% per missed block |
| Threshold | 50 missed blocks |

## Smart Contracts

### Deployed Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| NSTToken | 0x...001 | Native token |
| Staking | 0x...002 | Stake delegation |
| Governance | 0x...003 | DAO proposals |
| NFTMarketplace | 0x...004 | NFT trading |

## RPC Endpoints

### Public RPC

```
https://rpc.testnet.nexastream.org
```

### WebSocket

```
wss://ws.testnet.nexastream.org
```

### Rate Limits

- 100 requests/minute (public)
- 1000 requests/minute (authenticated)

## Monitoring

### Prometheus Metrics

```
http://metrics.testnet.nexastream.org
```

### Grafana Dashboard

```
https://grafana.testnet.nexastream.org
```

### Key Metrics

| Metric | Description |
|--------|-------------|
| `nexachain_blocks_produced` | Total blocks produced |
| `nexachain_transactions` | Total transactions |
| `nexachain_validators` | Active validators |
| `nexachain_stake_total` | Total staked NST |
| `nexachain_gas_used` | Gas consumption |

## Faucet

### Test Tokens

Get test NST for development:

```
https://faucet.testnet.nexastream.org
```

### API

```bash
curl -X POST https://faucet.testnet.nexastream.org/api/claim \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYourAddress"}'
```

## Explorer

Block explorer for testnet:

```
https://explorer.testnet.nexastream.org
```

Features:
- Block search
- Transaction lookup
- Address balance
- Contract verification
- Token transfers

## Testing

### Run Integration Tests

```bash
cd ../backend
npm test -- --testPathPattern=blockchain
```

### Load Testing

```bash
npm run load-test -- --target=rpc.testnet.nexastream.org
```

## Upgrades

### Network Upgrades

Testnet will undergo scheduled upgrades:

1. **v1.0.0** - Initial launch
2. **v1.1.0** - Performance improvements
3. **v1.2.0** - New features

### Upgrade Process

1. Phase 1: Signal intent (validators)
2. Phase 2: Download update
3. Phase 3: Execute at block height
4. Phase 4: Verify upgrade

## Support

### Discord

Join our testnet channel:
```
https://discord.gg/nexastream
```

### Documentation

- [Main Documentation](../docs/)
- [API Reference](../api/)
- [Smart Contracts](../contracts/)

## Timeline

| Milestone | Date |
|-----------|------|
| Testnet Launch | Q1 2024 |
| Security Audit | Q2 2024 |
| Validator Auction | Q3 2024 |
| Mainnet Launch | Q4 2024 |

## Known Issues

None currently reported.

## Bug Bounty

Report vulnerabilities to:
```
security@nexastream.org
```

Rewards:
- Critical: Up to 50,000 NST
- High: Up to 25,000 NST
- Medium: Up to 10,000 NST
- Low: Up to 1,000 NST

---

**Version**: 1.0.0
**Last Updated**: 2024
