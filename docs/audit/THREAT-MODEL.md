# NexaStream Threat Model (rule 165, 166, 167)

## Assets
- User credentials (bcrypt hashed)
- JWT access tokens + refresh tokens
- Content-addressed video storage (SHA-256)
- Blockchain state (PoW chain)
- NST token contract (supply cap 55M)
- Ledger 50/50 (monetary values)

## Actors
- Anonymous user (untrusted browser)
- Authenticated user (USER role)
- Creator (CREATOR role)
- Moderator (MODERATOR role)
- Admin (ADMIN role)
- Validator (blockchain node)
- API client (possibly malicious)

## Attack Surface (rule 167)
- REST API endpoints (all inputs validated with Zod)
- WebSocket signaling (message schema validation, rate limit, size limit)
- Upload pipeline (chunk size, MIME, content hash, quota)
- Auth tokens (JWT HS256, refresh rotation)
- Blockchain (PoW difficulty, block validation, tamper detection)
- Smart contracts (ERC-20, supply cap, access control)

## Threats and Mitigations (rule 166)
| Threat | Mitigation |
|--------|-----------|
| Malicious creator uploads malware | MIME validation, content hash, malware scanning (when available) |
| Viewer sends fake views | View validation pipeline (duration, repetition, IP, device signals) |
| Sybil attack (multiple accounts) | detectSybil() — behavioral fingerprinting, 3+ identical patterns flagged |
| Reward farming | Idempotency keys, anti-fraud risk score, like farming detection |
| Validator manipulation | PoW consensus, 3 independent validators, chain validation |
| Staking attacks | Staking rules (to be implemented with explicit slashing) |
| Treasury abuse | Access control, multisig (to be implemented) |
| Peer flooding (P2P) | Max peers limit, max segments per peer, server-generated peer IDs |
| Eclipse attack | Multiple independent validators, genesis determinism |
| Malformed WebSocket messages | Zod schema validation, reject unknown types |
| Connection exhaustion | Rate limiting, max peers, idle timeout |
| Authorization bypass | requireAuth middleware on all protected routes |
| SQL injection | Zod validation, parameterized queries (no concatenation) |
| XSS | Output encoding, CSP headers, no dangerouslySetInnerHTML |
| CSRF | Token-based auth (Bearer), not cookies |

## Residual Risk
- No external audit yet (consenso + contratos)
- No HSM/vault for production keys
- No Grafana dashboards configured

## Scope for External Audit
1. packages/blockchain/ — consensus (PoW), chain validation, genesis
2. contracts/nst/ — NSTToken.sol (ERC-20, supply cap)
3. apps/api/src/services/auth/ — bcrypt, JWT, refresh tokens
4. apps/api/src/services/upload-manager.ts — chunking, hash verification
5. packages/economics/ — ledger 50/50, idempotency
6. apps/signaling/ — WebSocket protocol, rate limiting
7. packages/p2p/ — peer manager, segment integrity

## Audit Artifacts
- All source code: github.com/Railancosta/nexastream
- Test suite: 186 tests passing
- This threat model: docs/audit/THREAT-MODEL.md
- Contract: contracts/nst/contracts/NSTToken.sol (15 Hardhat tests)
- Genesis: blockchain/testnet/genesis.json
