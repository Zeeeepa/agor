/**
 * `agor repo worktree list [repo-slug]` - List worktrees
 *
 * Shows all worktrees, optionally filtered by repository.
 */

import { createClient, isDaemonRunning } from '@agor/core/api';
import { getDaemonUrl } from '@agor/core/config';
import type { Repo, Worktree } from '@agor/core/types';
import { Args, Command } from '@oclif/core';
import chalk from 'chalk';
import Table from 'cli-table3';

// Type for paginated responses
interface Paginated<T> {
  total: number;
  limit: number;
  skip: number;
  data: T[];
}

export default class WorktreeList extends Command {
  static description = 'List git worktrees';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> myapp',
  ];

  static args = {
    repoSlug: Args.string({
      description: 'Repository slug (optional - shows all if omitted)',
      required: false,
    }),
  };

  /**
   * Format relative time
   */
  private formatRelativeTime(isoDate: string): string {
    const now = Date.now();
    const date = new Date(isoDate).getTime();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  /**
   * Truncate text
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  }

  async run(): Promise<void> {
    const { args } = await this.parse(WorktreeList);

    // Check if daemon is running
    const daemonUrl = await getDaemonUrl();
    const running = await isDaemonRunning(daemonUrl);

    if (!running) {
      this.error(
        `Daemon not running. Start it with: ${chalk.cyan('cd apps/agor-daemon && pnpm dev')}`
      );
    }

    try {
      const client = createClient(daemonUrl);
      const reposService = client.service('repos');

      // Build query
      const query: Record<string, unknown> = { managed_by_agor: true };
      if (args.repoSlug) {
        query.slug = args.repoSlug;
      }

      // Fetch repos
      const result = await reposService.find({ query });
      const repos = Array.isArray(result) ? result : (result as Paginated<Repo>).data;

      if (!repos || repos.length === 0) {
        if (args.repoSlug) {
          this.log(chalk.dim(`No Agor-managed repository found with slug '${args.repoSlug}'.`));
        } else {
          this.log(chalk.dim('No Agor-managed repositories found.'));
        }
        this.log('');
        this.log(`Add a repository with: ${chalk.cyan('agor repo add <git-url>')}`);
        this.log('');
        client.io.close();
        process.exit(0);
        return;
      }

      // Query worktrees table for all worktrees
      const worktreesService = client.service('worktrees');
      const worktreesResult = await worktreesService.find({ query: { $limit: 1000 } });
      const allWorktrees = Array.isArray(worktreesResult) ? worktreesResult : worktreesResult.data;

      if (allWorktrees.length === 0) {
        this.log(chalk.dim('No worktrees found.'));
        this.log('');
        this.log(`Create one with: ${chalk.cyan('agor repo worktree add <repo-slug> <name>')}`);
        this.log('');
        client.io.close();
        process.exit(0);
        return;
      }

      this.log('');

      // Group worktrees by repo_id
      const worktreesByRepo = new Map<string, Worktree[]>();
      for (const wt of allWorktrees as Worktree[]) {
        if (!worktreesByRepo.has(wt.repo_id)) {
          worktreesByRepo.set(wt.repo_id, []);
        }
        worktreesByRepo.get(wt.repo_id)?.push(wt);
      }

      // Display worktrees grouped by repo
      for (const repo of repos) {
        const repoWorktrees = worktreesByRepo.get(repo.repo_id) || [];
        if (repoWorktrees.length === 0) continue;

        this.log(chalk.bold(`Repository: ${chalk.cyan(repo.slug)}`));

        const table = new Table({
          head: [
            chalk.cyan('Name'),
            chalk.cyan('Branch'),
            chalk.cyan('Sessions'),
            chalk.cyan('Last Used'),
          ],
          style: {
            head: [],
            border: ['dim'],
          },
          colWidths: [20, 25, 10, 15],
        });

        for (const worktree of repoWorktrees) {
          table.push([
            worktree.name,
            worktree.ref,
            (worktree.sessions?.length || 0).toString(),
            chalk.dim(this.formatRelativeTime(worktree.last_used || worktree.created_at)),
          ]);
        }

        this.log(table.toString());
        this.log('');
      }

      this.log(
        chalk.dim(`Showing ${allWorktrees.length} worktree(s) across ${repos.length} repo(s)`)
      );
      this.log('');

      // Close socket
      client.io.close();
      process.exit(0);
    } catch (error) {
      this.error(
        `Failed to list worktrees: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
