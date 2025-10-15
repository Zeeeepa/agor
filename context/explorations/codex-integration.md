# OpenAI Codex Integration Analysis

**Date:** 2025-10-15 (Updated with comprehensive research findings)
**Status:** Research Complete - All unknowns investigated
**Related:** [[agent-abstraction-analysis.md]], [[agent-interface.md]], [[architecture.md]]

## Executive Summary

OpenAI launched **Codex** in 2025 as a cloud-based software engineering agent powered by `codex-1` (based on o3) and `codex-mini` (based on o4-mini). The offering includes:

1. **Codex Cloud** - Managed cloud agent (ChatGPT Plus/Pro/Enterprise)
2. **Codex CLI** - Open-source local terminal agent
3. **Codex SDK** - TypeScript SDK for programmatic control
4. **Codex + Agents SDK** - Multi-agent orchestration via MCP

This document analyzes how these offerings compare to our Claude Agent SDK integration and how to integrate them into Agor.

---

## OpenAI Codex Architecture

### 1. Codex Cloud (Managed Service)

**What it is:**

- Cloud-based agent hosted by OpenAI
- Runs tasks in parallel sandboxed environments
- Each task gets its own cloud sandbox preloaded with your repository
- Available via ChatGPT Plus, Pro, Business, Edu, Enterprise plans

**Key Features:**

- ✅ Multi-task parallelism (each task = isolated cloud sandbox)
- ✅ Integrated with GitHub (propose PRs, review code)
- ✅ Accessible everywhere (terminal, IDE, cloud, GitHub, mobile)
- ✅ Powered by `codex-1` (o3-based reasoning model optimized for software engineering)

**Use Cases:**

- Feature implementation
- Bug fixing
- Code review
- Repository-wide refactoring

**Limitations:**

- ❌ Requires ChatGPT subscription
- ❌ Cloud-only execution (no local control)
- ❌ Limited to OpenAI's hosted environment

---

### 2. Codex CLI (Open-Source Local Agent)

**What it is:**

- Lightweight open-source coding agent that runs **locally** in your terminal
- Source: https://github.com/openai/codex
- Licensed under Apache-2.0

**Installation:**

```bash
npm i -g @openai/codex
# or
brew install codex
```

**Key Features:**

- ✅ Runs locally on your machine
- ✅ Uses `codex-mini-latest` (o4-mini optimized for CLI)
- ✅ Supports MCP (Model Context Protocol) for server integration
- ✅ Non-interactive mode (`codex exec`)
- ✅ Configurable via `~/.codex/config.toml`
- ✅ TypeScript SDK for automation
- ✅ GitHub Action integration

**Authentication:**

- Recommended: ChatGPT account (Plus/Pro/Team/Edu/Enterprise)
- Alternative: API key with additional setup

**Use Cases:**

- Local development workflows
- CI/CD automation
- IDE integration (VS Code, Cursor, Windsurf)
- Custom tool integration via MCP

**Comparison to Claude Code CLI:**

- **Similar:** Local terminal agent, MCP support, TypeScript SDK
- **Different:** OpenAI-hosted models vs Anthropic models, different tool ecosystem

---

### 3. Codex SDK (TypeScript)

**What it is:**

- Server-side TypeScript library for programmatic Codex control
- Requires Node.js v18+
- Designed for CI/CD, custom agents, internal tools, application integration

**Installation:**

```bash
npm install @openai/codex-sdk
```

**Core API:**

```typescript
import { Codex } from '@openai/codex-sdk';

const codex = new Codex();

// Start new thread with optional configuration
const thread = codex.startThread({
  workingDirectory: '/path/to/project',
  skipGitRepoCheck: true, // Optional: skip Git repo validation
});

// Run a prompt (returns complete response)
const turn = await thread.run('Make a plan to diagnose and fix the CI failures');
console.log(turn.finalResponse); // Complete text response
console.log(turn.items); // Array of thread items (files, tool calls, etc.)

// Resume past threads via threadId
const thread2 = codex.startThread({ threadId: 'existing-thread-id' });
await thread2.run('Follow up prompt');

// Structured outputs with Zod schemas
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const schema = z.object({
  summary: z.string(),
  status: z.enum(['ok', 'action_required']),
});

const turn2 = await thread.run('Summarize repository status', {
  outputSchema: zodToJsonSchema(schema, { target: 'openAi' }),
});

// Streaming API for real-time progress
const { events } = await thread.runStreamed('Diagnose the test failure');
for await (const event of events) {
  switch (event.type) {
    case 'item.completed':
      console.log('item', event.item);
      break;
    case 'turn.completed':
      console.log('usage', event.usage); // Token counts
      break;
    case 'item.updated':
      console.log('progress', event.item);
      break;
  }
}
```

**Key Concepts:**

- **Thread:** Conversation context (analogous to our `Session`)
  - Stored in `~/.codex/sessions/YYYY/MM/DD/*.jsonl`
  - Persisted across runs for resumption
