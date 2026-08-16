# NexaStream — Phased Plan: Current State → Launchable Platform

> **Scope and honesty note.** This document is an engineering roadmap, not a
> marketing claim. "Surpass YouTube and TikTok" is a market outcome that no code
> can guarantee; it depends on users, content, capital, distribution,
> regulation, and time. What follows is what is technically real today, what
> this branch fixes, and the honest sequence to reach a platform that is
> **safe to launch** — not a platform that is guaranteed to win its market.
>
> Domain: https://nexastream.org · Repo: https://github.com/Railancosta/nexastream

---

## 0. Honest assessment of the repo before this branch

The repository existed (170 commits, a real monorepo) but was **not** "100% real
and functional ready for global use." Demonstrable defects found by inspection:

| # | Defect | Severity | Status after this branch |
|---|--------|----------|--------------------------|
| 1 | Hardcoded JWT fallbacks (`'nexastream-secret-key'`) in 19 files — forgeable auth tokens | **Critical** | ✅ Fixed |
| 2 | `routes/api/users.js` returned wallet `privateKey` to clients; `Wallet` was never imported (`ReferenceError`) | **Critical** | ✅ Fixed |
| 3 | `models/index.js` stored `walletPrivateKey` as plaintext STRING(255) | **Critical** | ✅ Fixed (AES-256-GCM at rest) |
| 4 | Two parallel, conflicting auth backends (`server.js` Sequelize vs `index.js` in-memory demo) double-mounted routes | High | ✅ Fixed (`index.js` retired) |
| 5 | `uuid` v14 (ESM-only) made `server.js` un-loadable under the configured Jest `require` | High | ✅ Fixed (uuid v9, CJS) |
| 6 | `sequelize`/`pg` never declared as backend deps — models couldn't load | High | ✅ Fixed |
| 7 | `payments.js` credited balance instantly on an unverified client `txHash` (double-spend/fraud) | **Critical** | ✅ Fixed (on-chain verify + atomic tx) |
| 8 | Withdrawals didn't deduct balance (spendable after withdrawal) | **Critical** | ✅ Fixed (atomic deduct + refund-on-fail) |
| 9 | Balance mutations were non-atomic (race conditions on concurrent tips/subs) | High | ✅ Fixed (row locks + `sequelize.transaction`) |
| 10 | No Google login; no Google Analytics; no real alerts channel | Medium | ✅ Added |
| 11 | `routes/wallet.js` returned mock balances/transactions | Medium | N/A (dead route; honest surfaces in `payments.js`) |

**What is still NOT done** (honestly, and why):

- **Real custody / licensed withdrawals.** Broadcasting a withdrawal is wired,
  but legally moving fiat/stablecoin value to users requires a licensed custody
  partner or money-transmitter registration per jurisdiction. That is a legal
  entity requirement, not code. Phase 3.
- **External security audit.** Internal fixes are done; an independent audit is
  required before handling real funds. Phase 4.
- **Content moderation at scale, KYC/AML, data-residency, SOC 2.** Operational
  and compliance work, not single-session code. Phases 3–5.
- **"Surpass YouTube/TikTok."** Not an engineering deliverable. See Phase 6.

---

## 1. What this branch delivers (verifiable)

### Security
- **Single JWT secret source** in `backend/src/config/index.js` with a fail-fast
  resolver: production exits if `JWT_SECRET` is missing or < 32 chars; dev/test
  get an ephemeral random secret. All 19 inline hardcoded fallbacks removed.
- **Wallet private keys never leave the server.** New `backend/src/utils/wallet.js`
  generates genuine EVM keypairs (ethers v6, secp256k1), encrypts the private key
  at rest with **AES-256-GCM** (`WALLET_ENCRYPTION_KEY`, fail-fast in prod), and
  exposes `decryptPrivateKey` only for server-side signing. Register/login/profile
  responses never include the key.
- **In-memory demo backend retired.** `backend/src/index.js` (fake data, private-key
  leak, route shadowing) now throws on require; the only entrypoint is `server.js`.

### Financial integrity (`backend/src/routes/api/payments.js`)
- **Deposits** are created `pending` and credited **only after on-chain
  verification** (`services/blockchainVerify.js`: tx exists, succeeded, ≥N
  confirmations, sender/recipient/amount match, not already credited — idempotent).
  If no RPC is configured, they stay pending (no fake credit).
- **Withdrawals** deduct balance **atomically** (row lock) at request time,
  broadcast on-chain from the encrypted key, and **refund atomically** if the
  broadcast fails (no lost or double-spent funds).
- **Tips / subscriptions / NFT purchases** wrapped in `sequelize.transaction`
  with row locks — no race conditions on concurrent balance changes.
- **Exchanges** recorded as pending swaps; settlement deferred to an AMM/exchange
  integration (honest "pending" rather than fake completion).

