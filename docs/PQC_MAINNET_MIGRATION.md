# NexaStream Post-Quantum Cryptography — Mainnet Migration Gate

## Security status

**BLOCKER: the current `nexachain/crypto/postquantum/crypto.go` must NOT be used for Mainnet cryptographic security.**

The current file contains explicitly simplified/demo implementations for Dilithium and ML-KEM/Kyber-style operations. Random byte buffers and hashes are not implementations of ML-DSA or ML-KEM. They must be removed from production paths before Mainnet.

## Standards target

Use standardized, vetted implementations of:

- **ML-DSA-87 (FIPS 204)** for production digital signatures where the highest NIST security category is required.
- **ML-KEM-1024 (FIPS 203)** for post-quantum key establishment on P2P/session channels.
- **SLH-DSA (FIPS 205)** as an independent hash-based signature option/backup where its larger signatures are acceptable.
- **SHA3-512 / SHAKE256** for protocol hashing and domain-separated derivation where appropriate.
- **AES-256-GCM or ChaCha20-Poly1305** for authenticated symmetric encryption after key establishment.

Do not describe any of these as mathematically “unbreakable”. Security claims must remain tied to published standards, implementation quality, parameter sets, and threat models.

## Required migration

1. Introduce a versioned `CryptoSuite` identifier in consensus/network messages.
2. Replace the demo Dilithium-style key generation/signing/verification with a vetted ML-DSA implementation.
3. Replace the demo Kyber-style KEM with a vetted ML-KEM implementation.
4. Keep legacy ECDSA only behind an explicit compatibility suite; do not silently treat it as post-quantum secure.
5. Add deterministic known-answer tests from the selected implementation/standard test vectors.
6. Add negative tests: modified message, modified public key, modified signature, wrong algorithm ID, truncated key/signature, replayed handshake.
7. Add domain separation for transaction signing, block signing, P2P handshakes, governance, and treasury operations.
8. Add key rotation/versioning before the Mainnet genesis is frozen.
9. Add algorithm-agility rules so a future cryptographic migration can be activated through an explicitly versioned protocol upgrade rather than an ad-hoc code change.
10. Benchmark key/signature sizes, CPU, memory and bandwidth impact on mobile nodes and validators.
11. Run fuzzing against serialization, signature parsing, KEM ciphertext parsing, and P2P handshake state machines.
12. Require independent cryptographic review before Mainnet cryptographic parameters are frozen.

## Mainnet acceptance criteria

- No demo/simplified PQC primitive reachable from production transaction, wallet or P2P code.
- ML-DSA signatures successfully sign and verify real transactions.
- ML-KEM establishes a shared secret between two independent nodes.
- Tampering causes deterministic verification failure.
- Algorithm identifiers are serialized and validated by every node.
- Unsupported algorithm versions are rejected safely.
- Key material is zeroized where the chosen implementation/API permits.
- No private keys are logged.
- No secret material is included in metrics, traces or error messages.
- Reproducible test results are attached to the release candidate.

## Reference standards

NIST FIPS 203 — ML-KEM
NIST FIPS 204 — ML-DSA
NIST FIPS 205 — SLH-DSA

This document is a security gate, not a claim that the migration is already complete.