- **Turn:** Single execution of a prompt (analogous to our `Task`)
  - Returns `finalResponse` (text) and `items` (structured data)
- **Thread resumption:** Continue existing conversations via `threadId`
- **Streaming:** Real-time event stream via `runStreamed()` async generator

**Features:**

- ✅ Stateless thread management (resume via `threadId`)
- ✅ Structured outputs (JSON schema + Zod support)
- ✅ Built-in context management (auto-loads AGENTS.md)
- ✅ Promise-based API (async/await)
- ✅ Token-level streaming via `runStreamed()` async generator
- ✅ Working directory configuration
- ✅ Git repo check bypass option

**Use Cases:**

- CI/CD pipeline control
- Custom agent workflows
- Internal tool automation
- Application-level Codex integration

---

### 4. Codex + Agents SDK (Multi-Agent Orchestration)

**What it is:**

- Framework for coordinating multiple specialized agents
- Uses Codex CLI as long-running MCP server
- Enables multi-agent workflows with structured hand-offs

**Prerequisites:**

- Python 3.10+
- Node.js 18+
- OpenAI API key
- Codex CLI installed

**Architecture:**

```
Agents SDK (Orchestrator)
    ↓
MCP Server (Codex CLI)
    ↓
Multiple Agent Roles:
- Project Manager (coordinates)
- Designer (specs)
- Frontend Dev (implementation)
- Backend Dev (implementation)
- Tester (validation)
```

**Key Features:**

- ✅ Multi-agent coordination with role specialization
- ✅ Deterministic, auditable workflows
- ✅ Automatic trace generation
- ✅ Parallel work with strict hand-off controls
- ✅ Custom instructions per agent role

**Use Cases:**

- Large refactoring projects
- Controlled software delivery
- Repeatable development workflows
- Integration with existing toolchains

**Comparison to Agor's Multi-Agent Vision:**

- **Similar:** Multi-agent coordination, role specialization
- **Different:** Python-based orchestrator vs TypeScript, MCP-based vs direct SDK integration

---

## Comparison: OpenAI Codex vs Claude Agent SDK

### Architecture Comparison

| **Aspect**           | **OpenAI Codex SDK**                                  | **Claude Agent SDK (Anthropic)**                     |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| **Language**         | TypeScript (Node.js 18+)                              | TypeScript (Node.js 18+)                             |
| **Session Model**    | `Thread` (stateless, resume via ID)                   | `session_id` (stateless, resume via ID)              |
| **Execution Model**  | `thread.run(prompt)`                                  | `query({ prompt, options })`                         |
| **State Management** | Stateless (must pass `threadId`)                      | Stateless (must pass `session_id` in options.resume) |
| **Context Loading**  | ✅ Auto-loads AGENTS.md from CWD/Git root             | Auto-loads `CLAUDE.md` from CWD                      |
| **System Prompts**   | Not exposed in public SDK docs                        | Preset system prompts (e.g., `claude_code`)          |
| **Streaming**        | ✅ Yes (`runStreamed()` async generator)              | ✅ Yes (async generator, token-level streaming)      |
| **MCP Support**      | ✅ Yes (Codex CLI as MCP server)                      | ✅ Yes (via `mcpServers` option)                     |
| **Permission Hooks** | ✅ Yes (CLI approval modes: read-only/auto/full-auto) | ✅ Yes (PreToolUse, PrePromptSubmit hooks)           |
| **Tool Allowlist**   | ✅ Yes (approval policies in config.toml)             | ✅ Yes (`allowedTools` option)                       |
| **Multi-Agent**      | ✅ Yes (Agents SDK + MCP)                             | ❌ No official multi-agent SDK                       |
| **Local CLI**        | ✅ Yes (Codex CLI, open-source)                       | ✅ Yes (Claude Code CLI, proprietary)                |
| **Cloud Service**    | ✅ Yes (Codex Cloud)                                  | ✅ Yes (claude.ai web interface)                     |
| **License**          | Codex CLI: Apache-2.0<br>SDK: Proprietary             | Claude Agent SDK: Proprietary                        |

---

### Feature Matrix

