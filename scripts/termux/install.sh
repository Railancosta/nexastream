#!/bin/bash
# =============================================================================
# NEXASTREAM - Termux Installation Script
# =============================================================================
# This script installs all dependencies and configures the NexaStream
# development environment on Termux (Android) or Ubuntu/Debian
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/Railancosta/nexastream.git"
REPO_DIR="$HOME/nexastream"
LOG_FILE="$HOME/nexastream-install.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check if running as root (needed for some installations)
check_root() {
    if [ "$EUID" -ne 0 ]; then
        warn "Not running as root. Some installations may fail."
        warn "Consider running: termux-change-repo and selecting root mirror"
    fi
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        OS=$DISTRIB_ID
        VER=$DISTRIB_RELEASE
    else
        OS="unknown"
        VER="unknown"
    fi
    
    # Check if Termux
    if [ -d "$PREFIX" ] && [ -d "$HOME" ]; then
        IS_TERMUX=true
    else
        IS_TERMUX=false
    fi
}

# Update package lists
update_packages() {
    log "Updating package lists..."
    if [ "$IS_TERMUX" = true ]; then
        pkg update -y 2>&1 | tee -a "$LOG_FILE"
    else
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -y 2>&1 | tee -a "$LOG_FILE"
        elif command -v yum &> /dev/null; then
            sudo yum update -y 2>&1 | tee -a "$LOG_FILE"
        elif command -v dnf &> /dev/null; then
            sudo dnf update -y 2>&1 | tee -a "$LOG_FILE"
        fi
    fi
}

# Install core dependencies
install_core_deps() {
    log "Installing core dependencies..."
    
    if [ "$IS_TERMUX" = true ]; then
        pkg install -y \
            git \
            curl \
            wget \
            build-essential \
            binutils \
            cmake \
            golang \
            python3 \
            python3-pip \
            nodejs \
            npm \
            openssh \
            termux-api \
            2>&1 | tee -a "$LOG_FILE"
    else
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y \
                git curl wget build-essential \
                binutils cmake golang \
                python3 python3-pip \
                nodejs npm openssh-client \
                2>&1 | tee -a "$LOG_FILE"
        fi
    fi
}

# Install Go dependencies for NexaChain
install_go_deps() {
    log "Installing Go dependencies..."
    
    cd "$REPO_DIR/nexachain"
    
    # Initialize Go module if needed
    if [ ! -f "go.mod" ]; then
        go mod init github.com/nexastream/nexachain
    fi
    
    go mod tidy 2>&1 | tee -a "$LOG_FILE"
}

# Install Node.js dependencies for backend
install_backend_deps() {
    log "Installing backend dependencies..."
    
    cd "$REPO_DIR/backend"
    
    if [ -f "package.json" ]; then
        npm install 2>&1 | tee -a "$LOG_FILE"
    fi
}

# Install Node.js dependencies for frontend
install_frontend_deps() {
    log "Installing frontend dependencies..."
    
    cd "$REPO_DIR/frontend"
    
    if [ -f "package.json" ]; then
        npm install 2>&1 | tee -a "$LOG_FILE"
    fi
}

# Clone or update repository
setup_repo() {
    log "Setting up NexaStream repository..."
    
    if [ -d "$REPO_DIR/.git" ]; then
        cd "$REPO_DIR"
        log "Repository exists. Pulling latest changes..."
        git pull origin main 2>&1 | tee -a "$LOG_FILE"
    else
        log "Cloning repository..."
        git clone "$REPO_URL" "$REPO_DIR" 2>&1 | tee -a "$LOG_FILE"
    fi
}

# Configure environment
configure_env() {
    log "Configuring environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "$REPO_DIR/.env" ]; then
        cat > "$REPO_DIR/.env" << EOF
# NexaStream Environment Configuration
NODE_ENV=development
PORT=3001
API_PORT=30303

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/nexastream
REDIS_URL=redis://localhost:6379

# Blockchain
BLOCKCHAIN_RPC=http://localhost:30303
BLOCKCHAIN_NETWORK_ID=1337
NST_SYMBOL=NST
NST_MAX_SUPPLY=55000000

# Storage
STORAGE_PATH=./storage/videos
CDN_BASE_URL=http://localhost:8080

# Security
JWT_SECRET=your-secret-key-change-in-production
ENCRYPTION_KEY=your-encryption-key

# API Keys (add your own)
# SUPABASE_URL=
# SUPABASE_KEY=
# CLOUDFLARE_API_TOKEN=
EOF
        log "Created .env file at $REPO_DIR/.env"
        warn "Please update the .env file with your configuration"
    fi
}

# Create storage directories
create_dirs() {
    log "Creating storage directories..."
    
    mkdir -p "$REPO_DIR/storage/videos"
    mkdir -p "$REPO_DIR/storage/temp"
    mkdir -p "$REPO_DIR/storage/thumbnails"
    mkdir -p "$REPO_DIR/storage/cdn"
    mkdir -p "$REPO_DIR/logs"
    
    log "Storage directories created"
}

