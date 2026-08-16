# NexaStream Termux Scripts

Scripts for running NexaStream on Termux (Android) or Ubuntu/Debian.

## Quick Start

### 1. Install Dependencies

```bash
bash scripts/termux/install.sh
```

### 2. Build Components

```bash
bash scripts/termux/build.sh
```

### 3. Run Tests

```bash
bash scripts/termux/test.sh
```

## Available Scripts

| Script | Description |
|--------|-------------|
| install.sh | Install all dependencies |
| build.sh | Build all components |
| test.sh | Run test suites |
| node.sh | Start blockchain node |
| validator.sh | Run as validator |
| miner.sh | Start mining |
| backend.sh | Start backend API |
| frontend.sh | Start frontend |
| deploy.sh | Deploy components |
| healthcheck.sh | Check system health |
| update.sh | Update and rebuild |

## Usage

### Start Blockchain Node

```bash
# Start node
bash scripts/termux/node.sh start

# Initialize new node
bash scripts/termux/node.sh init

# Generate wallet
bash scripts/termux/node.sh wallet

# Check status
bash scripts/termux/node.sh status
```

### Run Validator

```bash
# Start validator
bash scripts/termux/validator.sh start

# Stake NST
bash scripts/termux/validator.sh stake 1000

# Check status
bash scripts/termux/validator.sh status
```

### Start Mining

```bash
# Start miner
bash scripts/termux/miner.sh start

# Set reward address
bash scripts/termux/miner.sh set-address 0x...

# Check status
bash scripts/termux/miner.sh status
```

### Start Backend

```bash
# Start backend
bash scripts/termux/backend.sh start

# Check status
bash scripts/termux/backend.sh status

# View logs
bash scripts/termux/backend.sh logs
```

### Start Frontend

```bash
# Start frontend
bash scripts/termux/frontend.sh start

# Build for production
bash scripts/termux/frontend.sh build
```

## Health Check

Check all services:

```bash
bash scripts/termux/healthcheck.sh
```

## Update

Update all components:

```bash
bash scripts/termux/update.sh all
```

Backup before updating:

```bash
bash scripts/termux/update.sh backup
```

## Requirements

### Termux (Android)
- Termux app installed
- Internet connection
- At least 2GB free storage

### Ubuntu/Debian
- Root or sudo access
- Git, curl, wget
- Node.js 18+
- Go 1.21+
- npm

## Environment Variables

Create `.env` file:

```env
NODE_ENV=development
PORT=3001
BLOCKCHAIN_RPC_PORT=8545
BLOCKCHAIN_P2P_PORT=30303
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret
```

## Troubleshooting

### Node not starting
- Check if port is in use: `lsof -i :8545`
- Check logs: `tail -f logs/node.log`

### Build errors
- Update dependencies: `bash scripts/termux/update.sh deps`
- Clear build cache: `rm -rf node_modules build`

### Connection issues
- Verify firewall settings
- Check network connectivity
- Ensure correct ports are open

## Support

For issues, visit:
- GitHub: https://github.com/Railancosta/nexastream
- Discord: https://discord.gg/nexastream
