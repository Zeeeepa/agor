/**
 * Claude Prompt Service
 *
 * Handles live execution of prompts against Claude sessions using Claude Agent SDK.
 * Automatically loads CLAUDE.md and uses preset system prompts matching Claude Code CLI.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { MessagesRepository } from '../../db/repositories/messages';
import type { SessionRepository } from '../../db/repositories/sessions';
import type { Message, SessionID } from '../../types';

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
  constructor(
    private messagesRepo: MessagesRepository,
    private sessionsRepo: SessionRepository,
    private apiKey?: string
  ) {
    // No client initialization needed - Agent SDK is stateless
  }

  /**
   * Prompt a session using Claude Agent SDK (streaming version)
   *
   * Yields each assistant message as it arrives from the Agent SDK.
   * This enables progressive UI updates.
   *
   * @param sessionId - Session to prompt
   * @param prompt - User prompt
   * @returns Async generator yielding assistant messages with SDK session ID
   */
  async *promptSessionStreaming(
    sessionId: SessionID,
    prompt: string
  ): AsyncGenerator<{
    content: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    toolUses?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
    agentSessionId?: string;
  }> {
    // Load session to get repo context
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    console.log(`🤖 Prompting Claude for session ${sessionId}...`);
    console.log(`   CWD: ${session.repo.cwd}`);
    console.log(`   Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
    if (session.agent_session_id) {
      console.log(`   📚 Resuming Agent SDK session: ${session.agent_session_id}`);
    }

    // Use Agent SDK with preset configuration
    console.log('📤 Calling Agent SDK query()...');
    const result = query({
      prompt,
      options: {
        cwd: session.repo.cwd,
        systemPrompt: { type: 'preset', preset: 'claude_code' },
        settingSources: ['project'], // Auto-loads CLAUDE.md
        model: 'claude-sonnet-4-5-20250929',
        apiKey: this.apiKey || process.env.ANTHROPIC_API_KEY,
        resume: session.agent_session_id, // Resume conversation if SDK session exists
      },
    });

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

      if (msg.type === 'assistant') {
        const content = msg.message?.content;
        console.log(
          `   [Message ${messageCount}] Content type: ${Array.isArray(content) ? 'array' : typeof content}`
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
          console.log(`   [Message ${messageCount}] Added text block: ${content.length} chars`);
        } else if (Array.isArray(content)) {
          for (const block of content) {
            contentBlocks.push(block);
            if (block.type === 'text') {
              console.log(
                `   [Message ${messageCount}] Added text block: ${block.text?.length || 0} chars`
              );
            } else if (block.type === 'tool_use') {
              console.log(`   [Message ${messageCount}] Added tool_use: ${block.name}`);
            } else {
              console.log(`   [Message ${messageCount}] Added block type: ${block.type}`);
            }
          }
        }

        const toolUses = contentBlocks
          .filter(block => block.type === 'tool_use')
          .map(block => ({
            id: block.id!,
            name: block.name!,
            input: block.input || {},
          }));

        console.log(`   [Message ${messageCount}] Yielding assistant message (progressive update)`);

        // Yield this message immediately for progressive UI update
        yield {
          content: contentBlocks,
          toolUses: toolUses.length > 0 ? toolUses : undefined,
          agentSessionId: capturedAgentSessionId, // Include SDK session_id with first message
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
    // Load session to get repo context
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    console.log(`🤖 Prompting Claude for session ${sessionId}...`);
    console.log(`   CWD: ${session.repo.cwd}`);
    console.log(`   Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);

    // Use Agent SDK with preset configuration
    console.log('📤 Calling Agent SDK query()...');
    const result = query({
      prompt,
      options: {
        cwd: session.repo.cwd,
        systemPrompt: { type: 'preset', preset: 'claude_code' },
        settingSources: ['project'], // Auto-loads CLAUDE.md
        model: 'claude-sonnet-4-5-20250929',
        apiKey: this.apiKey || process.env.ANTHROPIC_API_KEY,
      },
    });

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
        // Extract content from assistant message
        const content = msg.message?.content;
        console.log(
          `   [Message ${messageCount}] Content type: ${Array.isArray(content) ? 'array' : typeof content}`
        );

        const contentBlocks: Array<{
          type: string;
          text?: string;
          id?: string;
          name?: string;
          input?: Record<string, unknown>;
        }> = [];

        if (typeof content === 'string') {
          // String content → convert to text block
          contentBlocks.push({ type: 'text', text: content });
          console.log(`   [Message ${messageCount}] Added text block: ${content.length} chars`);
        } else if (Array.isArray(content)) {
          // Array of blocks → preserve structure
          for (const block of content) {
            contentBlocks.push(block);
            if (block.type === 'text') {
              console.log(
                `   [Message ${messageCount}] Added text block: ${block.text?.length || 0} chars`
              );
            } else if (block.type === 'tool_use') {
              console.log(`   [Message ${messageCount}] Added tool_use: ${block.name}`);
            } else {
              console.log(`   [Message ${messageCount}] Added block type: ${block.type}`);
            }
          }
        }

        // Extract tool uses from this message's content blocks
        const toolUses = contentBlocks
          .filter(block => block.type === 'tool_use')
          .map(block => ({
            id: block.id!,
            name: block.name!,
            input: block.input || {},
          }));

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