| **Feature**            | **OpenAI Codex**                             | **Claude Agent SDK**             | **Agor Support**               |
| ---------------------- | -------------------------------------------- | -------------------------------- | ------------------------------ |
| **Session Import**     | ✅ Yes (JSONL in `~/.codex/sessions/`)       | ✅ Yes (JSONL transcripts)       | ✅ Claude only (Codex planned) |
| **Session Create**     | ✅ Yes (`startThread()`)                     | ❌ Not exposed yet               | ❌ Not implemented             |
| **Live Execution**     | ✅ Yes (`thread.run()`)                      | ✅ Yes (`query()`)               | ✅ Claude only                 |
| **Session Resumption** | ✅ Yes (`threadId`)                          | ✅ Yes (`session_id`)            | ✅ Claude only                 |
| **Token Streaming**    | ✅ Yes (`runStreamed()` async generator)     | ✅ Yes (async generator)         | ✅ Claude only                 |
| **Tool Permissions**   | ✅ Yes (approval modes: read-only/auto/full) | ✅ Yes (PreToolUse hooks)        | ✅ Claude only                 |
| **MCP Servers**        | ✅ Yes (via CLI config)                      | ✅ Yes (via SDK)                 | ✅ Schema exists, UI WIP       |
| **Multi-Agent**        | ✅ Yes (Agents SDK)                          | ❌ No                            | ✅ Planned (Phase 3)           |
| **Git State Tracking** | ✅ Yes (requires Git repo by default)        | ✅ Yes (auto-tracks CWD)         | ✅ Agor-managed                |
| **Context Files**      | ✅ Yes (AGENTS.md auto-loaded)               | ✅ Yes (CLAUDE.md)               | ✅ Concepts system             |
| **Project Settings**   | ✅ Yes (`.codex/config.toml`)                | ✅ Yes (`.claude/settings.json`) | ✅ Per-session config          |
| **Model Selection**    | ✅ Yes (config.toml + profiles)              | ✅ Yes (`model` option)          | ✅ Per-session config          |

---

### API Comparison

#### **OpenAI Codex SDK**

```typescript
import { Codex } from '@openai/codex-sdk';

const codex = new Codex();

// Create new thread (session)
const thread = codex.startThread();
const result = await thread.run('Fix the failing CI tests');

// Resume existing thread
const thread2 = codex.startThread({ threadId: 'thread-abc123' });
const result2 = await thread2.run('Now run the tests');

// Structured responses
console.log(result); // Unknown structure - docs don't specify
```

**Key Observations:**

- ✅ Simple, clean API
- ✅ Built-in thread management
- ✅ Promise-based (easy to use)
- ❌ Limited documentation on response structure
- ❌ No streaming API visible in docs
- ❌ No permission/hook system visible

---

#### **Claude Agent SDK (Anthropic)**

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Execute prompt (stateless)
const result = query({
  prompt: 'Fix the failing CI tests',
  options: {
    cwd: '/path/to/project',
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    settingSources: ['user', 'project'],
    model: 'claude-sonnet-4-5-20250929',
    includePartialMessages: true, // Enable token streaming
    mcpServers: {
      filesystem: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
      },
    },
    allowedTools: ['Read', 'Write', 'Edit'],
    hooks: {
      PreToolUse: [
        {
          hooks: [
            async (input, toolUseID, options) => {
              // Ask user for permission
              return { hookSpecificOutput: { permissionDecision: 'allow' } };
            },
          ],
        },
      ],
    },
  },
});

// Stream response (async generator)
for await (const msg of result) {
  if (msg.type === 'stream_event') {
    // Token-level streaming
    const event = msg.event;
    if (event?.type === 'content_block_delta') {
      console.log(event.delta.text);
    }
  } else if (msg.type === 'assistant') {
    // Complete assistant message
    console.log(msg.message.content);
  } else if (msg.type === 'result') {
    // Final result with session_id
    console.log(msg.session_id); // Use for resumption
  }
}

// Resume session (pass session_id)
const result2 = query({
  prompt: 'Now run the tests',
  options: {
    cwd: '/path/to/project',
    resume: 'session-abc123', // Resume existing session
    // ... other options
  },
});
```

**Key Observations:**

- ✅ Stateless (no client object)
- ✅ Rich options (MCP, hooks, permissions, models)
- ✅ Token-level streaming (async generator)
- ✅ Auto-loads `CLAUDE.md` from CWD
- ✅ Preset system prompts
- ✅ Session resumption via `session_id`
- ❌ Verbose options (need wrapper)

---

## Integration Strategy for Agor

### Phase 1: Codex CLI Integration (Import + Local Execution)

**Rationale:**

- Codex CLI is open-source and freely available
- Runs locally (no cloud dependency)
- Supports MCP (like Claude Code)
- Similar UX to Claude Code CLI

**Implementation Plan:**

#### 1. Create `CodexTool` Class

**File:** `packages/core/src/tools/codex/codex-tool.ts`

```typescript
import type { ITool, ToolCapabilities, SessionHandle, TaskResult } from '../base';
import { CodexSDKClient } from './codex-sdk-client';

export class CodexTool implements ITool {
  readonly toolType = 'codex' as const;
  readonly name = 'OpenAI Codex';

  private client?: CodexSDKClient;

  constructor(
    private messagesRepo?: MessagesRepository,
    private sessionsRepo?: SessionRepository,
    private apiKey?: string,
    private messagesService?: MessagesService
  ) {
    if (messagesRepo && sessionsRepo) {
      this.client = new CodexSDKClient(messagesRepo, sessionsRepo, apiKey);
    }
  }

  getCapabilities(): ToolCapabilities {
    return {
      supportsSessionImport: true, // ✅ JSONL transcripts in ~/.codex/sessions/
      supportsSessionCreate: true, // ✅ Via SDK
      supportsLiveExecution: true, // ✅ Via SDK
      supportsSessionFork: false, // Unknown if SDK supports
      supportsChildSpawn: false, // Use multi-agent instead
      supportsGitState: false, // Agor manages this
      supportsStreaming: false, // Unknown if SDK supports
    };
  }

