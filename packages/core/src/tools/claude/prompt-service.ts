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
} from '@anthropic-ai/claude-agent-sdk/sdkTypes';
import { generateId } from '../../db/ids';
import type { MessagesRepository } from '../../db/repositories/messages';
import type { SessionMCPServerRepository } from '../../db/repositories/session-mcp-servers';
import type { SessionRepository } from '../../db/repositories/sessions';
import type { PermissionService } from '../../permissions/permission-service';
import type { MCPServersConfig, Message, SessionID, TaskID } from '../../types';
import type { SessionsService, TasksService } from './claude-tool';
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

  constructor(
    private messagesRepo: MessagesRepository,
    private sessionsRepo: SessionRepository,
    private apiKey?: string,
    private sessionMCPRepo?: SessionMCPServerRepository,
    private permissionService?: PermissionService,
    private tasksService?: TasksService,
    private sessionsService?: SessionsService // FeathersJS Sessions service for WebSocket broadcasting
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
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔥🔥🔥 PreToolUse HOOK FIRED! 🔥🔥🔥');
      console.log(`   Tool Name: ${input.tool_name}`);
      console.log(`   Task ID: ${taskId}`);
      console.log(`   Tool Use ID: ${toolUseID}`);
      console.log(`   Tool Input: ${JSON.stringify(input.tool_input, null, 2)}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      // If no permission service or tasks service, allow by default
      if (!this.permissionService || !this.tasksService) {
        console.log(`⚠️  No permission service or tasks service, allowing by default`);
        return {};
      }

      try {
        // Check session-specific permission overrides first
        // IMPORTANT: Always fetch fresh session data to catch recently saved permissions
        const session = await this.sessionsRepo.findById(sessionId);
        console.log(`🔍 Checking permissions for ${input.tool_name}...`);
        console.log(
          `   Session allowedTools: ${JSON.stringify(session?.permission_config?.allowedTools || [])}`
        );

        if (session?.permission_config?.allowedTools?.includes(input.tool_name)) {
          console.log(`🛡️  Permission: ${input.tool_name} auto-allowed by session config`);
          return {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'allow',
              permissionDecisionReason: 'Allowed by session config',
            },
          };
        }
        console.log(`   → Not in allowlist, asking user...`);

        // Generate request ID
        const requestId = generateId();
        const timestamp = new Date().toISOString();

        // Update task status to 'awaiting_permission' via FeathersJS service (emits WebSocket)
        console.log(`📝 Updating task ${taskId} to awaiting_permission status...`);
        try {
          await this.tasksService.patch(taskId, {
            status: 'awaiting_permission',
            permission_request: {
              request_id: requestId,
              tool_name: input.tool_name,
              tool_input: input.tool_input as Record<string, unknown>,
              tool_use_id: toolUseID,
              requested_at: timestamp,
            },
          });
          console.log(`✅ Task updated successfully via FeathersJS (WebSocket event emitted)`);
        } catch (error) {
          console.error(`❌ FAILED to update task:`, error);
          throw error; // Re-throw to see if hook catches it
        }

        console.log(`🛡️  Task ${taskId} now awaiting permission for ${input.tool_name}`);

        // Emit WebSocket event for UI (broadcasts to ALL viewers)
        console.log(`📡 Emitting WebSocket permission request event...`);
        console.log(`   Session ID: ${sessionId}`);
        console.log(`   Request ID: ${requestId}`);
        console.log(`   Tool: ${input.tool_name}`);
        this.permissionService.emitRequest(sessionId, {
          requestId,
          taskId,
          toolName: input.tool_name,
          toolInput: input.tool_input as Record<string, unknown>,
          toolUseID,
          timestamp,
        });
        console.log(`✅ WebSocket event emitted`);

        // Wait for UI decision (Promise pauses SDK execution)
        console.log(`⏳ Waiting for user decision via UI...`);
        console.log(`   Using AbortSignal: ${options.signal ? 'present' : 'missing'}`);
        const decision = await this.permissionService.waitForDecision(
          requestId,
          taskId,
          options.signal
        );
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📨 DECISION RECEIVED FROM UI:');
        console.log(`   decision.allow: ${decision.allow}`);
        console.log(`   decision.remember: ${decision.remember}`);
        console.log(`   decision.scope: ${decision.scope}`);
        console.log(`   decision.reason: ${decision.reason}`);
        console.log(`   decision.decidedBy: ${decision.decidedBy}`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        // Update task with approval info and resume status via FeathersJS service
        // IMPORTANT: Must send full permission_request object, not dot notation
        // Dot notation works in DB but doesn't broadcast properly via WebSocket
        const currentTask = await this.tasksService.get(taskId);
        await this.tasksService.patch(taskId, {
          status: decision.allow ? 'running' : 'failed',
          permission_request: {
            ...currentTask.permission_request,
            approved_by: decision.decidedBy,
            approved_at: new Date().toISOString(),
          },
        });

        console.log(
          `🛡️  Task ${taskId} ${decision.allow ? 'approved' : 'denied'} by user ${decision.decidedBy}`
        );

        // Persist decision if user clicked "Remember"
        console.log(
          `💾 Checking if should persist: remember=${decision.remember}, scope=${decision.scope}`
        );
        if (decision.remember) {
          // RE-FETCH session to get latest data (avoid stale closure)
          const freshSession = await this.sessionsRepo.findById(sessionId);
          if (!freshSession) {
            console.error(`❌ Session ${sessionId} not found, cannot persist permission`);
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
            console.log(`   Current allowed tools: ${JSON.stringify(currentAllowed)}`);

            // IMPORTANT: Use FeathersJS service (if available) for WebSocket broadcasting
            // Fall back to repository if service not available (e.g., in tests)
            const newAllowedTools = [...currentAllowed, input.tool_name];
            const updateData = {
              permission_config: {
                allowedTools: newAllowedTools,
              },
            };

            if (this.sessionsService) {
              console.log(`   📡 Updating via FeathersJS service (will broadcast to WebSocket)`);
              await this.sessionsService.patch(sessionId, updateData);
            } else {
              console.log(
                `   ⚠️  No SessionsService available, updating via repository (no WebSocket broadcast)`
              );
              await this.sessionsRepo.update(sessionId, updateData);
            }
            console.log(`🛡️  ✅ Saved ${input.tool_name} to session ${sessionId} permissions`);

            // Verify it was saved
            const verifySession = await this.sessionsRepo.findById(sessionId);
            console.log(
              `   Verification - allowedTools: ${JSON.stringify(verifySession?.permission_config?.allowedTools || [])}`
            );
          } else if (decision.scope === 'project') {
            // Update project-level permissions in .claude/settings.json
            await this.updateProjectSettings(freshSession.repo.cwd, {
              allowTools: [input.tool_name],
            });
            console.log(`🛡️  Saved ${input.tool_name} to project permissions`);
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
        console.error('❌ PreToolUse hook error:', error);

        try {
          await this.tasksService.patch(taskId, {
            status: 'failed',
            report: {
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            },
          });
          console.log(`❌ Task ${taskId} marked as failed due to hook error`);
        } catch (updateError) {
          console.error(`❌ Failed to update task status to failed:`, updateError);
        }

        // Return deny to SDK so tool doesn't execute
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `Permission hook failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        };
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
  ): Promise<{ query: AsyncGenerator; resolvedModel: string }> {
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Determine model to use (session config or default)
    const modelConfig = session.model_config;
    const model = modelConfig?.model || DEFAULT_CLAUDE_MODEL;

    console.log(`🤖 Model selection:`);
    console.log(`   Mode: ${modelConfig?.mode || 'default (no config)'}`);
    console.log(`   Model: ${model}`);

    this.logPromptStart(
      sessionId,
      prompt,
      session.repo.cwd,
      resume ? session.agent_session_id : undefined
    );

    const options: Record<string, unknown> = {
      cwd: session.repo.cwd,
      systemPrompt: { type: 'preset', preset: 'claude_code' },
      settingSources: ['user', 'project'], // Load user + project permissions, auto-loads CLAUDE.md
      model, // Use configured model or default
      pathToClaudeCodeExecutable: getClaudeCodePath(),
      // Allow access to common directories outside CWD (e.g., /tmp)
      additionalDirectories: ['/tmp', '/var/tmp'],
      // Enable token-level streaming (yields partial messages as tokens arrive)
      includePartialMessages: ClaudePromptService.ENABLE_TOKEN_STREAMING,
    };

    // Add permissionMode if provided
    if (permissionMode) {
      options.permissionMode = permissionMode;
      console.log(`🛡️  Setting permissionMode: ${permissionMode}`);
    }

    // Add session-level allowed tools from our database
    const sessionAllowedTools = session.permission_config?.allowedTools || [];
    if (sessionAllowedTools.length > 0) {
      options.allowedTools = sessionAllowedTools;
      console.log(`🛡️  Passing allowedTools to SDK: ${JSON.stringify(sessionAllowedTools)}`);
      console.log(`   These tools will be auto-allowed without firing the hook`);
    } else {
      console.log(
        `🛡️  No allowedTools configured for this session - all tools will require permission`
      );
    }

    // Add PreToolUse hook if permission service is available and taskId provided
    if (this.permissionService && taskId) {
      console.log(`🛡️  Registering PreToolUse hook for task ${taskId}`);
      options.hooks = {
        PreToolUse: [
          {
            hooks: [this.createPreToolUseHook(sessionId, taskId)],
          },
        ],
      };
    } else {
      console.log(
        `⚠️  PreToolUse hook NOT registered - permissionService: ${!!this.permissionService}, taskId: ${taskId}`
      );
    }

    // Add optional apiKey if provided
    if (this.apiKey || process.env.ANTHROPIC_API_KEY) {
      options.apiKey = this.apiKey || process.env.ANTHROPIC_API_KEY;
    }

    // Add optional resume if session exists
    if (resume && session.agent_session_id) {
      options.resume = session.agent_session_id;
      console.log(`📚 Resuming Agent SDK session: ${session.agent_session_id}`);
    } else {
      console.log(
        `⚠️  NOT resuming - resume: ${resume}, agent_session_id: ${session.agent_session_id}`
      );
    }

    // Fetch and configure MCP servers for this session
    if (this.sessionMCPRepo) {
      try {
        const mcpServers = await this.sessionMCPRepo.listServers(sessionId, true); // enabledOnly
        if (mcpServers.length > 0) {
          console.log(
            `🔌 Found ${mcpServers.length} enabled MCP server(s) for session ${sessionId}`
          );

          // Convert to SDK format
          const mcpConfig: MCPServersConfig = {};
          const allowedTools: string[] = [];

          for (const server of mcpServers) {
            console.log(`   - ${server.name} (${server.transport})`);

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

    const result = query({
      prompt,
      // biome-ignore lint/suspicious/noExplicitAny: SDK Options type doesn't include all available fields
      options: options as any,
    });

    return { query: result, resolvedModel: model };
  }

  /**
   * Log prompt start with context
   * @private
   */
  private logPromptStart(
    sessionId: SessionID,
    prompt: string,
    cwd: string,
    agentSessionId?: string
  ) {
    console.log(`🤖 Prompting Claude for session ${sessionId}...`);
    console.log(`   CWD: ${cwd}`);
    console.log(`   Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
    if (agentSessionId) {
      console.log(`   📚 Resuming Agent SDK session: ${agentSessionId}`);
    }
    console.log('📤 Calling Agent SDK query()...');
  }

  /**
   * Process content from assistant message into content blocks
   * @private
   */
  private processContentBlocks(
    content: unknown,
    messageNum: number
  ): Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }> {
    console.log(
      `   [Message ${messageNum}] Content type: ${Array.isArray(content) ? 'array' : typeof content}`
    );

    const contentBlocks: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }> = [];

    if (typeof content === 'string') {
      contentBlocks.push({ type: 'text', text: content });
      console.log(`   [Message ${messageNum}] Added text block: ${content.length} chars`);
    } else if (Array.isArray(content)) {
      for (const block of content) {
        contentBlocks.push(block);
        if (block.type === 'text') {
          console.log(
            `   [Message ${messageNum}] Added text block: ${block.text?.length || 0} chars`
          );
        } else if (block.type === 'tool_use') {
          console.log(`   [Message ${messageNum}] Added tool_use: ${block.name}`);
        } else {
          console.log(`   [Message ${messageNum}] Added block type: ${block.type}`);
        }
      }
    }

    return contentBlocks;
  }

  /**
   * Extract tool uses from content blocks
   * @private
   */
  private extractToolUses(
    contentBlocks: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>
  ): Array<{ id: string; name: string; input: Record<string, unknown> }> {
    return contentBlocks
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        id: block.id!,
        name: block.name!,
        input: block.input || {},
      }));
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
    chunkCallback?: (messageId: string, chunk: string) => void
  ): AsyncGenerator<{
    type: 'partial' | 'complete';
    textChunk?: string; // For partial streaming events
    content?: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    toolUses?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
    agentSessionId?: string;
    resolvedModel?: string;
  }> {
    const { query: result, resolvedModel } = await this.setupQuery(
      sessionId,
      prompt,
      taskId,
      permissionMode,
      true
    );

    // Collect and yield assistant messages progressively
    console.log('📥 Receiving messages from Agent SDK...');
    let messageCount = 0;
    let capturedAgentSessionId: string | undefined;

    for await (const msg of result) {
      messageCount++;
      console.log(`   [Message ${messageCount}] type: ${msg.type}`);

      // Capture SDK session_id from first message that has it
      if (!capturedAgentSessionId && 'session_id' in msg && msg.session_id) {
        capturedAgentSessionId = msg.session_id;
        console.log(`   🔑 Captured Agent SDK session_id: ${capturedAgentSessionId}`);
      }

      // Handle partial streaming events (token-level streaming)
      if (msg.type === 'stream_event' && ClaudePromptService.ENABLE_TOKEN_STREAMING) {
        // biome-ignore lint/suspicious/noExplicitAny: SDK event structure is complex
        const event = (msg as any).event;

        // Extract text from content_block_delta events
        if (event?.type === 'content_block_delta' && event?.delta?.type === 'text_delta') {
          const textChunk = event.delta.text;
          console.debug(`   📝 [Token stream] ${textChunk.length} chars`);

          // Yield partial chunk immediately (enables real-time streaming)
          yield {
            type: 'partial',
            textChunk,
            agentSessionId: capturedAgentSessionId,
            resolvedModel,
          };
        }
      }
      // Handle complete assistant messages
      else if (msg.type === 'assistant') {
        const contentBlocks = this.processContentBlocks(msg.message?.content, messageCount);
        const toolUses = this.extractToolUses(contentBlocks);

        console.log(`   [Message ${messageCount}] Yielding complete assistant message`);

        // Yield complete message for database storage
        yield {
          type: 'complete',
          content: contentBlocks,
          toolUses: toolUses.length > 0 ? toolUses : undefined,
          agentSessionId: capturedAgentSessionId,
          resolvedModel,
        };
      } else if (msg.type === 'result') {
        console.log(`   [Message ${messageCount}] Final result received`);
      } else {
        console.log(
          `   [Message ${messageCount}] Unknown type:`,
          JSON.stringify(msg, null, 2).substring(0, 500)
        );
      }
    }

    console.log(`✅ Response complete: ${messageCount} total messages`);
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
    const { query: result } = await this.setupQuery(sessionId, prompt, undefined, undefined, false);

    // Collect response messages from async generator
    // IMPORTANT: Keep assistant messages SEPARATE (don't merge into one)
    console.log('📥 Receiving messages from Agent SDK...');
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
    let messageCount = 0;

    for await (const msg of result) {
      messageCount++;
      console.log(`   [Message ${messageCount}] type: ${msg.type}`);

      if (msg.type === 'assistant') {
        const contentBlocks = this.processContentBlocks(msg.message?.content, messageCount);
        const toolUses = this.extractToolUses(contentBlocks);

        // Add as separate assistant message
        assistantMessages.push({
          content: contentBlocks,
          toolUses: toolUses.length > 0 ? toolUses : undefined,
        });

        console.log(
          `   [Message ${messageCount}] Stored as assistant message #${assistantMessages.length}`
        );
      } else if (msg.type === 'result') {
        console.log(`   [Message ${messageCount}] Final result received`);
      } else {
        console.log(
          `   [Message ${messageCount}] Unknown type:`,
          JSON.stringify(msg, null, 2).substring(0, 500)
        );
      }
    }

    console.log(
      `✅ Response complete: ${assistantMessages.length} assistant messages, ${messageCount} total messages`
    );

    // TODO: Extract token counts from Agent SDK result metadata
    return {
      messages: assistantMessages,
      inputTokens: 0, // Agent SDK doesn't expose this yet
      outputTokens: 0,
    };
  }
}
