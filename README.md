# NexaStream — Engineering Foundation

NexaStream is an open-source video platform project exploring creator economy, distributed content delivery, Web3 integration and AI-assisted platform services.

> **Engineering rule:** Build first. Validate through engineering. Scale through measurable milestones.
>
> This README intentionally does **not** claim that NexaStream is decentralized, secure, production-ready, scalable to a specific user count, or that mainnet is safe to launch. Those claims require evidence.

## Current Phase

**FASE 0 — Codebase Audit + Foundation Scaffold**

Repository: https://github.com/Railancosta/nexastream
Website: https://nexastream.org/
Token design target: **NST**, maximum planned supply **55,000,000 NST**. Token economics and issuance remain subject to engineering, security and economic validation.

## Audit Snapshot

The repository already contains multiple overlapping generations of frontend, backend, blockchain, contracts, P2P and infrastructure code. The existing audit report is dated 2024 and therefore cannot be treated as a current production certification. It reports missing/insufficient tests, dependency vulnerabilities, and unverified deployment/DNS/TLS items. fileciteturn2file0L2-L2

The current tree also confirms substantial duplicated architecture: `backend/`, `frontend/`, `nexastream/`, `apps/`, `packages/`, `nexachain/`, `blockchain/`, `contracts/`, Kubernetes manifests and several deployment stacks coexist. fileciteturn1file0L2-L2

### Immediate audit conclusions

- **Do not call the project production-ready yet.**
- **Do not treat existing blockchain/mainnet files as evidence of a safe mainnet.**
- **Do not treat existing P2P/storage code as proof of decentralization.**
- Consolidation into the mandatory architecture is required before Phase 1 is considered complete.
- Security and dependency findings must be re-run with current tooling.
- Tests, observability, rollback and disaster-recovery procedures must be validated rather than inferred from file presence.

## Mandatory Target Architecture

```text
nexastream/
├── apps/
│   ├── web/              # TypeScript + Next.js + React
│   ├── android/          # Kotlin
│   └── desktop/          # Tauri/Rust
├── services/
│   ├── auth/             # Go
│   ├── users/            # Go
│   ├── videos/           # Go
│   ├── search/           # Go
│   ├── recommendations/  # Python
│   ├── analytics/        # Go/Python
│   ├── payments/         # Go
│   ├── moderation/       # Python
│   └── antifraud/        # Python
├── blockchain/
│   ├── node/             # Rust
│   ├── consensus/        # Rust
│   ├── wallet/           # Rust core + TS UI
│   └── explorer/         # TypeScript
├── p2p/
│   ├── discovery/        # Rust/libp2p/DHT
│   ├── storage/          # Rust
│   ├── relay/            # Rust
│   └── replication/      # Rust
├── contracts/            # Solidity + Ink!
├── sdk/                  # JS/TS, Python, Android
├── infrastructure/       # Terraform, Docker, Kubernetes
├── monitoring/           # Prometheus/Grafana/OTel
├── security/             # Threat models and audits
└── tests/                # Unit/integration/E2E/chaos/load
```

`setup.sh` creates this target layout without deleting the existing implementation. Migration and deletion are separate, reviewable changes.

## Quick Start

### Prerequisites

- Git
- Docker Engine/Desktop + Compose v2
- Rust stable + Cargo
- Go 1.23+
- Python 3.12
- Node.js 22
- A Unix-like shell (Linux/macOS recommended)

### Setup

```bash
chmod +x setup.sh
./setup.sh
```

The script is designed to be idempotent where practical. It installs local development toolchains, creates `.venv`, configures Git hooks, and creates the target monorepo directories. It does not provision production infrastructure or credentials.

### Local infrastructure

```bash
cp .env.example .env
make docker-up
```

Development services include PostgreSQL 16, Redis 7, Redpanda, ClickHouse, Meilisearch, MinIO, Prometheus, Grafana and Jaeger.

Default local endpoints:

| Service | Endpoint |
|---|---|
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Redpanda Kafka API | localhost:19092 |
| ClickHouse HTTP | http://localhost:8123 |
| Meilisearch | http://localhost:7700 |
| MinIO API | http://localhost:9002 |
| MinIO Console | http://localhost:9001 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |
| Jaeger | http://localhost:16686 |

Local credentials in Compose are intentionally development-only and must never be reused in production.

## Developer Commands

```bash
make setup
make test
make lint
make build
make docker-up
make docker-down
make dev
make security-scan
```

The targets are deliberately conservative: components that have not yet been migrated into the target Go/Rust/Python structure are not represented as successfully built merely because older code exists elsewhere in the repository.

## CI/CD

`.github/workflows/phase0-ci.yml` performs repository secret scanning, Node dependency auditing, Python formatting checks, discovered Go tests/vet, discovered Rust fmt/clippy checks and Trivy filesystem scanning. A CI green result is evidence only for the checks actually executed; it is not a security audit or production certification.

## Security Rules

1. No proprietary cryptography.
2. No credentials in source code.
3. TLS, authentication, authorization, rate limiting and input validation are mandatory for network services.
4. Security-sensitive components require threat models and independent review before production use.
5. Dependency vulnerabilities must be tracked and remediated according to severity.
6. Never claim decentralization without measured peer/node/replication evidence.
7. Never claim scalability without load-test evidence.
8. Never launch mainnet merely because a binary starts.

## Roadmap

| Phase | Gate |
|---|---|
| 0 | Audit + scaffold + reproducible local environment |
| 1 | MVP backend, DB, auth, users, channels, videos, search, feed, analytics, admin |
| 2 | Creator Studio, monetization, live, comments, notifications, revenue tracking |
| 3 | Rust P2P testnet, DHT, content addressing, storage, relay, replication |
| 4 | Blockchain testnet, consensus, wallets, NST transactions, explorer |
| 5 | Security Gate: threat model, audits, pentest, load/consensus/wallet/DR tests |
| 6 | Mainnet decision only after every Phase 5 gate is independently evidenced |
| 7 | Global expansion, ecosystem, SDKs, mobile/desktop, marketplace and DAO |

## Creator Economy

The target business rule is a 50/50 split of **net eligible platform revenue** between creators and NexaStream. Exact accounting definitions, exclusions, fraud handling, payout timing and legal/compliance requirements must be implemented and tested before this is marketed as a guaranteed payout.

## Contribution Rules

- Keep changes small and reviewable.
- Add automated tests with functional changes.
- Add metrics and structured logs to network services.
- Update threat models when attack surfaces change.
- Do not introduce custom cryptography.
- Do not commit secrets, production credentials, private keys or generated local state.
- Do not mark a feature complete until it works in a real environment and has measurable acceptance criteria.

## License

See `LICENSE.md`.
