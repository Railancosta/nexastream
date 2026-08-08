# NexaChain Node Dockerfile
# Multi-stage build for minimal image size

# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates gcc musl-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o nexachain \
    ./cmd/nexachain

# Runtime stage
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    iputils \
    curl \
    ncurses

# Create non-root user
RUN adduser -D -u 1000 nexachain

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/nexachain .

# Create data directory
RUN mkdir -p /data && chown -R nexachain:nexachain /data

# Set environment
ENV HOME=/home/nexachain
ENV PATH=$PATH:/app

# Switch to non-root user
USER nexachain

# Expose ports
EXPOSE 30303 26657 26656

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD nc -z localhost 26657 || exit 1

# Run the node
ENTRYPOINT ["./nexachain"]
