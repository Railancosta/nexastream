#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

REPO_URL="https://github.com/Railancosta/nexastream.git"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log(){ printf '[nexastream-setup] %s\n' "$*"; }
die(){ printf '[nexastream-setup][ERROR] %s\n' "$*" >&2; exit 1; }
need_cmd(){ command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"; }

clone_if_needed(){
  if git -C "$ROOT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
    ROOT_DIR="$(git -C "$ROOT_DIR" rev-parse --show-toplevel)"
    return
  fi
  need_cmd git
  TARGET="${NEXASTREAM_DIR:-$PWD/nexastream}"
  if [[ -e "$TARGET" ]]; then die "Target already exists: $TARGET"; fi
  git clone "$REPO_URL" "$TARGET"
  ROOT_DIR="$TARGET"
}

install_linux(){
  need_cmd apt-get
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl git build-essential pkg-config libssl-dev python3.12 python3.12-venv python3-pip docker.io docker-compose-plugin
}

install_macos(){
  need_cmd brew
  brew install git curl python@3.12 node@22 rustup-init
  rustup-init -y --no-modify-path || true
  export PATH="$HOME/.cargo/bin:/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin:$PATH"
  if ! command -v docker >/dev/null 2>&1; then
    log "Docker Desktop is required on macOS; install it from the official Docker distribution before running docker-up."
  fi
}

install_toolchains(){
  case "$(uname -s)" in
    Linux) install_linux ;;
    Darwin) install_macos ;;
    *) die "Unsupported OS. Use a Linux/macOS development environment or provision the required toolchains manually." ;;
  esac

  if ! command -v rustup >/dev/null 2>&1; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  fi
  # shellcheck disable=SC1090
  [[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"
  rustup toolchain install stable --profile minimal
  rustup default stable
  rustup component add rustfmt clippy

  command -v go >/dev/null 2>&1 || die "Go is required. Install Go 1.23+ and rerun setup."
  command -v python3.12 >/dev/null 2>&1 || die "Python 3.12 is required."
  command -v node >/dev/null 2>&1 || die "Node.js 22 is required."
  command -v docker >/dev/null 2>&1 || log "WARNING: Docker not installed; docker targets will not work yet."

  python3.12 -m venv "$ROOT_DIR/.venv"
  "$ROOT_DIR/.venv/bin/python" -m pip install --upgrade pip
  "$ROOT_DIR/.venv/bin/pip" install black==25.1.0 pre-commit==4.2.0
}

create_layout(){
  cd "$ROOT_DIR"
  mkdir -p \
    apps/web apps/android apps/desktop \
    services/{auth,users,videos,search,recommendations,analytics,payments,moderation,antifraud} \
    blockchain/{node,consensus,wallet,explorer} \
    p2p/{discovery,storage,relay,replication} \
    contracts sdk/{js,python,android} infrastructure/{terraform,docker,k8s} \
    monitoring security tests/{unit,integration,e2e,chaos,load} .githooks .github/workflows
}

configure_git(){
  cd "$ROOT_DIR"
  git config core.hooksPath .githooks
  cat > .githooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

command -v git >/dev/null 2>&1 || exit 1
if command -v prettier >/dev/null 2>&1; then prettier --check . >/dev/null || { echo 'Prettier check failed'; exit 1; }; fi
if command -v cargo >/dev/null 2>&1; then cargo fmt --all -- --check >/dev/null 2>&1 || { echo 'cargo fmt check failed'; exit 1; }; fi
if command -v black >/dev/null 2>&1; then black --check . >/dev/null 2>&1 || { echo 'black check failed'; exit 1; }; fi
if command -v gitleaks >/dev/null 2>&1; then gitleaks protect --staged --redact; fi
HOOK
  chmod +x .githooks/pre-commit
}

configure_js_tools(){
  cd "$ROOT_DIR"
  if command -v corepack >/dev/null 2>&1; then corepack enable || true; fi
  if command -v pnpm >/dev/null 2>&1; then pnpm add -Dw prettier eslint @eslint/js typescript typescript-eslint || true; fi
  if [[ ! -f .prettierrc.json ]]; then printf '{\n  "semi": true,\n  "singleQuote": true,\n  "trailingComma": "all"\n}\n' > .prettierrc.json; fi
}

write_env(){
  cd "$ROOT_DIR"
  [[ -f .env.example ]] || cat > .env.example <<'ENV'
NODE_ENV=development
LOG_LEVEL=info
DATABASE_URL=postgres://nexastream:nexastream@localhost:5432/nexastream
REDIS_URL=redis://localhost:6379/0
KAFKA_BROKERS=localhost:19092
CLICKHOUSE_URL=http://localhost:8123
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=change-me-local-only
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minioadmin
S3_BUCKET=nexastream-dev
JWT_SECRET=change-me-local-only
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
PROMETHEUS_URL=http://localhost:9090
ENV
}

main(){
  clone_if_needed
  install_toolchains
  create_layout
  configure_git
  configure_js_tools
  write_env
  log "Foundation scaffold completed at $ROOT_DIR"
  log "Run: make docker-up && make test"
  log "This script does not claim production readiness, decentralization, security, or scalability."
}
main "$@"
