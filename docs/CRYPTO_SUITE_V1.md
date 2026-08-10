# NexaStream CryptoSuite v1

This specification defines the target cryptographic interface for the Mainnet release candidate. It does not claim implementation completion.

## Suite identifier

`NX-PQC-1`

Every transaction and authenticated P2P handshake must carry an explicit cryptographic-suite/version identifier. Nodes must reject unsupported suites rather than silently downgrading.

## Primitives

- Transaction signatures: **ML-DSA-87 (FIPS 204)**.
- P2P key establishment: **ML-KEM-1024 (FIPS 203)**.
- Protocol/content hashing: **SHA3-512** where a fixed-length digest is required; **SHAKE256** where an extendable-output function is appropriate.
- Authenticated symmetric transport after key establishment: **ChaCha20-Poly1305** or **AES-256-GCM**, selected per transport implementation.
- Optional independent signature suite: **SLH-DSA (FIPS 205)** where its performance and signature size are acceptable.

## Domain separation

Signing contexts must be distinct for:

- transactions;
- blocks;
- governance;
- treasury operations;
- validator messages;
- P2P authentication.

A signature valid in one context must not be accepted in another context.

## Downgrade protection

A node must reject:

- unknown suite IDs;
- malformed suite parameters;
- unsupported algorithm versions;
- attempts to negotiate a weaker suite without an explicitly versioned protocol upgrade.

## Implementation gate

The repository currently contains a simplified/demo PQC implementation. It must not be used as a substitute for the standardized primitives above. A vetted implementation must be selected, pinned, tested against known-answer vectors, fuzzed, benchmarked, and independently reviewed before `NX-PQC-1` is enabled in Mainnet consensus or production wallet/P2P paths.

## Mainnet rule

Changing the suite after Genesis requires a versioned protocol upgrade. The Genesis specification must record the active suite identifier and relevant parameters.
