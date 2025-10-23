/**
 * Claude Prompt Service
 *
 * Handles live execution of prompts against Claude sessions using Claude Agent SDK.
 * Automatically loads CLAUDE.md and uses preset system prompts matching Claude Code CLI.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type {
  HookJSONOutput,
  PermissionMode,
  PreToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk/sdk';
import type { MCPServerRepository } from '../../db/repositories/mcp-servers';
import type { MessagesRepository } from '../../db/repositories/messages';
import type { SessionMCPServerRepository } from '../../db/repositories/session-mcp-servers';
import type { SessionRepository } from '../../db/repositories/sessions';
import type { WorktreeRepository } from '../../db/repositories/worktrees';
import { generateId } from '../../lib/ids';
import { validateDirectory } from '../../lib/validation';
import type { PermissionService } from '../../permissions/permission-service';
import type { MCPServersConfig, Message, MessageID, SessionID, TaskID } from '../../types';
import { MessageRole, PermissionStatus, TaskStatus } from '../../types';
import type { SessionsService, TasksService } from './claude-tool';
import { SDKMessageProcessor } from './message-processor';
import { DEFAULT_CLAUDE_MODEL } from './models';

/**
 * Get path to Claude Code executable
 * Uses `which claude` to find it in PATH
 */
function getClaudeCodePath(): string {
  try {
    const path = execSync('which claude', { encoding: 'utf-8' }).trim();
    if (path) return path;
  } catch {
    // which failed, try common paths
  }

  // Fallback to common installation paths
  const commonPaths = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${process.env.HOME}/.nvm/versions/node/v20.19.4/bin/claude`,
  ];

  for (const path of commonPaths) {
    try {
      execSync(`test -x "${path}"`, { encoding: 'utf-8' });
      return path;
    } catch {}
  }

  throw new Error(
    'Claude Code executable not found. Install with: npm install -g @anthropic-ai/claude-code'
  );
}

export interface PromptResult {
  /** Assistant messages (can be multiple: tool invocation, then response) */
  messages: Array<{
    content: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    toolUses?: Array<{
      id: string;
      name: string;
      input: Record<string, unknown>;
    }>;
  }>;
  /** Number of input tokens */
  inputTokens: number;
  /** Number of output tokens */
  outputTokens: number;
}

export class ClaudePromptService {
  /** Enable token-level streaming from Claude Agent SDK */
  private static readonly ENABLE_TOKEN_STREAMING = true;

  /** Store active Query objects per session for interruption */
  // biome-ignore lint/suspicious/noExplicitAny: Query type from SDK is complex
  private activeQueries = new Map<SessionID, any>();

  /** Track stop requests for immediate loop breaking */
  private stopRequested = new Map<SessionID, boolean>();

  /** Serialize permission checks per session to prevent duplicate prompts for concurrent tool calls */
  private permissionLocks = new Map<SessionID, Promise<void>>();

  constructor(
    private messagesRepo: MessagesRepository,
    private sessionsRepo: SessionRepository,
    private apiKey?: string,
    private sessionMCPRepo?: SessionMCPServerRepository,
    private mcpServerRepo?: MCPServerRepository,
    private permissionService?: PermissionService,
    private tasksService?: TasksService,
    private sessionsService?: SessionsService, // FeathersJS Sessions service for WebSocket broadcasting
    private worktreesRepo?: WorktreeRepository,
    private messagesService?: import('./claude-tool').MessagesService // FeathersJS Messages service for creating permission requests
  ) {
    // No client initialization needed - Agent SDK is stateless
  }

  /**
   * Create PreToolUse hook for permission handling
   * @private
   */
  private createPreToolUseHook(sessionId: SessionID, taskId: TaskID) {
    return async (
      input: PreToolUseHookInput,
      toolUseID: string | undefined,
      options: { signal: AbortSignal }
    ): Promise<HookJSONOutput> => {
      // If no permission service or tasks service, allow by default
      if (!this.permissionService || !this.tasksService) {
        return {};
      }

      // Track lock release function for finally block
      let releaseLock: (() => void) | undefined;

      try {
        // STEP 1: Wait for any pending permission check to finish (queue serialization)
        // This prevents duplicate prompts for concurrent tool calls
        const existingLock = this.permissionLocks.get(sessionId);
        if (existingLock) {
          console.log(
            `⏳ Waiting for pending permission check to complete (session ${sessionId.substring(0, 8)})`
          );
          await existingLock;
          console.log(`✅ Permission check complete, rechecking DB...`);
        }

        // STEP 2: Check session-specific permission overrides
        // IMPORTANT: Re-fetch after waiting for lock - previous hook may have saved permission
        const session = await this.sessionsRepo.findById(sessionId);

        if (session?.permission_config?.allowedTools?.includes(input.tool_name)) {
          console.log(`✅ Tool ${input.tool_name} allowed by session config (after queue wait)`);
          return {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'allow',
              permissionDecisionReason: 'Allowed by session config',
            },
          };
        }

        // STEP 3: No existing permission - create lock and show prompt
        console.log(
          `🔒 No permission found for ${input.tool_name}, creating lock and prompting user...`
        );
        const newLock = new Promise<void>(resolve => {
          releaseLock = resolve;
        });
        this.permissionLocks.set(sessionId, newLock);

        // Generate request ID
        const requestId = generateId();
        const timestamp = new Date().toISOString();

        // Get current message index for this session
        const existingMessages = await this.messagesRepo.findBySessionId(sessionId);
        const nextIndex = existingMessages.length;

        // Create permission request message
        console.log(`🔒 Creating permission request message for ${input.tool_name}`, {
          request_id: requestId,
          task_id: taskId,
          index: nextIndex,
        });

        const permissionMessage: Message = {
          message_id: generateId() as MessageID,
          session_id: sessionId,
          task_id: taskId,
          type: 'permission_request',
          role: MessageRole.SYSTEM,
          index: nextIndex,
          timestamp,
          content_preview: `Permission required: ${input.tool_name}`,
          content: {
            request_id: requestId,
            tool_name: input.tool_name,
            tool_input: input.tool_input as Record<string, unknown>,
            tool_use_id: toolUseID,
            status: PermissionStatus.PENDING,
          },
        };

        try {
          if (this.messagesService) {
            await this.messagesService.create(permissionMessage);
            console.log(`✅ Permission request message created successfully`);
          }
        } catch (createError) {
          console.error(`❌ CRITICAL: Failed to create permission request message:`, createError);
          throw createError;
        }

        // Update task status to 'awaiting_permission'
        try {
          await this.tasksService.patch(taskId, {
            status: TaskStatus.AWAITING_PERMISSION,
          });
          console.log(`✅ Task ${taskId} updated to awaiting_permission`);
        } catch (patchError) {
          console.error(`❌ CRITICAL: Failed to patch task ${taskId}:`, patchError);
          throw patchError;
        }

        // Emit WebSocket event for UI (broadcasts to ALL viewers)
        this.permissionService.emitRequest(sessionId, {
          requestId,
          taskId,
          toolName: input.tool_name,
          toolInput: input.tool_input as Record<string, unknown>,
          toolUseID,
          timestamp,
        });

        // Wait for UI decision (Promise pauses SDK execution)
        const decision = await this.permissionService.waitForDecision(
          requestId,
          taskId,
          options.signal
        );

        // Update permission request message with approval/denial
        if (this.messagesService) {
          const baseContent =
            typeof permissionMessage.content === 'object' &&
            !Array.isArray(permissionMessage.content)
              ? permissionMessage.content
              : {};
          // biome-ignore lint/suspicious/noExplicitAny: FeathersJS service has patch method but type definition is incomplete
          await (this.messagesService as any).patch(permissionMessage.message_id, {
            content: {
              ...(baseContent as Record<string, unknown>),
              status: decision.allow ? PermissionStatus.APPROVED : PermissionStatus.DENIED,
              scope: decision.remember ? decision.scope : undefined,
              approved_by: decision.decidedBy,
              approved_at: new Date().toISOString(),
            },
          });
          console.log(
            `✅ Permission request message updated: ${decision.allow ? 'approved' : 'denied'}`
          );
        }

        // Update task status
        await this.tasksService.patch(taskId, {
          status: decision.allow ? TaskStatus.RUNNING : TaskStatus.FAILED,
        });

        // Persist decision if user clicked "Remember"
        if (decision.remember) {
          // RE-FETCH session to get latest data (avoid stale closure)
          const freshSession = await this.sessionsRepo.findById(sessionId);
          if (!freshSession) {
            return {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: decision.allow ? 'allow' : 'deny',
                permissionDecisionReason: decision.reason,
              },
            };
          }

          if (decision.scope === 'session') {
            // Update session-level permissions via FeathersJS service (broadcasts WebSocket events)
            const currentAllowed = freshSession.permission_config?.allowedTools || [];

            // IMPORTANT: Use FeathersJS service (if available) for WebSocket broadcasting
            // Fall back to repository if service not available (e.g., in tests)
            const newAllowedTools = [...currentAllowed, input.tool_name];
            const updateData = {
              permission_config: {
                allowedTools: newAllowedTools,
              },
            };

            if (this.sessionsService) {
              await this.sessionsService.patch(sessionId, updateData);
            } else {
              await this.sessionsRepo.update(sessionId, updateData);
            }
          } else if (decision.scope === 'project') {
            // Update project-level permissions in .claude/settings.json
            // Get worktree path to determine project directory
            if (freshSession.worktree_id && this.worktreesRepo) {
              const worktree = await this.worktreesRepo.findById(freshSession.worktree_id);
              if (worktree) {
                await this.updateProjectSettings(worktree.path, {
                  allowTools: [input.tool_name],
                });
              }
            }
          }
        }

        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: decision.allow ? 'allow' : 'deny',
            permissionDecisionReason: decision.reason,
          },
        };
      } catch (error) {
        // On any error in the permission flow, mark task as failed
        console.error('PreToolUse hook error:', error);

        try {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const timestamp = new Date().toISOString();
          await this.tasksService.patch(taskId, {
            status: TaskStatus.FAILED,
            report: `Error: ${errorMessage}\nTimestamp: ${timestamp}`,
          });
        } catch (updateError) {
          console.error('Failed to update task status:', updateError);
        }

        // Return deny to SDK so tool doesn't execute
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `Permission hook failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        };
      } finally {
        // STEP 4: Always release the lock when done (success or error)
        // This allows queued hooks to proceed
        if (releaseLock) {
          releaseLock();
          this.permissionLocks.delete(sessionId);
          console.log(`🔓 Released permission lock for session ${sessionId.substring(0, 8)}`);
        }
      }
    };
  }

  /**
   * Update project-level permissions in .claude/settings.json
   * @private
   */
  private async updateProjectSettings(
    cwd: string,
    changes: {
      allowTools?: string[];
      denyTools?: string[];
    }
  ) {
    const settingsPath = path.join(cwd, '.claude', 'settings.json');

    // Read existing settings or create default structure
    // biome-ignore lint/suspicious/noExplicitAny: Settings JSON structure is dynamic
    let settings: any = {};
    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    } catch {
      // File doesn't exist, create default structure
      settings = { permissions: { allow: { tools: [] } } };
    }

    // Ensure permissions structure exists
    if (!settings.permissions) settings.permissions = {};
    if (!settings.permissions.allow) settings.permissions.allow = {};
    if (!settings.permissions.allow.tools) settings.permissions.allow.tools = [];

    // Apply changes
    if (changes.allowTools) {
      settings.permissions.allow.tools = [
        ...new Set([...settings.permissions.allow.tools, ...changes.allowTools]),
      ];
    }
    if (changes.denyTools) {
      if (!settings.permissions.deny) settings.permissions.deny = [];
      settings.permissions.deny = [
        ...new Set([...settings.permissions.deny, ...changes.denyTools]),
      ];
    }

    // Ensure .claude directory exists
    const claudeDir = path.join(cwd, '.claude');
    try {
      await fs.mkdir(claudeDir, { recursive: true });
    } catch {}

    // Write updated settings
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }

  /**
   * Load session and initialize query
   * @private
   */
  private async setupQuery(
    sessionId: SessionID,
    prompt: string,
    taskId?: TaskID,
    permissionMode?: PermissionMode,
    resume = true
  ): Promise<{
    // biome-ignore lint/suspicious/noExplicitAny: SDK Message types include user, assistant, stream_event, result, etc.
    query: AsyncGenerator<any, any, unknown>;
    resolvedModel: string;
    getStderr: () => string;
  }> {
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Determine model to use (session config or default)
    const modelConfig = session.model_config;
    const model = modelConfig?.model || DEFAULT_CLAUDE_MODEL;

    // Determine CWD from worktree (if session has one)
    let cwd = process.cwd();
    if (session.worktree_id && this.worktreesRepo) {
      try {
        const worktree = await this.worktreesRepo.findById(session.worktree_id);
        if (worktree) {
          cwd = worktree.path;
          console.log(`✅ Using worktree path as cwd: ${cwd}`);
        } else {
          console.warn(
            `⚠️  Session ${sessionId} references non-existent worktree ${session.worktree_id}, using process.cwd(): ${cwd}`
          );
        }
      } catch (error) {
        console.error(`❌ Failed to fetch worktree ${session.worktree_id}:`, error);
        console.warn(`   Falling back to process.cwd(): ${cwd}`);
      }
    } else {
      console.warn(`⚠️  Session ${sessionId} has no worktree_id, using process.cwd(): ${cwd}`);
    }

    this.logPromptStart(sessionId, prompt, cwd, resume ? session.sdk_session_id : undefined);

    // Validate CWD exists before calling SDK
    try {
      await validateDirectory(cwd, 'Working directory');
      // List directory contents for debugging (helps diagnose bare repo issues)
      try {
        const files = await fs.readdir(cwd);
        const fileCount = files.length;
        const hasGit = files.includes('.git');
        const hasClaude = files.includes('.claude');
        const hasCLAUDEmd = files.includes('CLAUDE.md');
        console.log(
          `✅ Working directory validated: ${cwd} (${fileCount} files/dirs${hasGit ? ', has .git' : ', NO .git!'}${hasClaude ? ', has .claude/' : ''}${hasCLAUDEmd ? ', has CLAUDE.md' : ''})`
        );
        if (fileCount === 0) {
          console.warn(`⚠️  Working directory is EMPTY - worktree may be from bare repo!`);
        } else if (!hasGit) {
          console.warn(`⚠️  Working directory has no .git - not a valid worktree!`);
        }
        if (!hasCLAUDEmd && !hasClaude) {
          console.warn(`⚠️  No CLAUDE.md or .claude/ directory found - SDK may not load properly`);
        }
      } catch (listError) {
        console.warn(`⚠️  Could not list directory contents:`, listError);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Working directory validation failed: ${errorMessage}`);
      throw new Error(
        `${errorMessage}${
          session.worktree_id
            ? ` Session references worktree ${session.worktree_id} which may not be initialized.`
            : ''
        }`
      );
    }

    // Get Claude Code path
    const claudeCodePath = getClaudeCodePath();

    // Buffer to capture stderr for better error messages
    let stderrBuffer = '';

    const options: Record<string, unknown> = {
      cwd,
      systemPrompt: { type: 'preset', preset: 'claude_code' },
      settingSources: ['user', 'project'], // Load user + project permissions, auto-loads CLAUDE.md
      model, // Use configured model or default
      pathToClaudeCodeExecutable: claudeCodePath,
      // Allow access to common directories outside CWD (e.g., /tmp)
      additionalDirectories: ['/tmp', '/var/tmp'],
      // Enable token-level streaming (yields partial messages as tokens arrive)
      includePartialMessages: ClaudePromptService.ENABLE_TOKEN_STREAMING,
      // Enable debug logging to see what's happening
      debug: true,
      // Capture stderr to get actual error messages (not just "exit code 1")
      stderr: (data: string) => {
        stderrBuffer += data;
        // Log in real-time for debugging
        if (data.trim()) {
          console.error(`[Claude stderr] ${data.trim()}`);
        }
      },
    };

    // Add permissionMode if provided
    // For Claude Code sessions, the UI should pass Claude SDK permission modes directly:
    // 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
    // No mapping needed - UI is responsible for showing correct options per agent type
    if (permissionMode) {
      // SECURITY: bypassPermissions cannot be used with root/sudo
      // Claude Code blocks this for security reasons
      const isRoot = process.getuid?.() === 0;

      if (isRoot && permissionMode === 'bypassPermissions') {
        console.warn(
          `⚠️  Running as root - bypassPermissions not allowed. Falling back to 'default' mode.`
        );
        console.warn(`   This is a security restriction from Claude Code SDK.`);
        options.permissionMode = 'default';
      } else {
        options.permissionMode = permissionMode;
      }

      console.log(`🔐 Permission mode: ${options.permissionMode}`);
    }

    // Add session-level allowed tools from our database
    // NOTE: Always add allowedTools (even for bypassPermissions workaround)
    const sessionAllowedTools = session.permission_config?.allowedTools || [];
    if (sessionAllowedTools.length > 0) {
      options.allowedTools = sessionAllowedTools;
    }

    // Add PreToolUse hook if permission service is available and taskId provided
    // This enables Agor's custom permission UI (WebSocket-based) instead of CLI prompts
    // IMPORTANT: Only skip hook for bypassPermissions (which never asks for permissions)
    // Note: effectivePermissionMode is the ACTUAL mode after root fallback (options.permissionMode)
    const effectivePermissionMode = options.permissionMode;
    if (this.permissionService && taskId && effectivePermissionMode !== 'bypassPermissions') {
      options.hooks = {
        PreToolUse: [
          {
            hooks: [this.createPreToolUseHook(sessionId, taskId)],
          },
        ],
      };
      console.log(`🪝 PreToolUse hook added (permission mode: ${effectivePermissionMode})`);
    }

    // Add optional apiKey if provided
    if (this.apiKey || process.env.ANTHROPIC_API_KEY) {
      options.apiKey = this.apiKey || process.env.ANTHROPIC_API_KEY;
    }

    // Add optional resume if session exists
    if (resume && session?.sdk_session_id) {
      // Check if session might be stale (prevents exit code 1 errors)
      const hoursSinceUpdate = session.last_updated
        ? (Date.now() - new Date(session.last_updated).getTime()) / (1000 * 60 * 60)
        : 999;

      const isLikelyStale =
        hoursSinceUpdate > 24 || // Session older than 24 hours
        !session.worktree_id; // No worktree = can't resume properly

      if (isLikelyStale) {
        console.warn(
          `⚠️  Resume session ${session.sdk_session_id.substring(0, 8)} appears stale (${Math.round(hoursSinceUpdate)}h old) - starting fresh`
        );

        // Clear stale session ID to prevent exit code 1
        if (this.sessionsRepo) {
          await this.sessionsRepo.update(sessionId, { sdk_session_id: undefined });
        }
        // Don't set options.resume - start fresh
      } else {
        options.resume = session.sdk_session_id;
        console.log(`   Resuming SDK session: ${session.sdk_session_id.substring(0, 8)}`);
      }
    }

    // Fetch and configure MCP servers for this session (hierarchical scoping)
    // NOTE: Currently disabled for testing session resumption
    // biome-ignore lint/correctness/noConstantCondition: Temporarily disabled for testing
    if (false && this.sessionMCPRepo && this.mcpServerRepo) {
      try {
        const allServers: Array<{
          // biome-ignore lint/suspicious/noExplicitAny: MCPServer type from multiple sources
          server: any;
          source: string;
        }> = [];

        // 1. Global servers (always included)
        console.log('🔌 Fetching MCP servers with hierarchical scoping...');
        const globalServers = await this.mcpServerRepo?.findAll({
          scope: 'global',
          enabled: true,
        });
        console.log(`   📍 Global scope: ${globalServers?.length ?? 0} server(s)`);
        for (const server of globalServers ?? []) {
          allServers.push({ server, source: 'global' });
        }

        // 2. Repo-scoped servers (if session has a worktree)
        // Get repo_id from the worktree
        let repoId: string | undefined;
        // Note: session is guaranteed non-null due to check at line 331-332
        // Using non-null assertions due to TypeScript's control flow analysis limitations with class properties
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const worktreeId = session!.worktree_id;
        if (worktreeId && this.worktreesRepo) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const worktree = await this.worktreesRepo!.findById(worktreeId);
          repoId = worktree?.repo_id;
        }
        if (repoId) {
          const repoServers = await this.mcpServerRepo?.findAll({
            scope: 'repo',
            scopeId: repoId,
            enabled: true,
          });
          console.log(`   📍 Repo scope: ${repoServers?.length ?? 0} server(s)`);
          for (const server of repoServers ?? []) {
            allServers.push({ server, source: 'repo' });
          }
        }

        // 3. Team-scoped servers (if session has a team - future feature)
        // if (session.team_id) {
        //   const teamServers = await this.mcpServerRepo.findAll({
        //     scope: 'team',
        //     scopeId: session.team_id,
        //     enabled: true,
        //   });
        //   console.log(`   📍 Team scope: ${teamServers.length} server(s)`);
        //   for (const server of teamServers) {
        //     allServers.push({ server, source: 'team' });
        //   }
        // }

        // 4. Session-specific servers (from join table)
        if (session && this.sessionMCPRepo) {
          const sessionServers = await this.sessionMCPRepo!.listServers(sessionId, true); // enabledOnly
          console.log(`   📍 Session scope: ${sessionServers!.length} server(s)`);
          for (const server of sessionServers!) {
            allServers.push({ server, source: 'session' });
          }
        } else {
          console.log('   📍 Session scope: 0 server(s)');
        }

        // 5. Deduplicate by server ID (later scopes override earlier ones)
        // This means: session > team > repo > global
        const serverMap = new Map<
          string,
          {
            // biome-ignore lint/suspicious/noExplicitAny: MCPServer type from multiple sources
            server: any;
            source: string;
          }
        >();
        for (const item of allServers) {
          serverMap.set(item.server.mcp_server_id, item);
        }
        const uniqueServers = Array.from(serverMap.values());

        console.log(
          `   ✅ Total: ${uniqueServers.length} unique MCP server(s) after deduplication`
        );

        if (uniqueServers.length > 0) {
          // Convert to SDK format
          const mcpConfig: MCPServersConfig = {};
          const allowedTools: string[] = [];

          for (const { server, source } of uniqueServers) {
            console.log(`   - ${server.name} (${server.transport}) [${source}]`);

            // Build server config
            const serverConfig: {
              transport?: 'stdio' | 'http' | 'sse';
              command?: string;
              args?: string[];
              url?: string;
              env?: Record<string, string>;
            } = {
              transport: server.transport,
            };

            if (server.command) serverConfig.command = server.command;
            if (server.args) serverConfig.args = server.args;
            if (server.url) serverConfig.url = server.url;
            if (server.env) serverConfig.env = server.env;

            mcpConfig[server.name] = serverConfig;

            // Add tools to allowlist
            if (server.tools) {
              for (const tool of server.tools) {
                allowedTools.push(tool.name);
              }
            }
          }

          options.mcpServers = mcpConfig;
          console.log(`   🔧 MCP config being passed to SDK:`, JSON.stringify(mcpConfig, null, 2));
          if (allowedTools.length > 0) {
            options.allowedTools = allowedTools;
            console.log(`   🔧 Allowing ${allowedTools.length} MCP tools`);
          }
        }
      } catch (error) {
        console.warn('⚠️  Failed to fetch MCP servers for session:', error);
        // Continue without MCP servers - non-fatal error
      }
    }

    console.log('📤 Calling query() with:');
    console.log(`   prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    console.log(`   options keys: ${Object.keys(options).join(', ')}`);
    console.log(
      `   Full query call:`,
      JSON.stringify(
        {
          prompt,
          options,
        },
        null,
        2
      )
    );

    let result: AsyncGenerator<unknown>;
    try {
      result = query({
        prompt,
        // biome-ignore lint/suspicious/noExplicitAny: SDK Options type doesn't include all available fields
        options: options as any,
      });
      console.log(`✅ query() returned AsyncGenerator successfully`);
    } catch (syncError) {
      // This is rare - SDK usually returns AsyncGenerator that throws later
      console.error(`❌ CRITICAL: query() threw synchronous error (very unusual):`, syncError);
      console.error(`   Claude Code path: ${claudeCodePath}`);
      console.error(`   CWD: ${cwd}`);
      console.error(
        `   API key set: ${this.apiKey ? 'YES (custom)' : process.env.ANTHROPIC_API_KEY ? 'YES (env)' : 'NO'}`
      );
      console.error(`   Resume session: ${options.resume || 'none (fresh session)'}`);
      throw syncError;
    }

    // Store query object for potential interruption (Claude SDK has native interrupt() method)
    this.activeQueries.set(sessionId, result);

    // Store stderr buffer getter for error reporting
    const getStderr = () => stderrBuffer;

    return { query: result, resolvedModel: model, getStderr };
  }

  /**
   * Log prompt start with context
   * @private
   */
  private logPromptStart(
    sessionId: SessionID,
    _prompt: string,
    _cwd: string,
    agentSessionId?: string
  ) {
    console.log(`🤖 Prompting Claude for session ${sessionId.substring(0, 8)}...`);
    if (agentSessionId) {
      console.log(`   Resuming session: ${agentSessionId}`);
    }
  }

  /**
   * Prompt a session using Claude Agent SDK (streaming version with text chunking)
   *
   * Yields both complete assistant messages AND text chunks as they're generated.
   * This enables real-time typewriter effect in the UI.
   *
   * @param sessionId - Session to prompt
   * @param prompt - User prompt
   * @param taskId - Optional task ID for permission tracking
   * @param permissionMode - Optional permission mode for SDK
   * @param chunkCallback - Optional callback for text chunks (3-10 words)
   * @returns Async generator yielding assistant messages with SDK session ID
   */
  async *promptSessionStreaming(
    sessionId: SessionID,
    prompt: string,
    taskId?: TaskID,
    permissionMode?: PermissionMode,
    _chunkCallback?: (messageId: string, chunk: string) => void
  ): AsyncGenerator<
    | {
        type: 'partial';
        textChunk: string;
        agentSessionId?: string;
        resolvedModel?: string;
      }
    | {
        type: 'complete';
        role?: MessageRole.ASSISTANT | MessageRole.USER;
        content: Array<{
          type: string;
          text?: string;
          id?: string;
          name?: string;
          input?: Record<string, unknown>;
        }>;
        toolUses?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
        agentSessionId?: string;
        resolvedModel?: string;
      }
    | {
        type: 'tool_start';
        toolName: string;
        toolUseId: string;
        agentSessionId?: string;
      }
    | {
        type: 'tool_complete';
        toolUseId: string;
        agentSessionId?: string;
      }
    | {
        type: 'message_start';
        agentSessionId?: string;
      }
    | {
        type: 'message_complete';
        agentSessionId?: string;
      }
  > {
    const {
      query: result,
      resolvedModel,
      getStderr,
    } = await this.setupQuery(sessionId, prompt, taskId, permissionMode, true);

    // Get session for reference (needed to check existing sdk_session_id)
    const session = await this.sessionsRepo?.findById(sessionId);
    const existingSdkSessionId = session?.sdk_session_id;

    // Create message processor for this query
    const processor = new SDKMessageProcessor({
      sessionId,
      existingSdkSessionId,
      enableTokenStreaming: ClaudePromptService.ENABLE_TOKEN_STREAMING,
      idleTimeoutMs: 30000, // 30 seconds
    });

    try {
      for await (const msg of result) {
        // Check if stop was requested before processing message
        if (this.stopRequested.get(sessionId)) {
          console.log(
            `🛑 Stop requested for session ${sessionId.substring(0, 8)}, breaking event loop`
          );
          this.stopRequested.delete(sessionId);
          break;
        }

        // Check for timeout
        if (processor.hasTimedOut()) {
          const state = processor.getState();
          console.warn(
            `⏱️  No assistant messages for ${Math.round((Date.now() - state.lastAssistantMessageTime) / 1000)}s - assuming conversation complete`
          );
          console.warn(
            `   SDK may not have sent 'result' message - breaking loop as safety measure`
          );
          break;
        }

        // Process message through processor
        const events = await processor.process(msg);

        // Handle each event from processor
        for (const event of events) {
          // Handle session ID capture
          if (event.type === 'session_id_captured') {
            if (this.sessionsRepo) {
              await this.sessionsRepo.update(sessionId, {
                sdk_session_id: event.agentSessionId,
              });
              console.log(`💾 Stored Agent SDK session_id in database`);
            }
            continue; // Don't yield this event upstream
          }

          // Handle end event (break loop)
          if (event.type === 'end') {
            console.log(`🏁 Conversation ended: ${event.reason}`);
            break; // Exit for-await loop
          }

          // Handle result event (log but don't yield)
          if (event.type === 'result') {
            // Already logged by processor, nothing more to do
            continue;
          }

          // Yield all other events (partial, complete, tool_start, tool_complete, etc.)
          yield event;
        }

        // If we got an end event, break the outer loop
        if (events.some(e => e.type === 'end')) {
          break;
        }
      }
    } catch (error) {
      // Clean up query reference before re-throwing
      this.activeQueries.delete(sessionId);

      const state = processor.getState();

      // Get actual error message from stderr if available
      const stderrOutput = getStderr();
      const errorContext = stderrOutput ? `\n\nClaude Code stderr output:\n${stderrOutput}` : '';

      // Enhance error with context
      const enhancedError = new Error(
        `Claude SDK error after ${state.messageCount} messages: ${error instanceof Error ? error.message : String(error)}${errorContext}`
      );
      // Preserve original stack
      if (error instanceof Error && error.stack) {
        enhancedError.stack = error.stack;
      }
      console.error(`❌ SDK iteration failed:`, {
        sessionId: sessionId.substring(0, 8),
        messageCount: state.messageCount,
        error: error instanceof Error ? error.message : String(error),
        stderr: stderrOutput || '(no stderr output)',
      });
      throw enhancedError;
    }

    // Clean up query reference
    this.activeQueries.delete(sessionId);
  }

  /**
   * Prompt a session using Claude Agent SDK (non-streaming version)
   *
   * The Agent SDK automatically:
   * - Loads CLAUDE.md from the working directory
   * - Uses Claude Code preset system prompt
   * - Handles streaming via async generators
   *
   * @param sessionId - Session to prompt
   * @param prompt - User prompt
   * @returns Complete assistant response with metadata
   */
  async promptSession(sessionId: SessionID, prompt: string): Promise<PromptResult> {
    const { query: result, getStderr } = await this.setupQuery(
      sessionId,
      prompt,
      undefined,
      undefined,
      false
    );

    // Get session for reference
    const session = await this.sessionsRepo?.findById(sessionId);
    const existingSdkSessionId = session?.sdk_session_id;

    // Create message processor
    const processor = new SDKMessageProcessor({
      sessionId,
      existingSdkSessionId,
      enableTokenStreaming: false, // Non-streaming mode
      idleTimeoutMs: 30000,
    });

    // Collect response messages from async generator
    // IMPORTANT: Keep assistant messages SEPARATE (don't merge into one)
    const assistantMessages: Array<{
      content: Array<{
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }>;
      toolUses?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
    }> = [];

    for await (const msg of result) {
      const events = await processor.process(msg);

      for (const event of events) {
        // Only collect complete assistant messages
        if (event.type === 'complete' && event.role === MessageRole.ASSISTANT) {
          assistantMessages.push({
            content: event.content,
            toolUses: event.toolUses,
          });
        }

        // Break on end event
        if (event.type === 'end') {
          break;
        }
      }
    }

    // Clean up query reference
    this.activeQueries.delete(sessionId);

    // TODO: Extract token counts from Agent SDK result metadata
    return {
      messages: assistantMessages,
      inputTokens: 0, // Agent SDK doesn't expose this yet
      outputTokens: 0,
    };
  }

  /**
   * Stop currently executing task
   *
   * Uses Claude Agent SDK's native interrupt() method to gracefully stop execution.
   * This is the same mechanism used by the Escape key in Claude Code CLI.
   *
   * @param sessionId - Session identifier
   * @returns Success status
   */
  async stopTask(sessionId: SessionID): Promise<{ success: boolean; reason?: string }> {
    console.log(`🛑 Stopping task for session ${sessionId.substring(0, 8)}`);

    const queryObj = this.activeQueries.get(sessionId);

    if (!queryObj) {
      return {
        success: false,
        reason: 'No active task found for this session',
      };
    }

    try {
      // Set stop flag first for immediate loop breaking
      this.stopRequested.set(sessionId, true);

      // Call native interrupt() method on Query object
      // This is exactly what the Escape key uses in Claude Code CLI
      await queryObj.interrupt();

      // Clean up query reference
      this.activeQueries.delete(sessionId);

      console.log(`✅ Stopped Claude execution for session ${sessionId.substring(0, 8)}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to interrupt Claude execution:', error);
      // Clean up stop flag on error
      this.stopRequested.delete(sessionId);
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