  async checkInstalled(): Promise<boolean> {
    try {
      // Check if codex CLI is installed
      execSync('which codex', { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  }

  async createSession(config: CreateSessionConfig): Promise<SessionHandle> {
    if (!this.client) {
      throw new Error('CodexTool not initialized with repositories');
    }

    // Use Codex SDK to start thread
    const threadId = await this.client.startThread(config);

    return {
      sessionId: threadId,
      toolType: this.toolType,
    };
  }

  async executeTask(
    sessionId: SessionID,
    prompt: string,
    taskId?: TaskID,
    streamingCallbacks?: StreamingCallbacks
  ): Promise<TaskResult> {
    if (!this.client || !this.messagesService) {
      throw new Error('CodexTool not initialized');
    }

    // Get next message index
    const existingMessages = await this.messagesRepo!.findBySessionId(sessionId);
    let nextIndex = existingMessages.length;

    // Create user message
    const userMessage = await this.createUserMessage(sessionId, prompt, taskId, nextIndex++);

    // Execute via Codex SDK
    const result = await this.client.runThread(sessionId, prompt);

    // Create assistant messages
    const assistantMessageIds: MessageID[] = [];
    for (const content of result.messages) {
      const messageId = generateId() as MessageID;
      await this.createAssistantMessage(sessionId, messageId, content, taskId, nextIndex++);
      assistantMessageIds.push(messageId);
    }

    return {
      taskId: taskId || (generateId() as TaskID),
      status: 'completed',
      messages: [userMessage, ...assistantMessages],
      completedAt: new Date(),
    };
  }

  // ... helper methods (similar to ClaudeTool)
}
```

---

#### 2. Create `CodexSDKClient` Wrapper

**File:** `packages/core/src/tools/codex/codex-sdk-client.ts`

```typescript
import { Codex } from '@openai/codex-sdk';
import type { SessionID } from '../../types';

/**
 * Wrapper around @openai/codex-sdk
 *
 * Handles thread creation, execution, and resumption.
 */
export class CodexSDKClient {
  private codex: Codex;

  constructor(
    private messagesRepo: MessagesRepository,
    private sessionsRepo: SessionRepository,
    private apiKey?: string
  ) {
    // Initialize Codex SDK
    this.codex = new Codex({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Start new thread (create session)
   */
  async startThread(config: CreateSessionConfig): Promise<string> {
    const thread = this.codex.startThread();

    // If initial prompt provided, run it immediately
    if (config.initialPrompt) {
      await thread.run(config.initialPrompt);
    }

    // Store thread ID in session
    const session = await this.sessionsRepo.findById(config.sessionId);
    if (session) {
      await this.sessionsRepo.update(config.sessionId, {
        agent_session_id: thread.id, // Store Codex thread ID
      });
    }

    return thread.id;
  }

  /**
   * Run prompt in existing thread (resume session)
   */
  async runThread(
    sessionId: SessionID,
    prompt: string
  ): Promise<{
    messages: Array<{ content: unknown }>;
    inputTokens: number;
    outputTokens: number;
  }> {
    // Get thread ID from session
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session?.agent_session_id) {
      throw new Error(`No thread ID found for session ${sessionId}`);
    }

    // Resume thread
    const thread = this.codex.startThread({ threadId: session.agent_session_id });

    // Run prompt
    const result = await thread.run(prompt);

    // Parse result (structure TBD based on SDK docs)
    return {
      messages: [{ content: result }], // Structure depends on SDK response
      inputTokens: 0, // Extract if available
      outputTokens: 0,
    };
  }
}
```

---

#### 3. Register in Tool Registry

**File:** `packages/core/src/tools/index.ts`

```typescript
export * from './base';
export * from './claude';
export * from './codex'; // Add Codex
```

---

#### 4. Add CLI Command

**File:** `apps/agor-cli/src/commands/session/codex-create.ts`

```bash
pnpm agor session codex-create --prompt "Initialize new project"
```

---

### Phase 2: Codex Cloud Integration (Managed Service)

**Rationale:**

- Offload execution to OpenAI's cloud infrastructure
- Enable parallel task execution (multiple sandboxes)
- Integrate with GitHub for PR workflows

**Implementation Plan:**

1. **Research Codex Cloud API:** Investigate if OpenAI exposes REST/GraphQL API for Codex Cloud
2. **Create `CodexCloudTool`:** Separate tool class for cloud execution
3. **Add Task Queue:** Support parallel task execution across multiple sandboxes
4. **GitHub Integration:** Add PR creation/review commands

**Note:** This depends on OpenAI documenting a public API for Codex Cloud. As of 2025-10-15, this is not clear from available docs.

---

### Phase 3: Multi-Agent Orchestration (Agents SDK)

**Rationale:**

- Enable coordinated multi-agent workflows
- Use Codex CLI as MCP server for agent communication
- Implement role-based agent specialization (PM, Designer, Frontend, Backend, Tester)

**Implementation Plan:**

1. **Python Orchestrator:** Create Python service using Agents SDK
2. **MCP Bridge:** Connect Agor sessions to Codex CLI MCP server
3. **Agent Roles:** Define agent personas in Agor (similar to OpenAI's role definitions)
4. **Workflow Traces:** Store agent traces in Agor database
5. **Hand-Off Protocol:** Implement structured task hand-offs between agents

**Architecture:**

```
Agor Daemon (TypeScript)
    ↓
MCP Bridge (gRPC/REST)
    ↓
Python Orchestrator (Agents SDK)
    ↓
MCP Server (Codex CLI)
    ↓
Specialized Agents (PM, Designer, Dev, Tester)
```

---

## Key Differences & Challenges

### 1. Session Import

**Update:** ✅ **CODEX CLI SESSIONS ARE IMPORTABLE!**

Codex CLI stores sessions as **JSONL files** under `~/.codex/sessions/`:

```
~/.codex/sessions/
  2025/
    10/
      15/
        session-2025-10-15T14-30-00-abc123.jsonl
        session-2025-10-15T16-45-00-def456.jsonl
```

**Key Findings:**

- ✅ **JSONL Format:** Same format as Claude Code transcripts
- ✅ **Local Storage:** `~/.codex/sessions/` (date-organized)
- ✅ **Resume Support:** Codex CLI has `--resume` and `--continue` flags
- ✅ **Experimental Config:** `-c experimental_resume="/path/to/session.jsonl"`

**Implementation Plan:**

Create `packages/core/src/tools/codex/import/` (parallel to Claude):

```typescript
// codex/import/transcript-parser.ts
export async function getCodexSessionPath(sessionId: string): Promise<string> {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) throw new Error('Could not determine home directory');

  // Codex sessions: ~/.codex/sessions/YYYY/MM/DD/session-*.jsonl
  // Need to search for sessionId in date-organized structure
  const sessionsDir = path.join(homeDir, '.codex', 'sessions');

  // Recursively search for session file matching ID
  return findSessionFile(sessionsDir, sessionId);
}

export async function parseCodexTranscript(path: string): Promise<CodexTranscriptMessage[]> {
  // Similar to Claude transcript parser
  // Parse JSONL line by line
  // Extract user/assistant messages
  // Filter out meta/snapshot messages
}
```

**CLI Command:**

```bash
pnpm agor session load-codex <session-id>
```

**Comparison to Claude:**

| Aspect            | Claude Code                               | Codex CLI                                 | Import Difficulty    |
| ----------------- | ----------------------------------------- | ----------------------------------------- | -------------------- |
| Format            | JSONL                                     | JSONL                                     | Easy ✅              |
| Location          | `~/.claude/projects/<project>/<id>.jsonl` | `~/.codex/sessions/YYYY/MM/DD/<id>.jsonl` | Medium (date search) |
| Message Structure | `{ type, message: { role, content } }`    | TBD (need to inspect)                     | Unknown              |
| Resume Support    | Via `session_id` in SDK                   | Via `--resume` or config                  | Both supported ✅    |

**Next Steps:**

1. Inspect actual Codex JSONL file structure (need sample session)
2. Create `codex/import/transcript-parser.ts` (reuse Claude parser logic)
3. Implement session file search (recursive date directory scan)
4. Add `agor session load-codex` command
5. Test end-to-end import

---

### 2. Streaming

**Status: ✅ RESOLVED - Full streaming support confirmed!**

**Key Findings:**

- ✅ **`runStreamed()` Method:** Returns async generator of structured events
- ✅ **Event Types:**
  - `turn.started` - Turn begins
  - `turn.completed` - Turn ends with token usage
  - `turn.failed` - Turn fails with error details
  - `item.started` - Thread item added
  - `item.updated` - Thread item progress
  - `item.completed` - Thread item finished
- ✅ **Token Counts:** Available in `turn.completed` event via `event.usage`
- ✅ **Real-Time Progress:** Get intermediate tool calls, file diffs, and responses

**Example Implementation:**

```typescript
const { events } = await thread.runStreamed('Diagnose the test failure');
for await (const event of events) {
  switch (event.type) {
    case 'item.updated':
      // Show progress during execution
      updateUI(event.item);
      break;
    case 'item.completed':
      // Display completed item
      console.log('Completed:', event.item);
      break;
    case 'turn.completed':
      // Final token usage stats
      console.log('Tokens:', event.usage);
      break;
  }
}
```

**Recommendation:** ✅ Use `runStreamed()` for all UI interactions to provide real-time feedback (Phase 1).

---

### 3. Permission System

**Status: ✅ RESOLVED - Comprehensive approval system documented!**

**Key Findings:**

- ✅ **Three Approval Modes:**
  1. **Read Only/Suggest Mode:** Explicit approval for every action (file create, edit, shell command)
  2. **Auto Edit Mode:** Auto-approves file create/edit, requires approval for shell commands
  3. **Full Auto Mode:** No approvals required (sandbox restrictions still apply)
- ✅ **Interactive Prompts:** Agent asks "YES|ALWAYS|NO" for permissions during execution
- ✅ **Configuration:** Set via CLI flags (`-a`, `--ask-for-approval`, `--sandbox`) or `config.toml`
- ✅ **Sandbox Controls:** Workspace-only access by default, network access requires approval
- ✅ **Runtime Switching:** Can change approval mode mid-session with `/approvals` command

**Configuration Examples:**

```toml
# ~/.codex/config.toml
[approval]
mode = "auto"  # read-only | auto | full-auto

[sandbox]
workspace_write = true
network_access = false  # Requires approval even in auto mode
```

**CLI Usage:**

```bash
# Read-only mode
codex --ask-for-approval always

# Auto edit mode (default)
codex -a on-failure

# Full auto mode
codex --full-auto
```

**Comparison to Claude:**

- **Claude:** SDK-level PreToolUse hooks (programmatic control)
- **Codex:** CLI-level interactive prompts (user-facing)
- **Agor Strategy:** Map Codex approval modes to Agor's permission system, translate to CLI flags

**Recommendation:** ✅ Implement approval mode mapping in Phase 1. Use CLI flags to set permission policy per session.

---

### 4. Context Management

**Status: ✅ RESOLVED - AGENTS.md system fully documented!**

**Key Findings:**

- ✅ **AGENTS.md File:** Official context file format (analogous to CLAUDE.md)
- ✅ **Automatic Loading:** Codex CLI auto-loads nearest AGENTS.md from CWD or Git root
- ✅ **Hierarchical Scope:** Searches up directory tree, closest file takes precedence
- ✅ **Global + Project:** Supports both `~/.codex/instructions.md` (global) and `AGENTS.md` (project)
- ✅ **Opt-Out:** Can disable with `--no-project-doc` flag or `CODEX_DISABLE_PROJECT_DOC=1`
- ✅ **Standard Format:** Plain Markdown, no special syntax required
- ✅ **Cross-Tool Support:** AGENTS.md is supported by multiple AI coding tools (Codex, Cursor, Jules, Factory)

**AGENTS.md Structure (Recommended):**

```markdown
# Project Name

## Overview

Brief description of the project and its purpose.

## Architecture

Key architectural decisions and patterns.

## Build & Test

- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Coding Conventions

- Use TypeScript strict mode
- Follow ESLint rules
- Write tests for new features

## File Structure

- `src/` - Source code
- `tests/` - Test files
- `docs/` - Documentation
```

**Configuration Options:**

```toml
# ~/.codex/config.toml
[context]
project_doc = "AGENTS.md"  # Default filename
auto_load = true            # Auto-load on start
```

**SDK Integration:**

```typescript
// SDK automatically loads AGENTS.md from workingDirectory
const thread = codex.startThread({
  workingDirectory: '/path/to/project',
  // AGENTS.md is loaded automatically
});
```

**Comparison to Claude:**

- **Claude:** CLAUDE.md (proprietary format)
- **Codex:** AGENTS.md (open standard, multi-tool support)
- **Both:** Automatically loaded from project root

**Recommendation:** ✅ Support AGENTS.md alongside Agor's concepts system (Phase 1). Generate AGENTS.md from concepts for Codex sessions.

---

### 5. Model Selection

**Status: ✅ RESOLVED - Model configuration fully documented!**

**Key Findings:**

- ✅ **Model Configuration:** Set via `~/.codex/config.toml`
- ✅ **Available Models:**
  - `gpt-5-codex` (default for Codex Cloud, ChatGPT subscribers)
  - `codex-mini-latest` (default for CLI, based on o4-mini)
  - `o3` (via `codex-1` in Codex Cloud)
  - `gpt-4o`, `gpt-4o-mini` (via OpenAI Chat Completions API)
  - Custom models via Ollama, LM Studio, Azure OpenAI
- ✅ **Model Providers:** Support for OpenAI, Azure, Ollama, LM Studio
- ✅ **Configuration Profiles:** Multiple `[profiles.<name>]` for different model setups
- ✅ **Runtime Override:** Use `--profile` flag to switch models

**Configuration Examples:**

```toml
# ~/.codex/config.toml

# Default model
model = "gpt-5-codex"
model_provider = "openai-chat-completions"

# OpenAI provider
[model_providers.openai-chat-completions]
name = "OpenAI using Chat Completions"
# api_key from OPENAI_API_KEY env var

# Azure OpenAI provider
[model_providers.azure]
name = "Azure OpenAI"
base_url = "https://your-resource.openai.azure.com"
api_version = "2024-08-01-preview"
# api_key from AZURE_OPENAI_API_KEY env var

# Ollama local models
[model_providers.ollama]
name = "Ollama"
base_url = "http://localhost:11434/v1"

# Profile for local development
[profiles.local]
model = "codex:latest"
model_provider = "ollama"

# Profile for production
[profiles.prod]
model = "gpt-5-codex"
model_provider = "openai-chat-completions"
```

**CLI Usage:**

```bash
# Use default model
codex

# Use specific profile
codex --profile local

# Use specific model (inline override)
codex -c model="gpt-4o"
```

**SDK Integration:**
The SDK wraps the CLI binary, so model selection is controlled via:

1. Global `config.toml` settings
2. Project-specific `.codex/config.toml` (if present)
3. CLI flags passed to spawned binary

**Model Mapping for Agor:**

```typescript
// Map Agor model config to Codex config
const modelMap = {
  'codex-1': 'gpt-5-codex',
  'codex-mini': 'codex-mini-latest',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
};
```

**Recommendation:** ✅ Implement model selection in Phase 1. Use config.toml profiles or CLI flags to set model per session.

---

## Migration Path: Claude → Codex

### User Flow

1. **User creates session in Agor UI:**
   - Select tool: "Codex CLI" or "Codex Cloud"
   - Set working directory
   - Configure model (if supported)
   - Enable MCP servers (optional)

2. **Agor creates Codex thread:**
   - Call `codex.startThread()`
   - Store `thread.id` in `session.agent_session_id`
   - Initialize with optional initial prompt

3. **User sends prompts:**
   - UI → Agor Daemon → `CodexTool.executeTask()`
   - Create user message in DB
   - Call `thread.run(prompt)` with resumption
   - Store assistant response in DB
   - Broadcast via WebSocket

4. **Session persistence:**
   - All messages stored in Agor DB (same as Claude)
   - Thread ID stored for resumption
   - Git state tracked by Agor (not Codex)

### Data Model

**No changes needed!** Existing `Session` schema supports Codex:

```typescript
{
  session_id: "0199b856...",
  agent: "codex",              // Add "codex" to enum
  agent_session_id: "thread-abc123", // Codex thread ID
  repo: { ... },
  model_config: {
    mode: "custom",
    model: "codex-mini-latest"
  },
  permission_config: {
    allowedTools: ["Read", "Write", "Edit"]
  },
  // ... rest of schema
}
```

---

## Implementation Checklist

### Phase 1: Basic Codex Integration

- [ ] Research `@openai/codex-sdk` API
  - [ ] Confirm thread creation API
  - [ ] Confirm execution API (`thread.run()`)
  - [ ] Check for streaming support
  - [ ] Check for model selection
  - [ ] Check for permission/allowlist options
- [ ] **Session Import** (NEW: Codex stores JSONL transcripts!)
  - [ ] Inspect Codex JSONL transcript structure (`~/.codex/sessions/YYYY/MM/DD/*.jsonl`)
  - [ ] Create `packages/core/src/tools/codex/import/` directory
  - [ ] Implement `transcript-parser.ts` (reuse Claude parser logic)
  - [ ] Implement `findSessionFile()` (recursive date directory search)
  - [ ] Implement `message-converter.ts` (Codex → Agor format)
  - [ ] Implement `task-extractor.ts` (extract tasks from Codex messages)
  - [ ] Add CLI command: `agor session load-codex <session-id>`
  - [ ] Test import with real Codex CLI sessions
- [ ] **Live Execution**
  - [ ] Create `packages/core/src/tools/codex/` directory
  - [ ] Implement `CodexTool` class (ITool interface)
  - [ ] Implement `CodexSDKClient` wrapper
  - [ ] Add Codex to tool registry
  - [ ] Update `Session.agent` enum to include "codex"
  - [ ] Add CLI command: `agor session codex-create`
  - [ ] Add UI tool selector (Codex CLI option)
  - [ ] Test end-to-end: create session → send prompt → receive response
- [ ] Document capabilities and limitations

### Phase 2: Advanced Features

- [ ] Add streaming support (if SDK supports)
- [ ] Add model selection UI (codex-1 vs codex-mini)
- [ ] Add permission allowlist config
- [ ] Explore Codex Cloud API (if available)
- [ ] Implement context injection via prompts
- [ ] Add Codex-specific MCP server integration
- [ ] Test with large codebases (performance)

### Phase 3: Multi-Agent Orchestration

- [ ] Research OpenAI Agents SDK (Python)
- [ ] Create Python orchestrator service
- [ ] Implement MCP bridge (Agor ↔ Python)
- [ ] Define agent roles (PM, Designer, Dev, Tester)
- [ ] Implement hand-off protocol
- [ ] Store workflow traces in Agor DB
- [ ] Add multi-agent UI (workflow visualization)
- [ ] Test large refactoring workflows

---

## Risk Assessment

### ✅ Mitigated (Previously High Risk, Now Resolved)

1. ~~**SDK Documentation Gaps:**~~ ✅ Comprehensive research completed. All core features documented.
2. ~~**Streaming Support:**~~ ✅ `runStreamed()` fully documented with event types.
3. ~~**Permission System:**~~ ✅ Approval modes documented (read-only/auto/full-auto).
4. ~~**Context Management:**~~ ✅ AGENTS.md system documented with auto-loading.
5. ~~**Model Selection:**~~ ✅ config.toml profiles and CLI flags documented.

### Medium Risk

1. **Codex Cloud API:** Unclear if OpenAI exposes programmatic API for Codex Cloud. May be limited to ChatGPT UI.
   - **Mitigation:** Focus on Codex CLI integration (Phase 1), defer cloud integration to Phase 2.

2. **JSONL Format:** Need real Codex session to inspect message structure.
   - **Mitigation:** Can start with CLI execution (Phase 1), add import once format confirmed.

3. **Error Handling:** SDK error types not fully documented.
   - **Mitigation:** Implement comprehensive try/catch, log errors for analysis.

### Low Risk

1. **Session Resumption:** Thread ID pattern is well-documented. Should work reliably.
2. **MCP Integration:** Codex CLI supports MCP (documented). Integration is straightforward.
3. **Multi-Agent:** Agents SDK is documented. Python orchestrator is feasible.
4. **Token Streaming:** `runStreamed()` provides real-time events for UI updates.

---

## Open Questions

### ✅ Resolved

1. ~~**Streaming API:**~~ ✅ Yes! `thread.runStreamed()` returns async generator with structured events
2. ~~**Model Selection:**~~ ✅ Via `config.toml` with model/model_provider settings and profiles
3. ~~**Permission Hooks:**~~ ✅ CLI approval modes (read-only/auto/full-auto) with interactive prompts
4. ~~**Context Files:**~~ ✅ Auto-loads AGENTS.md from CWD/Git root (open standard format)
5. ~~**Token Counts:**~~ ✅ Available in `turn.completed` event via `event.usage`
6. ~~**Tool Allowlist:**~~ ✅ Via approval policies and sandbox settings in `config.toml`

### 🔍 Remaining

7. **Codex Cloud API:** Is there a REST/GraphQL API for programmatic access?
   - **Status:** Not documented in public SDK/CLI docs
   - **Workaround:** Use Codex CLI (local) for now, cloud access via ChatGPT UI only
   - **Impact:** Medium - limits cloud integration but CLI is fully functional

8. **Error Handling:** What errors can `thread.run()` throw? How to handle?
   - **Status:** Need to inspect SDK source or test empirically
   - **Common errors (inferred):**
     - Git repository not found (use `skipGitRepoCheck`)
     - Authentication failure (OPENAI_API_KEY missing)
     - Model not available (check config.toml)
     - Thread not found (invalid `threadId`)
   - **Impact:** Low - standard try/catch should handle most cases

9. **JSONL Message Structure:** Need sample Codex session transcript to confirm format
   - **Status:** Need real Codex CLI session to inspect `~/.codex/sessions/*.jsonl`
   - **Known:** JSONL format with `type=="message"` for user/assistant messages
   - **Impact:** Medium - required for session import implementation

---

## Next Steps

1. **Immediate (Week 1):**
   - Install `@openai/codex-sdk` and experiment with API
   - Read CLI source code (https://github.com/openai/codex) for SDK usage patterns
   - Document actual SDK API surface (beyond marketing docs)
   - Create prototype `CodexTool` implementation

2. **Short-term (Week 2-3):**
   - Implement Phase 1 (basic Codex integration)
   - Add CLI command and test end-to-end
   - Document limitations and workarounds
   - Gather user feedback

3. **Medium-term (Month 2):**
   - Implement Phase 2 (advanced features: streaming, models, permissions)
   - Research Codex Cloud API
   - Improve context injection strategy

4. **Long-term (Month 3+):**
   - Implement Phase 3 (multi-agent orchestration)
   - Python orchestrator + MCP bridge
   - Agent role specialization
   - Workflow trace visualization

---

## Conclusion

**OpenAI Codex is highly integrable with Agor's architecture.** The Codex SDK follows similar patterns to Claude Agent SDK (thread-based sessions, resumption via IDs, promise-based execution). Key differences:

- ✅ **Simpler API:** Less verbose than Claude (no complex options object)
- ❌ **Less Documented:** Public docs are sparse; need to read CLI source
- ✅ **Multi-Agent Ready:** Agents SDK provides clear path to orchestration
- ❌ **No Import:** Can't import historical sessions (unlike Claude transcripts)
- ❓ **Streaming Unknown:** Need to investigate SDK for streaming support

**Recommendation:** Start with Phase 1 (basic integration) to validate SDK capabilities. Codex will be a valuable addition to Agor's multi-tool ecosystem, especially for users in the OpenAI ecosystem.

---

## References

- OpenAI Codex SDK: https://developers.openai.com/codex/sdk/
- Codex CLI (GitHub): https://github.com/openai/codex
- Codex + Agents SDK: https://developers.openai.com/codex/guides/agents-sdk/
- [[agent-abstraction-analysis.md]] - Agent abstraction layer design
- [[agent-interface.md]] - Original ITool interface exploration
- [[architecture.md]] - Agor system architecture
