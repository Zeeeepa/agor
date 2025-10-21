/**
 * Git Utils for Agor
 *
 * Provides Git operations for repo management and worktree isolation
 */

import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { simpleGit } from 'simple-git';

export interface CloneOptions {
  url: string;
  targetDir?: string;
  bare?: boolean;
  onProgress?: (progress: CloneProgress) => void;
}

export interface CloneProgress {
  method: string;
  stage: string;
  progress: number;
  processed?: number;
  total?: number;
}

export interface CloneResult {
  path: string;
  repoName: string;
  defaultBranch: string;
}

/**
 * Get default Agor repos directory (~/.agor/repos)
 */
export function getReposDir(): string {
  return join(homedir(), '.agor', 'repos');
}

/**
 * Extract repo name from Git URL
 *
 * Examples:
 * - git@github.com:apache/superset.git -> superset
 * - https://github.com/facebook/react.git -> react
 */
export function extractRepoName(url: string): string {
  const match = url.match(/\/([^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Could not extract repo name from URL: ${url}`);
  }
  return match[1];
}

/**
 * Clone a Git repository to ~/.agor/repos/<name>
 *
 * @param options - Clone options
 * @returns Clone result with path and metadata
 */
export async function cloneRepo(options: CloneOptions): Promise<CloneResult> {
  const repoName = extractRepoName(options.url);
  const reposDir = getReposDir();
  const targetPath = options.targetDir || join(reposDir, repoName);

  // Ensure repos directory exists
  await mkdir(reposDir, { recursive: true });

  // Configure git with progress tracking
  const git = simpleGit({
    progress: options.onProgress
      ? ({ method, stage, progress }: { method: string; stage: string; progress: number }) => {
          options.onProgress?.({
            method,
            stage,
            progress,
          });
        }
      : undefined,
  });

  // Clone the repo
  await git.clone(options.url, targetPath, options.bare ? ['--bare'] : []);

  // Get default branch
  const repoGit = simpleGit(targetPath);
  const branches = await repoGit.branch();
  const defaultBranch = branches.current || 'main';

  return {
    path: targetPath,
    repoName,
    defaultBranch,
  };
}

/**
 * Check if a directory is a Git repository
 */
export async function isGitRepo(path: string): Promise<boolean> {
  try {
    const git = simpleGit(path);
    await git.status();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  const git = simpleGit(repoPath);
  const status = await git.status();
  return status.current || '';
}

/**
 * Get current commit SHA
 */
export async function getCurrentSha(repoPath: string): Promise<string> {
  const git = simpleGit(repoPath);
  const log = await git.log({ maxCount: 1 });
  return log.latest?.hash || '';
}

/**
 * Check if working directory is clean (no uncommitted changes)
 */
export async function isClean(repoPath: string): Promise<boolean> {
  const git = simpleGit(repoPath);
  const status = await git.status();
  return status.isClean();
}

/**
 * Get remote URL
 */
export async function getRemoteUrl(repoPath: string, remote: string = 'origin'): Promise<string> {
  const git = simpleGit(repoPath);
  const remotes = await git.getRemotes(true);
  const remoteObj = remotes.find((r: { name: string }) => r.name === remote);
  return remoteObj?.refs.fetch || '';
}

/**
 * Get worktrees directory (~/.agor/worktrees)
 */
export function getWorktreesDir(): string {
  return join(homedir(), '.agor', 'worktrees');
}

/**
 * Get path for a specific worktree
 */
export function getWorktreePath(repoSlug: string, worktreeName: string): string {
  return join(getWorktreesDir(), repoSlug, worktreeName);
}

export interface WorktreeInfo {
  name: string;
  path: string;
  ref: string;
  sha: string;
  detached: boolean;
}

/**
 * Create a git worktree
 *
 * @param repoPath - Path to bare repository
 * @param worktreePath - Path where worktree should be created
 * @param ref - Branch/tag/commit to checkout
 * @param createBranch - Whether to create a new branch
 */
export async function createWorktree(
  repoPath: string,
  worktreePath: string,
  ref: string,
  createBranch: boolean = false
): Promise<void> {
  const git = simpleGit(repoPath);
  const args = [worktreePath];

  if (createBranch) {
    args.push('-b', ref);
  } else {
    args.push(ref);
  }

  await git.raw(['worktree', 'add', ...args]);
}

/**
 * List all worktrees for a repository
 */
export async function listWorktrees(repoPath: string): Promise<WorktreeInfo[]> {
  const git = simpleGit(repoPath);
  const output = await git.raw(['worktree', 'list', '--porcelain']);

  const worktrees: WorktreeInfo[] = [];
  const lines = output.split('\n');

  let current: Partial<WorktreeInfo> = {};

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      current.path = line.substring(9);
      current.name = basename(current.path);
    } else if (line.startsWith('HEAD ')) {
      current.sha = line.substring(5);
    } else if (line.startsWith('branch ')) {
      current.ref = line.substring(7).replace('refs/heads/', '');
      current.detached = false;
    } else if (line.startsWith('detached')) {
      current.detached = true;
    } else if (line === '') {
      if (current.path && current.sha) {
        worktrees.push(current as WorktreeInfo);
      }
      current = {};
    }
  }

  // Handle last entry
  if (current.path && current.sha) {
    worktrees.push(current as WorktreeInfo);
  }

  return worktrees;
}

/**
 * Remove a git worktree
 */
export async function removeWorktree(repoPath: string, worktreeName: string): Promise<void> {
  const git = simpleGit(repoPath);
  await git.raw(['worktree', 'remove', worktreeName]);
}

/**
 * Prune stale worktree metadata
 */
export async function pruneWorktrees(repoPath: string): Promise<void> {
  const git = simpleGit(repoPath);
  await git.raw(['worktree', 'prune']);
}

/**
 * Check if a remote branch exists
 */
export async function hasRemoteBranch(
  repoPath: string,
  branchName: string,
  remote: string = 'origin'
): Promise<boolean> {
  const git = simpleGit(repoPath);
  const branches = await git.branch(['-r']);
  return branches.all.includes(`${remote}/${branchName}`);
}

/**
 * Get list of remote branches
 */
export async function getRemoteBranches(
  repoPath: string,
  remote: string = 'origin'
): Promise<string[]> {
  const git = simpleGit(repoPath);
  const branches = await git.branch(['-r']);
  return branches.all
    .filter((b: string) => b.startsWith(`${remote}/`))
    .map((b: string) => b.replace(`${remote}/`, ''));
}
