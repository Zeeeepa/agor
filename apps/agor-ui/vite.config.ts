import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Fix "504 Outdated Optimize Dep" errors with workspace dependencies
  optimizeDeps: {
    // Exclude workspace dependencies from pre-bundling
    // This forces Vite to always use the latest built version
    // Also exclude agent SDKs that have Node.js dependencies
    exclude: [
      '@agor/core',
      '@openai/codex-sdk',
      '@anthropic-ai/claude-agent-sdk',
      '@google/gemini-cli-core',
    ],
  },

  // Mark Node.js-only packages as external so they're not bundled
  build: {
    rollupOptions: {
      external: ['@openai/codex-sdk', '@anthropic-ai/claude-agent-sdk', '@google/gemini-cli-core'],
    },
  },

  server: {
    // Bind to 0.0.0.0 for Codespaces/Docker accessibility
    host: '0.0.0.0',
    port: 5173,
    // Watch for changes in workspace packages
    watch: {
      // Watch the @agor/core dist directory for changes
      ignored: ['!**/node_modules/@agor/core/**'],
    },
    fs: {
      // Allow serving files from the monorepo root
      allow: ['../..'],
    },
  },
});
