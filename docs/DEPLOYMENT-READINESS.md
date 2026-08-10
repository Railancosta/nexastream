# Production Deployment Readiness

## Domain

The canonical website is `https://nexastream.org/`.

Do not publish claims that the domain is connected to a verified mainnet until DNS, TLS, frontend, backend, RPC, and explorer endpoints have been independently checked.

## Frontend

The frontend must use environment-driven production endpoints. No localhost endpoints, development wallets, placeholder analytics IDs, fake balances, fake notifications, or simulated blockchain data are permitted in production.

## Backend

The backend must expose a real health endpoint and return the status of its dependencies. A successful HTTP response alone does not prove that the database, storage, blockchain, or P2P network is healthy.

## Blockchain

Mainnet requires a reproducible genesis configuration, deterministic genesis hash, running independent nodes, peer synchronization, consensus validation, real transaction processing, and RPC access to live chain state.

## Video network

Distributed video features must be validated using independent nodes. A centralized object store or CDN may be used as an optional edge/cache layer only when the product explicitly identifies it; it must not be presented as proof of decentralized storage.

## Mobile

Every production route must remain usable at narrow mobile widths. Test navigation, forms, wallet flows, video playback, uploads, tables, dashboards, and creator analytics on touch devices.

## Release language

Use `Mainnet Live` only after all release gates are verified. Before that, use `Development`, `Testnet`, or `Pre-Mainnet` as appropriate.
