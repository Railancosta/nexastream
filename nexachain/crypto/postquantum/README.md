# Post-Quantum Crypto Implementation Gate

This package is a protocol boundary, not a claim of cryptographic security by itself.

## Mainnet policy

The repository's historical/demo PQC routines must not be called by production wallet, transaction, consensus, or P2P code. A production build must fail closed until a vetted implementation of the algorithms declared by `NX-PQC-1` is wired behind the suite interface.

## Required production implementation

- ML-DSA-87 for transaction signatures.
- ML-KEM-1024 for P2P key establishment.
- SHA3-512 and SHAKE256 for the protocol hashing/KDF roles defined by `CRYPTO_SUITE_V1.md`.
- Authenticated encryption using ChaCha20-Poly1305 or AES-256-GCM after key establishment.

## Acceptance evidence

The implementation is not considered complete until the release candidate includes:

1. Pinned dependency versions and checksums.
2. Known-answer/test-vector tests.
3. Sign/verify tests using real transaction bytes.
4. KEM encapsulate/decapsulate tests between independent nodes.
5. Negative tests for modified messages, keys and ciphertexts.
6. Replay and downgrade rejection tests.
7. Serialization and parser fuzzing.
8. Benchmarks for validators and mobile clients.
9. No secret material in logs, traces or metrics.
10. Independent security/cryptographic review.

Do not label a build Mainnet-ready based on the presence of package names, algorithm names, mock implementations, or documentation alone.
