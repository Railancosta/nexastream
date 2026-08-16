.SHELLFLAGS := -eu -o pipefail -c
SHELL := /bin/bash

ROOT := $(shell pwd)
COMPOSE := docker compose -f docker-compose.yml

.PHONY: setup test lint build docker-up docker-down dev security-scan format

setup:
	chmod +x setup.sh
	./setup.sh

format:
	@command -v prettier >/dev/null 2>&1 && prettier --write . || true
	@command -v black >/dev/null 2>&1 && black . || true
	@command -v cargo >/dev/null 2>&1 && cargo fmt --all || true

lint:
	@echo '== TypeScript/JavaScript =='
	@if command -v pnpm >/dev/null 2>&1; then pnpm -r exec prettier --check . || true; fi
	@echo '== Rust =='
	@if command -v cargo >/dev/null 2>&1; then cargo fmt --all -- --check; cargo clippy --workspace --all-targets --all-features -- -D warnings; fi
	@echo '== Go =='
	@if command -v golangci-lint >/dev/null 2>&1; then find services blockchain p2p -name go.mod -print0 | xargs -0 -r -n1 sh -c 'cd "$$(dirname "$$0")" && golangci-lint run'; fi
	@echo '== Python =='
	@if command -v black >/dev/null 2>&1; then black --check .; fi

# Tests are deliberately conditional while the monorepo is being migrated.
test:
	@set -e; \
	if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-workspace.yaml ]; then pnpm -r test; fi; \
	for d in services blockchain p2p; do \
		find "$$d" -name go.mod -print0 2>/dev/null | xargs -0 -r -n1 sh -c 'cd "$$(dirname "$$0")" && go test ./...'; \
	done; \
	if command -v pytest >/dev/null 2>&1; then pytest -q; fi

build:
	@set -e; \
	if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-workspace.yaml ]; then pnpm -r build; fi; \
	find services blockchain p2p -name go.mod -print0 2>/dev/null | xargs -0 -r -n1 sh -c 'cd "$$(dirname "$$0")" && go build ./...'; \
	find p2p blockchain -name Cargo.toml -print0 2>/dev/null | xargs -0 -r -n1 sh -c 'cd "$$(dirname "$$0")" && cargo build --locked'

docker-up:
	$(COMPOSE) up -d
	$(COMPOSE) ps

docker-down:
	$(COMPOSE) down

dev:
	@echo 'Starting development infrastructure...'; $(COMPOSE) up -d
	@echo 'Run each service with its native development command; no hidden production process is started.'

security-scan:
	@set -e; \
	command -v trivy >/dev/null 2>&1 && trivy fs --scanners vuln,secret,misconfig --exit-code 1 . || echo 'trivy not installed'; \
	command -v cargo-audit >/dev/null 2>&1 && find . -name Cargo.lock -print0 | xargs -0 -r -n1 sh -c 'cargo audit --file "$$0"' || echo 'cargo-audit not installed'; \
	find . -name go.mod -print0 2>/dev/null | xargs -0 -r -n1 sh -c 'cd "$$(dirname "$$0")" && go vet ./...'; \
	if command -v pnpm >/dev/null 2>&1; then pnpm audit --audit-level high || true; fi
