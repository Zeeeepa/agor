import type { Repo, Worktree } from '@agor/core/types';
import type { Meta, StoryObj } from '@storybook/react';
import { EnvironmentPill } from './EnvironmentPill';

const meta: Meta<typeof EnvironmentPill> = {
  title: 'Components/EnvironmentPill',
  component: EnvironmentPill,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EnvironmentPill>;

// Base repo without environment config
const baseRepo: Repo = {
  repo_id: '0193d1e2-3f4a-7b5c-a8f3-9d2e1c4b5a6f',
  slug: 'myapp',
  name: 'My App',
  remote_url: 'https://github.com/user/myapp',
  local_path: '/Users/user/.agor/repos/myapp',
  default_branch: 'main',
  created_at: '2025-01-20T10:00:00Z',
  last_updated: '2025-01-20T10:00:00Z',
};

// Repo with environment config
const repoWithConfig: Repo = {
  ...baseRepo,
  environment_config: {
    start_command: 'docker compose up -d',
    stop_command: 'docker compose down',
    health_endpoint_template: 'http://localhost:{{add 9000 WORKTREE_UNIQUE_ID}}/health',
    url_templates: ['http://localhost:{{add 9000 WORKTREE_UNIQUE_ID}}'],
  },
};

// Base worktree
const baseWorktree: Worktree = {
  worktree_id: '0193d1e2-3f4a-7b5c-a8f3-9d2e1c4b5a6f',
  repo_id: baseRepo.repo_id,
  worktree_unique_id: 1,
  name: 'feature-auth',
  branch: 'feature/auth',
  path: '/Users/user/.agor/worktrees/myapp/feature-auth',
  created_at: '2025-01-20T10:00:00Z',
  updated_at: '2025-01-20T10:00:00Z',
  created_by: '0193d1e2-3f4a-7b5c-a8f3-9d2e1c4b5a6f',
  sessions: [],
  last_used: '2025-01-20T10:00:00Z',
};

export const NotConfigured: Story = {
  args: {
    repo: baseRepo,
    worktree: baseWorktree,
    onEdit: () => alert('Opening environment settings...'),
  },
};

export const ConfiguredButStopped: Story = {
  args: {
    repo: repoWithConfig,
    worktree: {
      ...baseWorktree,
      environment_instance: {
        status: 'stopped',
      },
    },
    onEdit: () => alert('Opening environment settings...'),
  },
};

export const Running: Story = {
  args: {
    repo: repoWithConfig,
    worktree: {
      ...baseWorktree,
      environment_instance: {
        status: 'running',
        access_urls: ['http://localhost:9001'],
        process: {
          pid: 12345,
          started_at: '2025-01-20T10:00:00Z',
          uptime: '2h 15m',
        },
        last_health_check: {
          timestamp: '2025-01-20T12:15:00Z',
          status: 'healthy',
        },
      },
    },
    onEdit: () => alert('Opening environment settings...'),
  },
};

export const Starting: Story = {
  args: {
    repo: repoWithConfig,
    worktree: {
      ...baseWorktree,
      environment_instance: {
        status: 'starting',
      },
    },
    onEdit: () => alert('Opening environment settings...'),
  },
};

export const Stopping: Story = {
  args: {
    repo: repoWithConfig,
    worktree: {
      ...baseWorktree,
      environment_instance: {
        status: 'stopping',
        access_urls: ['http://localhost:9001'],
      },
    },
    onEdit: () => alert('Opening environment settings...'),
  },
};

export const ErrorState: Story = {
  args: {
    repo: repoWithConfig,
    worktree: {
      ...baseWorktree,
      environment_instance: {
        status: 'error',
        last_health_check: {
          timestamp: '2025-01-20T12:15:00Z',
          status: 'unhealthy',
          message: 'Health check failed: Connection refused',
        },
      },
    },
    onEdit: () => alert('Opening environment settings...'),
  },
};