# Install additional tools
install_tools() {
    log "Installing additional tools..."
    
    if [ "$IS_TERMUX" = true ]; then
        # Install FFmpeg for video processing
        pkg install -y ffmpeg 2>&1 | tee -a "$LOG_FILE"
        
        # Install Redis
        pkg install -y redis 2>&1 | tee -a "$LOG_FILE"
        
        # Install PostgreSQL client
        pkg install -y postgresql 2>&1 | tee -a "$LOG_FILE"
    else
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y \
                ffmpeg redis-server postgresql-client \
                2>&1 | tee -a "$LOG_FILE"
        fi
    fi
}

# Verify installation
verify_install() {
    log "Verifying installation..."
    
    local all_ok=true
    
    # Check Git
    if command -v git &> /dev/null; then
        info "Git: OK ($(git --version))"
    else
        error "Git: NOT FOUND"
        all_ok=false
    fi
    
    # Check Go
    if command -v go &> /dev/null; then
        info "Go: OK ($(go version))"
    else
        error "Go: NOT FOUND"
        all_ok=false
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        info "Node.js: OK ($(node --version))"
    else
        error "Node.js: NOT FOUND"
        all_ok=false
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        info "npm: OK ($(npm --version))"
    else
        error "npm: NOT FOUND"
        all_ok=false
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        info "Python: OK ($(python3 --version))"
    else
        error "Python: NOT FOUND"
        all_ok=false
    fi
    
    # Check FFmpeg (optional)
    if command -v ffmpeg &> /dev/null; then
        info "FFmpeg: OK"
    else
        warn "FFmpeg: NOT FOUND (video transcoding will be limited)"
    fi
    
    if [ "$all_ok" = true ]; then
        log "All core dependencies installed successfully!"
    else
        error "Some dependencies are missing. Please review the installation."
    fi
    
    return 0
}

# Print usage
usage() {
    cat << EOF
NexaStream Installation Script

Usage: $0 [OPTIONS]

OPTIONS:
    --help          Show this help message
    --minimal       Install only core dependencies
    --full          Install all dependencies (default)
    --skip-repo     Skip repository cloning
    --skip-deps     Skip dependency installation
    --verify        Only verify installation

EXAMPLES:
    $0              # Full installation
    $0 --minimal    # Minimal installation
    $0 --verify     # Verify current installation

EOF
}

# Main installation function
main() {
    local skip_repo=false
    local skip_deps=false
    local minimal=false
    local verify_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help)
                usage
                exit 0
                ;;
            --minimal)
                minimal=true
                shift
                ;;
            --full)
                minimal=false
                shift
                ;;
            --skip-repo)
                skip_repo=true
                shift
                ;;
            --skip-deps)
                skip_deps=true
                shift
                ;;
            --verify)
                verify_only=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Start installation
    echo "========================================"
    echo " NEXASTREAM INSTALLATION"
    echo "========================================"
    echo ""
    
    # Initialize log file
    echo "Installation started at $(date)" > "$LOG_FILE"
    
    # Detect OS
    detect_os
    info "Detected OS: $OS $VER"
    if [ "$IS_TERMUX" = true ]; then
        info "Running on Termux"
    fi
    
    # Check root
    check_root
    
    if [ "$verify_only" = true ]; then
        verify_install
        exit $?
    fi
    
    # Update packages
    update_packages
    
    # Install core dependencies
    install_core_deps
    
    # Install additional tools
    if [ "$minimal" = false ]; then
        install_tools
    fi
    
    # Setup repository
    if [ "$skip_repo" = false ]; then
        setup_repo
    fi
    
    # Install project dependencies
    if [ "$skip_deps" = false ]; then
        cd "$REPO_DIR"
        
        # Install Go dependencies
        if [ -d "nexachain" ]; then
            install_go_deps
        fi
        
        # Install backend dependencies
        if [ -d "backend" ]; then
            install_backend_deps
        fi
        
        # Install frontend dependencies
        if [ -d "frontend" ]; then
            install_frontend_deps
        fi
    fi
    
    # Configure environment
    configure_env
    
    # Create directories
    create_dirs
    
    # Verify installation
    verify_install
    
    echo ""
    echo "========================================"
    echo " INSTALLATION COMPLETE!"
    echo "========================================"
    echo ""
    log "NexaStream installed to: $REPO_DIR"
    log "Log file: $LOG_FILE"
    echo ""
    log "Next steps:"
    echo "  1. Update .env file with your configuration"
    echo "  2. Run './build.sh' to build the project"
    echo "  3. Run './test.sh' to run tests"
    echo "  4. Run './node.sh' to start the blockchain node"
    echo "  5. Run './backend.sh' to start the backend"
    echo "  6. Run './frontend.sh' to start the frontend"
    echo ""
}

# Run main function
main "$@"
