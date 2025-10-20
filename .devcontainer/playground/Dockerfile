FROM mcr.microsoft.com/devcontainers/typescript-node:20 AS builder

# Install system dependencies for build
RUN apt-get update && apt-get install -y \
    sqlite3 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@9.15.1

# Set working directory for build
WORKDIR /build

# Copy entire repository
COPY . .

# Install and build - verbose for debugging
RUN echo "=== Starting pnpm install ===" && \
    pnpm install && \
    echo "=== Install complete, starting build ===" && \
    pnpm -r build && \
    echo "=== Build complete ==="

# Production stage
FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm and AI CLIs in production stage
RUN npm install -g pnpm@9.15.1 @anthropic-ai/claude-code @google/gemini-cli @openai/codex

# Copy built application from builder
WORKDIR /workspaces/agor
COPY --from=builder /build /workspaces/agor

# Run as root for simplified sandbox
