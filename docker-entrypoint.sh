#!/bin/sh
set -e

echo "🚀 Starting Agor development environment..."

# Install dependencies (handles platform-specific binaries)
echo "📦 Installing dependencies..."
pnpm install

# Initialize database if it doesn't exist
if [ ! -f /root/.agor/agor.db ]; then
  echo "📦 Initializing database..."
  cd /app/packages/core
  pnpm exec tsx src/db/scripts/setup-db.ts
  cd /app

  # Wait a moment for database to be fully written
  sleep 1

  # Verify users table exists
  echo "🔍 Verifying database schema..."
  sqlite3 /root/.agor/agor.db "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" || {
    echo "❌ Users table not found! Database schema may be incomplete."
    exit 1
  }

  echo "👤 Creating default admin user..."
  # Create config with auth enabled
  mkdir -p /root/.agor
  cat > /root/.agor/config.yaml <<EOF
daemon:
  port: 3030
  host: localhost
  allowAnonymous: false
  requireAuth: true
EOF

  # Create admin user via CLI (uses defaults: admin@agor.live / admin)
  cd /app/apps/agor-cli
  pnpm exec tsx bin/dev.ts user create-admin
  cd /app
else
  echo "📦 Database already exists"
fi

# Start daemon in background
echo "📡 Starting daemon on port 3030..."
pnpm --filter @agor/daemon dev &
DAEMON_PID=$!

# Wait a bit for daemon to start
sleep 3

# Start UI in foreground (this keeps container alive)
echo "🎨 Starting UI on port ${VITE_PORT:-5173}..."
pnpm --filter agor-ui dev --host 0.0.0.0 --port "${VITE_PORT:-5173}"

# If UI exits, kill daemon too
kill $DAEMON_PID 2>/dev/null || true
