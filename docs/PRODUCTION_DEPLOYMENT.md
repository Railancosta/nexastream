# NexaStream Production Deployment Runbook

## Rule
Do not publish a Mainnet Live claim until the Mainnet Release Gate passes.

## 1. Build

Build frontend, backend and blockchain from a clean checkout. Record exact Git commit, compiler/runtime versions and generated artifact hashes.

## 2. Network

Start a minimum two-node private validation network. Verify peer discovery, block production, synchronization, transaction propagation, restart recovery and partition behavior.

## 3. Genesis

Generate the genesis artifact deterministically. Publish its SHA-256 hash with the release. Every production node must reject a different genesis configuration.

## 4. Backend

Configure production environment variables. Never commit secrets. Point the frontend only at verified production API/RPC endpoints.

## 5. Storage

Upload a test video, calculate its content identifier, replicate it to independent peers and retrieve it after stopping the original uploader.

## 6. Revenue

Run the 0 / 100 / 1,000 / 1,000,000 revenue distribution test vectors. Verify the sum of creator and platform shares exactly equals net distributable revenue.

## 7. Mobile

Test the production frontend at 320px, 375px, 414px, tablet and desktop widths. Verify navigation, upload, playback, wallet and creator dashboards without horizontal overflow.

## 8. Security

Run dependency audit, SAST, secret scanning and available fuzz/property tests. Block release on unresolved critical vulnerabilities.

## 9. DNS/TLS

Configure `nexastream.org` and any API/RPC/explorer subdomains only after the actual production endpoints exist. Verify HTTPS and certificate validity from an external network.

## 10. Release

Create a signed/tagged release containing:

- commit SHA
- genesis hash
- chain ID
- binary/image hashes
- test report
- security report
- deployment endpoints
- known limitations

Only then may the website status change to **Mainnet Live**.