### Auth (`backend/src/routes/api/users.js`)
- Email/password **and Google OAuth** login (`services/googleAuth.js`: code →
  Google tokens → userinfo → provision or sign in).
- Refresh-token flow.
- Password changes blocked for Google accounts; correct provider tracking on the
  User model (`authProvider`, `googleId`).

### Observability & integrations
- **Google Analytics 4** via Measurement Protocol (`services/analytics.js`): fires
  `sign_up`, `login`, `google_login` server-side; no-ops if unconfigured.
- **Automatic alerts** (`services/alerts.js`): webhook (Slack/Discord) + SMTP
  email channels; always logs; fires on critical events (e.g. withdrawal refund
  failure).

### Tests
- New `backend/tests/wallet.test.js` (9 tests) locks in: address/key format,
  non-plaintext storage, encrypt/decrypt round-trip, random IV, tamper detection,
  malformed-payload rejection, and config fail-fast. All pass.
- Backend test loadability restored (33 → 84 passing).

---

## 2. Phase plan (current → launchable)

### Phase 1 — Security & integrity hardening  ✅ (this branch)
- Secrets, key custody, atomic finance, auth consolidation, GA, alerts.
- **Exit gate:** no hardcoded secrets, no plaintext keys, no fake balances, all
  new tests green, backend loads under test.

### Phase 2 — Make the real backend actually run end-to-end
- Stand up PostgreSQL + Redis (docker-compose exists; verify it boots).
- Run `sequelize.sync` / migrations; seed nothing fake.
- Replace `multer` local-disk upload with the S3/R2 adapter for video storage.
- Wire the Next.js frontend to the real `/api` (it currently talks to a Cloudflare
  Worker + fallback; point it at the consolidated backend).
- **Exit gate:** `docker compose up` boots DB + backend + frontend; a user can
  register (email + Google), upload a video, watch it, and see a real (zero)
  balance — no mock data anywhere in the live path.

### Phase 3 — Real money rails (legal + technical)
- Integrate a **licensed custody provider** (e.g. Fireblocks, BitGo, or a
  regulated stablecoin issuer) for deposit/withdrawal of stablecoin value. The
  broadcast/verify surfaces from Phase 1 plug into this.
- KYC/AML (e.g. Persona, Sumsub) gated on withdrawals above thresholds.
- Treasury management, reconciliation jobs, double-entry ledger review.
- **Exit gate:** real stablecoin deposit → credited → withdrawn to an external
  wallet, end to end, with KYC and reconciliation.

### Phase 4 — Independent audit & hardening
- External smart-contract audit (NST token, DAO, NFT, rewards contracts).
- External web/Pen-test (OWASP, auth bypass, IDOR on financial endpoints).
- Bug bounty scope.
- **Exit gate:** clean audit reports; findings remediated.

### Phase 5 — Scale & operations
- CDN + transcoding pipeline (Livepeer/Cloudflare Stream) for video at scale.
- Content moderation tooling + policy (CSAM scanning, DMCA workflow, appeals).
- Observability: Prometheus/Grafana (scaffolding exists), alerting runbooks.
- Data residency, backups, DR drills (scaffolding exists).
- **Exit gate:** load test at target RPS; documented incident runbooks.

### Phase 6 — Market (not engineering)
- Creator monetization tiers, instant-from-creation payouts (the "instant
  monetization" ask is a **policy/business** decision, not a code feature — it
  requires anti-fraud + treasury float that Phase 3 enables).
- Boost/promotion marketplace (paid + free boosts) — build on the atomic ledger.
- Sponsorship/ad serving for third parties — needs an ad server + targeting +
  brand-safety layer.
- i18n: auto-translation of metadata/captions (10 languages exist; expand via a
  translation API).
- Growth/distribution is a go-to-market function, not a deliverable here.

---

## 3. Things this branch deliberately does NOT do (and why)

- **Does not claim "surpasses YouTube/TikTok."** That is not verifiable in code.
- **Does not add fake balances or fake on-chain activity.** Every financial
  endpoint either does the real operation or returns an honest "pending / not
  configured" status.
- **Does not deploy.** Production deployment with real keys, DNS
  (nexastream.org), and custody requires the owner's secrets and Phase 3.
- **Does not modify the frontend** beyond pointing out the wiring needed in
  Phase 2; backend contract changes are additive (new `/api/users/google`,
  `/api/users/refresh`, `/api/payments/exchange`).

---

## 4. Required environment variables (production)

See `backend/.env.example`. Critical (fail-fast if missing in prod):
`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `WALLET_ENCRYPTION_KEY`.
Optional-but-real-when-set: `GOOGLE_CLIENT_ID/SECRET/REDIRECT`, `GA_*`,
`ALERT_*`, `BLOCKCHAIN_RPC`, `TOKEN_CONTRACT`.
