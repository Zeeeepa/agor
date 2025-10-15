import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'db/index': 'src/db/index.ts',
    'git/index': 'src/git/index.ts',
    'api/index': 'src/api/index.ts',
    'claude/index': 'src/claude/index.ts',
    'config/index': 'src/config/index.ts',
    'tools/index': 'src/tools/index.ts',
    'tools/claude/models': 'src/tools/claude/models.ts',
    'permissions/index': 'src/permissions/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  // Don't bundle the Agent SDK - it needs to resolve its own internal files
  external: ['@anthropic-ai/claude-agent-sdk'],
});
