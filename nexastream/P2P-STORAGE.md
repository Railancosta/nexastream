# NexaStream P2P Storage Guide

## Overview

NexaStream uses P2P distributed storage to keep videos available without depending on a single server.

## Architecture

```
VIDEO UPLOAD → CONTENT ADDRESSING → DISTRIBUTED STORAGE → PEER RETRIEVAL
```

## Content Addressing (CID)

Every video gets a Content Identifier (CID):

```
Video
  ↓
Chunks (1MB each)
  ↓
Hash (SHA-256)
  ↓
CID (Content Identifier)
  ↓
Network-wide reference
```

### Example CID
```
QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco
```

## IPFS Integration

### Running IPFS Node

```bash
# Using Docker
docker run -d --name ipfs \
  -p 5001:5001 \
  -p 8080:8080 \
  ipfs/kubo:v0.24.0

# Or standalone
ipfs daemon
```

### Upload Video

```bash
# Add file to IPFS
curl -X POST -F "file=@myvideo.mp4" \
  http://localhost:5001/api/v0/add

# Response:
# {"Name":"myvideo.mp4","Hash":"Qm...","Size":"1234567"}
```

### Retrieve Video

```bash
# Via gateway
curl https://localhost:8080/ipfs/Qm...

# Or directly via IPFS
ipfs cat /ipfs/Qm...
```

## Distributed Replication

### Replication Protocol

```
1. Video uploaded → CID generated
2. System calculates: "How many replicas needed?"
3. Storage nodes receive chunks
4. Each node announces: "I have chunk X"
5. Network tracks replica count
6. If replicas < minimum → Replicate
```

### Minimum Replicas

Default: 3 replicas

```yaml
# Configuration
storage:
  min_replicas: 3
  target_replicas: 5
```

## Storage Node Setup

### Full Storage Node

```bash
# Build
cd nexastream/nexachain
go build -o nexachain ./cmd/nexachain

# Run as storage node
./nexachain --node-type storage \
  --storage-path /data/nexastream \
  --port 30303
```

### Docker Storage Node

```yaml
# docker-compose.yml
services:
  storage-node:
    build: ./nexachain
    environment:
      - NODE_TYPE=storage
      - STORAGE_PATH=/data
      - MIN_REPLICAS=3
    volumes:
      - ./data:/data
    ports:
      - "30303:30303"
```

## P2P Video Retrieval

```
USER REQUEST
    ↓
PEER DISCOVERY (DHT)
    ↓
FIND CHUNK HOLDERS
    ↓
CONNECT TO FASTEST PEERS
    ↓
DOWNLOAD CHUNKS
    ↓
ASSEMBLE VIDEO
    ↓
PLAYBACK
```

### Discovery Methods

1. **DHT**: Find peers by content (CID)
2. **Peer Exchange**: Get peer list from connected peers
3. **Bootstrap**: Connect to known peers

## Network Resilience

### If One Node Goes Offline

```
Original:  [Node A] [Node B] [Node C] [Node D] [Node E]
                 ↓
Node C offline
                 ↓
Network detects: replicas < minimum
                 ↓
Replicate to available node
                 ↓
Restored:  [Node A] [Node B] [Node D] [Node E] [Node F]
```

### Content Availability

```
Availability Score = (Online Replicas / Total Replicas) × Uptime Factor

High availability:  80-100% (many copies, most online)
Medium:             50-79%  (some copies available)
Low:                <50%    (content at risk)
Critical:           <min%   (needs replication NOW)
```

## Garbage Collection

Files not accessed for long time may be garbage collected:

```
Last Access: 30 days ago
  ↓
Warning sent to content owners
  ↓
If no response: Mark for GC
  ↓
Remove from node (save space)
  ↓
If still needed: Re-replicate from other nodes
```

## Testing P2P Storage

### Local Test

```bash
# 1. Start IPFS
docker run -d -p 5001:5001 -p 8080:8080 ipfs/kubo:v0.24.0

# 2. Upload test file
echo "NexaStream Test Video" > test.txt
curl -X POST -F "file=@test.txt" http://localhost:5001/api/v0/add

# 3. Verify CID returned
# 4. Try to retrieve via gateway
curl http://localhost:8080/ipfs/<CID>
```

### Multi-Node Test

```bash
# Node 1
docker run -d --name ipfs1 -p 5001:5001 ipfs/kubo:v0.24.0

# Node 2  
docker run -d --name ipfs2 -p 5002:5001 ipfs/kubo:v0.24.0

# Connect nodes
docker exec ipfs1 ipfs swarm connect /ip4/127.0.0.1/tcp/5002/p2p/$(docker exec ipfs2 ipfs config Identity.PeerID)
```

## Current Status

| Feature | Status |
|---------|--------|
| IPFS upload | ✅ Working |
| CID generation | ✅ Working |
| Gateway retrieval | ✅ Working |
| Multi-node replication | ⚠️ Planning |
| Auto-replication | ⚠️ Planning |
| Garbage collection | ⚠️ Planning |
| Storage market | ❌ Future |

## Troubleshooting

### IPFS Gateway Slow

```bash
# Check peers
curl http://localhost:5001/api/v0/swarm/peers

# Add more peers
curl -X POST -F "uri=/ip4/PEER_IP/tcp/4001/p2p/PEER_ID" \
  http://localhost:5001/api/v0/swarm/connect
```

### Chunk Unavailable

```
Error: cannot retrieve chunk Qm...
  ↓
Possible causes:
  - No peers have this chunk
  - All holders offline
  - Network partition
  ↓
Solutions:
  - Wait for holders to come online
  - Re-upload content
  - Pin content on your node
```

### Low Replication

```bash
# Check replication status
curl http://localhost:5001/api/v0/dht/findprovs/Qm...

# If few providers:
# 1. Pin content on more nodes
# 2. Wait for network to stabilize
# 3. Check storage node availability
```

## Best Practices

1. **Always verify CID**: Check hash matches after download
2. **Pin important content**: Prevents GC removal
3. **Maintain minimum replicas**: Ensures availability
4. **Monitor node health**: Check storage usage, peer count
5. **Use secure connections**: Enable encrypted transport

## Future Improvements

- [ ] Storage market with NST payments
- [ ] Proof of storage validation
- [ ] Bandwidth credit system
- [ ] Automatic quality adjustment
- [ ] CDN integration (optional)

---

For more information, see:
- [DECENTRALIZED-ARCHITECTURE.md](./DECENTRALIZED-ARCHITECTURE.md)
- [MAINNET.md](./MAINNET.md)
