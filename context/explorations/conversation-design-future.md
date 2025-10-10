# Conversation Design for Agor

**Status:** Exploration
**Created:** 2025-01-07
**Goal:** Design rich, extensible conversation UI that works across all agentic coding tools

---

## Vision: Beyond Terminal Capabilities

**Core Thesis:** Agor can do MUCH better than any terminal could ever do.

Terminals are fundamentally constrained:

- Linear text streams
- No rich interactivity (can't collapse/expand dynamically)
- No visual hierarchy beyond ASCII art
- No real-time summarization or enrichment

**Agor's Opportunity:** Leverage modern UI/UX (Ant Design, Ant Design X) to create a **new visual grammar** for understanding AI coding sessions.

### Design Principles

1. **Rich Components All The Way Down**
   - Every piece of data gets a purpose-built, interactive component
   - Tool uses → collapsible blocks with syntax highlighting
   - Task sequences → visual timelines with metadata chips
   - Large outputs → smart truncation with expand/search

2. **Progressive Disclosure**
   - Default: High-level summary (what happened)
   - One click: Intermediate detail (key decisions, tool uses)
   - Two clicks: Full depth (complete logs, inputs, outputs)

3. **Intelligent Summarization**
   - Multiple tool uses in sequence → Tool Block with counts
   - Long conversations → Task summaries with key moments
   - Sessions → Visual genealogy trees showing decision points

4. **Context-Aware Rendering**
   - File operations → syntax-highlighted diffs
   - Git commands → branch/commit visualizations
   - Test runs → pass/fail matrices
   - Search results → match highlighting

**Goal:** Set the new standard for visualizing agentic coding sessions. Terminals show text. Agor shows understanding.

---

## Problem Statement

Design a conversation view that:

1. **Displays rich agentic coding conversations** with tasks, messages, tool uses, thinking, and metadata
2. **Works across tools** (Claude Code, Cursor, Aider, Codex, etc.)
3. **Handles scale** (thousands of messages, large outputs)
4. **Enables exploration** (collapse/expand, summarization, search)
5. **Feels native** to each tool while maintaining Agor's unified interface

---

## The Challenge

Current state: SessionDrawer shows conversation (flat list of bubbles) + separate task list below.

**Key insight:** Tasks ARE the conversation structure. Don't separate them—weave tasks into the conversation as collapsible sections.

---

## Universal Message Schema (Based on Claude Code)

### Design Principles for Schema

1. **Claude Code as Foundation**: Use Claude's Anthropic API message format as the universal baseline
2. **Content Blocks**: Support structured multi-modal content (text, tool_use, tool_result, images)
3. **Tool Traceability**: Every tool invocation has an ID linking request → result
4. **Extensibility**: Metadata object allows tool-specific fields without breaking core schema
5. **Backward Compatible**: Must work with existing stored Claude Code sessions

### Core Message Structure

```typescript
/**
 * Universal message format based on Claude Code (Anthropic Messages API)
 * This schema MUST be followed by all agent adapters.
 */
interface Message {
  // ============ REQUIRED FIELDS ============

  /** Agor-assigned unique ID (UUIDv7) */
  message_id: MessageID;

  /** Session this message belongs to */
  session_id: SessionID;

  /** Message role (user, assistant, or system) */
  role: 'user' | 'assistant' | 'system';

  /** Message type - differentiates conversation vs meta messages */
  type: 'user' | 'assistant' | 'system' | 'file-history-snapshot';

  /** Chronological index in conversation (0-based) */
  index: number;

  /** ISO 8601 timestamp when message was created */
  timestamp: string;

  /**
   * Message content - can be:
   * - string: Simple text message
   * - ContentBlock[]: Structured multi-modal content (Claude format)
   */
  content: string | ContentBlock[];

  /** Content preview for list views (first 200 chars) */
  content_preview: string;

  // ============ OPTIONAL FIELDS ============

  /** Task this message belongs to (assigned during task extraction) */
  task_id?: TaskID;

  /** Tool uses in this message (for assistant messages with tool calls) */
  tool_uses?: ToolUse[];

  /** Agent-specific metadata (extensible) */
  metadata?: MessageMetadata;
}
```

### Content Blocks (Claude Format)

```typescript
/**
 * Content block types following Anthropic's format
 * Ref: https://docs.anthropic.com/en/api/messages
 */
type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

interface TextBlock {
  type: 'text';
  text: string;
}

interface ImageBlock {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string; // base64 encoded or URL
  };
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string; // Unique tool call ID (e.g., toolu_01Giux...)
  name: string; // Tool name (Read, Edit, Bash, etc.)
  input: Record<string, unknown>; // Tool-specific parameters
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string; // Links back to ToolUseBlock.id
  content: string | ContentBlock[]; // Tool output (can be nested)
  is_error?: boolean; // True if tool execution failed
}
```

### Tool Use (Extracted for Convenience)

```typescript
/**
 * Tool use extracted from assistant messages
 * Stored separately for quick querying and UI rendering
 */
interface ToolUse {
  /** Tool call ID (matches ToolUseBlock.id) */
  id: string;

  /** Tool name (Read, Edit, Bash, Write, Grep, etc.) */
  name: string;

  /** Tool input parameters (varies by tool) */
  input: Record<string, unknown>;

  /** Tool output (optional - may be in separate tool_result message) */
  output?: string | ContentBlock[];

  /** Tool execution status */
  status?: 'pending' | 'running' | 'success' | 'error';

  /** Error message if tool failed */
  error?: string;
}
```

### Message Metadata (Extensible)

```typescript
/**
 * Metadata for agent-specific and tool-specific information
 * This is the extensibility point - add fields without breaking core schema
 */
interface MessageMetadata {
  // ============ CLAUDE CODE FIELDS ============

  /** Original message ID from agent system */
  original_id?: string;

  /** Parent message ID in agent's conversation tree */
  parent_id?: string;

  /** Model used for generation (e.g., claude-sonnet-4-5-20250929) */
  model?: string;

  /** Token usage for this message */
  tokens?: {
    input: number;
    output: number;
  };

  /** Whether this is a meta/synthetic message (not part of main conversation) */
  is_meta?: boolean;

  // ============ EXTENDED FIELDS (Tool-Specific) ============

  /** AI thinking/reasoning (internal monologue before acting) */
  thinking?: string;

  /** File references mentioned in message */
  file_references?: FileReference[];

  /** Stop reason (stop_sequence, end_turn, max_tokens, tool_use) */
  stop_reason?: string;

  /** Message generation metrics */
  metrics?: {
    latency_ms?: number;
    tokens_per_second?: number;
  };

  // ============ CURSOR-SPECIFIC ============

  /** Inline diff data */
  cursor_diff?: {
    file: string;
    changes: Array<{
      type: 'insert' | 'delete' | 'replace';
      line: number;
      content: string;
    }>;
  };

  /** LSP-based context */
  lsp_context?: {
    symbols: string[];
    references: string[];
  };

  // ============ AIDER-SPECIFIC ============

  /** Git commit created by this message */
  git_commit?: {
    sha: string;
    message: string;
    files_changed: string[];
  };

  /** Diff preview */
  diff_preview?: string;

  // ============ EXTENSIBILITY ============

  /** Any other tool-specific fields */
  [key: string]: unknown;
}

interface FileReference {
  path: string;
  line?: number;
  end_line?: number;
  language?: string;
}
```

### Task Structure

```typescript
interface Task {
  task_id: TaskID;
  session_id: SessionID;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description: string; // User prompt summary (120 chars)
  full_prompt: string; // Complete user request
  message_range: {
    start_index: number; // First message in task
    end_index: number; // Last message in task
    start_timestamp: string;
    end_timestamp: string;
  };
  tool_use_count: number;
  git_state?: {
    sha_at_start: string;
    sha_at_end?: string;
    commit_message?: string;
  };
}
```

---

## Agent Adapter Interface

### Enforcing Universal Schema

All agent adapters (Claude Code, Cursor, Aider, etc.) MUST implement this interface to ensure consistent message format:

```typescript
/**
 * Agent Adapter Interface
 *
 * Responsible for:
 * 1. Loading sessions from agent-specific storage
 * 2. Converting agent messages → Agor universal format
 * 3. Streaming real-time messages during active sessions
 */
interface AgentAdapter {
  /** Agent identifier (claude-code, cursor, aider, etc.) */
  readonly name: string;

  /**
   * Load a session from agent storage and convert to Agor format
   * @param sessionIdentifier - Agent-specific session ID or path
   * @returns Session metadata + messages in universal format
   */
  loadSession(sessionIdentifier: string): Promise<{
    session: Omit<Session, 'session_id'>;
    messages: Message[];
  }>;

  /**
   * Stream messages from an active session (real-time)
   * @param sessionIdentifier - Agent-specific session ID
   * @yields Messages as they arrive, in universal format
   */
  streamSession?(sessionIdentifier: string): AsyncGenerator<Message>;

  /**
   * Send a message to the agent (for active orchestration)
   * @param sessionId - Agor session ID
   * @param prompt - User prompt
   * @returns Stream of assistant response messages
   */
  sendMessage?(sessionId: SessionID, prompt: string): AsyncGenerator<Message>;
}
```

### Example: Claude Code Adapter

```typescript
class ClaudeCodeAdapter implements AgentAdapter {
  readonly name = 'claude-code';

  async loadSession(transcriptPath: string) {
    // Read ~/.claude/projects/<project>/sessions/<id>.jsonl
    const lines = await readTranscript(transcriptPath);

    const messages: Message[] = [];
    let index = 0;

    for (const line of lines) {
      const raw = JSON.parse(line);

      // Skip meta messages (command XML, tool results, snapshots)
      if (this.isMetaMessage(raw)) continue;

      // Convert to universal format
      const message: Message = {
        message_id: uuidv7() as MessageID,
        session_id: sessionId,
        role: raw.role,
        type: this.detectType(raw),
        index: index++,
        timestamp: raw.timestamp,
        content: this.convertContent(raw.content),
        content_preview: this.generatePreview(raw.content),
        tool_uses: this.extractToolUses(raw.content),
        metadata: {
          original_id: raw.id,
          parent_id: raw.parentId,
          model: raw.model,
          tokens: raw.tokens,
        },
      };

      messages.push(message);
    }

    return { session, messages };
  }

  private convertContent(raw: unknown): string | ContentBlock[] {
    // If content is array of blocks → keep structure
    if (Array.isArray(raw)) {
      return raw.map(block => {
        if (block.type === 'tool_use') {
          return {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input,
          } as ToolUseBlock;
        }
        if (block.type === 'tool_result') {
          return {
            type: 'tool_result',
            tool_use_id: block.tool_use_id,
            content: block.content,
            is_error: block.is_error,
          } as ToolResultBlock;
        }
        if (block.type === 'text') {
          return {
            type: 'text',
            text: block.text,
          } as TextBlock;
        }
        // Pass through unknown blocks
        return block;
      });
    }

    // Simple string content
    return typeof raw === 'string' ? raw : JSON.stringify(raw);
  }

  private extractToolUses(content: unknown): ToolUse[] | undefined {
    if (!Array.isArray(content)) return undefined;

    const toolUses = content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));

    return toolUses.length > 0 ? toolUses : undefined;
  }
}
```

### Example: Cursor Adapter (Hypothetical)

```typescript
class CursorAdapter implements AgentAdapter {
  readonly name = 'cursor';

  async loadSession(sessionId: string) {
    // Read from Cursor's storage (hypothetical format)
    const cursorSession = await readCursorSession(sessionId);

    const messages: Message[] = cursorSession.messages.map((msg, index) => ({
      message_id: uuidv7() as MessageID,
      session_id: sessionId,
      role: msg.role,
      type: msg.role, // Cursor uses same values
      index,
      timestamp: msg.timestamp,
      content: msg.content,
      content_preview: msg.content.substring(0, 200),
      metadata: {
        original_id: msg.id,
        model: msg.model,
        // Cursor-specific: inline diff metadata
        cursor_diff: msg.diff
          ? {
              file: msg.diff.file,
              changes: msg.diff.changes,
            }
          : undefined,
        lsp_context: msg.context
          ? {
              symbols: msg.context.symbols,
              references: msg.context.references,
            }
          : undefined,
      },
    }));

    return { session, messages };
  }
}
```

### Validation

```typescript
/**
 * Validate message conforms to universal schema
 * Called by all adapters before returning messages
 */
function validateMessage(message: Message): void {
  // Required fields
  assert(message.message_id, 'message_id required');
  assert(message.session_id, 'session_id required');
  assert(['user', 'assistant', 'system'].includes(message.role), 'invalid role');
  assert(typeof message.index === 'number', 'index must be number');
  assert(message.timestamp, 'timestamp required');
  assert(message.content !== undefined, 'content required');

  // Content validation
  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      assert(block.type, 'content block must have type');

      if (block.type === 'tool_use') {
        assert(block.id, 'tool_use must have id');
        assert(block.name, 'tool_use must have name');
        assert(block.input, 'tool_use must have input');
      }

      if (block.type === 'tool_result') {
        assert(block.tool_use_id, 'tool_result must have tool_use_id');
      }
    }
  }

  // Tool uses must match content blocks
  if (message.tool_uses) {
    const toolUseBlocks = Array.isArray(message.content)
      ? message.content.filter(b => b.type === 'tool_use')
      : [];

    assert(
      message.tool_uses.length === toolUseBlocks.length,
      'tool_uses count must match tool_use blocks'
    );
  }
}
```

---

## What Ant Design X Offers

Based on `@ant-design/x` package inspection:

### Core Components

- **Bubble / Bubble.List** - Message bubbles with role-based styling
- **ThoughtChain** - Display AI thinking/reasoning steps
- **Actions** - Interactive action buttons
- **Attachments** - File attachment display
- **Sender** - Message input (not needed in read-only view)
- **Conversations** - Conversation list sidebar
- **Prompts** - Quick prompt suggestions
- **Suggestion** - Suggestion chips
- **Welcome** - Welcome screen

### Hooks & Utilities

- **useXChat** - Chat state management
- **useXAgent** - Agent integration
- **XStream / XRequest** - API utilities

---

## Universal Patterns Across Agentic Tools

Analyzing Claude Code, Cursor, Aider, Codex, Copilot Workspace:

### Common Elements

1. **User Prompt** - What the user asked for
2. **AI Planning/Thinking** - Internal reasoning (sometimes hidden)
3. **Tool Invocations** - File edits, bash commands, searches, reads
4. **Tool Outputs** - Results from tools
5. **AI Response** - Summary, explanation, next steps
6. **File References** - Links to files with line numbers
7. **Code Blocks** - Syntax-highlighted code
8. **Error States** - When something fails
9. **State Transitions** - Task pending → running → done

### Tool-Specific Variations

- **Claude Code:** Explicit tool uses with JSON, thinking in system messages
- **Cursor:** Inline diffs, LSP integration, apply/reject buttons
- **Aider:** Git-centric, shows diffs, commit messages
- **Copilot Workspace:** Planning → editing → verification phases

**Agor Strategy:** Design for universal patterns, allow tool-specific renderers via plugins.

---

## Design Principles

1. **Task-Centric Hierarchy**
   - Task = collapsible section
   - Messages = chronological stream within task
   - Default: Show latest task expanded, older tasks collapsed

2. **Progressive Disclosure**
   - Collapsed: Task summary, status, metadata (1 line)
   - Expanded: Full conversation within task
   - Drill-down: Click message/tool to see details

3. **Scannable at a Glance**
   - Task headers with status indicators
   - Message type icons (👤 user, 🤖 AI, 🔧 tool)
   - Visual hierarchy (size, color, spacing)

4. **Handle Large Content**
   - Truncate long outputs with "Show more"
   - Virtual scrolling for 1000+ messages
   - Lazy-load tool outputs on expand

5. **Universal but Extensible**
   - Core message types work everywhere
   - Plugin system for tool-specific renderers
   - Fallback to generic display

---

## Proposed Structure

### Visual Hierarchy

```
┌─ SessionDrawer ─────────────────────────────────────────┐
│                                                           │
│  Session: "Build authentication system"                  │
│  📍 feature/auth @ b3e4d12 | 🤖 Claude Code | ⏱️ 2h 15m │
│                                                           │
│  ┌─ Task 1: Design JWT flow ────────────────────────┐   │
│  │ ✓ Completed | 💬 12 messages | 🔧 8 tools | 5m   │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Task 2: Implement endpoints ─────────────────────┐   │
│  │ ⚡ In Progress | 💬 24 messages | 🔧 15 tools      │ ▼ │
│  │                                                     │   │
│  │  👤 USER (10:23 AM)                                │   │
│  │  "Add POST /auth/login endpoint with JWT"         │   │
│  │                                                     │   │
│  │  🤖 ASSISTANT (10:23 AM)                           │   │
│  │  💭 Thinking: Need to create auth routes...       │   │
│  │                                                     │   │
│  │  🔧 TOOL: Edit                                     │   │
│  │  📄 src/routes/auth.ts:15-32                       │   │
│  │  [Show diff ▼]                                     │   │
│  │                                                     │   │
│  │  🔧 TOOL: Bash                                     │   │
│  │  $ npm install jsonwebtoken bcrypt                 │   │
│  │  [Show output ▼]                                   │   │
│  │                                                     │   │
│  │  🤖 ASSISTANT (10:24 AM)                           │   │
│  │  "Created login endpoint with JWT signing.        │   │
│  │   Next: Add password hashing."                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Task 3: Add refresh token logic ─────────────────┐   │
│  │ ⏸️ Pending | 💬 0 messages                         │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. TaskSection (Collapsible Container)

**Collapsed State:**

```tsx
<TaskHeader>
  <StatusIcon status="completed" />
  <TaskTitle>Design JWT flow</TaskTitle>
  <TaskMeta>
    <Badge>💬 12 messages</Badge>
    <Badge>🔧 8 tools</Badge>
    <Duration>5m</Duration>
  </TaskMeta>
  <ExpandIcon />
</TaskHeader>
```

**Expanded State:**

```tsx
<TaskSection expanded>
  <TaskHeader />
  <MessageList>
    {messages.map(msg => (
      <MessageBubble key={msg.id} message={msg} />
    ))}
  </MessageList>
</TaskSection>
```

### 2. MessageBubble (Message Renderer)

**User Message:**

```tsx
<Bubble role="user" timestamp="10:23 AM">
  <MarkdownContent>{message.content}</MarkdownContent>
</Bubble>
```

**Assistant Message with Thinking:**

```tsx
<Bubble role="assistant" timestamp="10:23 AM">
  {message.metadata?.thinking && <ThoughtChain items={[{ content: thinking }]} collapsible />}
  <MarkdownContent>{message.content}</MarkdownContent>
</Bubble>
```

**Tool Message:**

```tsx
<ToolBubble tool={toolUse.tool} status={toolUse.status}>
  <ToolHeader>
    <ToolIcon name={toolUse.tool} />
    <ToolName>{toolUse.tool}</ToolName>
  </ToolHeader>
  <ToolInput collapsible>{renderToolInput(toolUse.input)}</ToolInput>
  <ToolOutput collapsible maxHeight={300}>
    {renderToolOutput(toolUse.output)}
  </ToolOutput>
</ToolBubble>
```

### 3. ToolRenderer (Pluggable)

**Generic Renderer (Fallback):**

```tsx
<CodeBlock language="json">{JSON.stringify(tool.input, null, 2)}</CodeBlock>
```

**Edit Tool Renderer:**

```tsx
<FileDiff
  file={input.file_path}
  oldString={input.old_string}
  newString={input.new_string}
  language={detectLanguage(input.file_path)}
/>
```

**Bash Tool Renderer:**

```tsx
<Terminal>
  <Command>$ {input.command}</Command>
  {output && <Output>{output}</Output>}
</Terminal>
```

**Read Tool Renderer:**

```tsx
<FilePreview
  file={input.file_path}
  lines={output}
  highlightLines={input.offset ? [input.offset, input.offset + input.limit] : undefined}
/>
```

---

## Interaction Patterns

### Expand/Collapse

- **Click task header** → Toggle entire task
- **Click "Show more"** → Expand truncated content inline
- **Click tool** → Expand tool details (input/output)
- **Default state:** Latest task expanded, older tasks collapsed

### Summarization

**Collapsed Task Summary:**

- Task description (from `task.description`)
- Status + metadata badges
- NO message content (until expanded)

**Collapsed Tool Summary:**

- Tool icon + name
- File path (for Edit/Read/Write)
- Status indicator
- "Show details ▼" button

### File References

```tsx
<FileReference
  file="src/routes/auth.ts"
  line={15}
  onClick={() => openInEditor('src/routes/auth.ts', 15)}
>
  src/routes/auth.ts:15
</FileReference>
```

### Large Content Handling

- **Code blocks >20 lines:** Truncate with "Show all N lines ▼"
- **Tool outputs >500 chars:** Truncate with "Show full output ▼"
- **Virtual scrolling:** When task has >100 messages
- **Lazy rendering:** Don't render collapsed tasks until expanded

---

## The Tool Block: Summarizing Sequential Tool Uses

### Problem

Agents often execute bursts of tool calls:

- Read 5 files to understand context
- Edit 10 files to refactor
- Run tests, see failures, edit more files
- Search codebase for patterns

In a terminal, this is a wall of text. In Agor, we can do **much better**.

### Solution: Tool Block Component

When 3+ tool uses appear sequentially (no text messages between them), collapse them into a **Tool Block**.

#### Collapsed State: Visual Summary

```tsx
┌─ Tool Block ─────────────────────────────────────────┐
│  🔧 12 tools executed                                 │
│                                                        │
│  📖 Read × 5    ✏️ Edit × 4    🔍 Grep × 2    ⚙️ Bash × 1   │
│                                                        │
│  📁 Modified files (4):                               │
│  • src/auth/jwt.ts                                    │
│  • src/auth/refresh.ts                                │
│  • src/middleware/auth.ts                             │
│  • tests/auth.test.ts                                 │
│                                                        │
│  [Show all tool details ▼]                            │
└────────────────────────────────────────────────────────┘
```

**What's shown:**

- **Total tool count** with grouped counts by tool type
- **Visual tags** with tool icons and × counts (Read × 5, Edit × 4)
- **Smart summaries**:
  - For file operations: Unique files affected
  - For searches: Number of matches found
  - For bash: Exit codes (✓ success, ✗ errors)
  - For tests: Pass/fail counts
- **Expand button** to see full details

#### Expanded State: Full Tool Details

```tsx
┌─ Tool Block (expanded) ──────────────────────────────┐
│  🔧 12 tools executed                                 │
│                                                        │
│  📖 Read × 5    ✏️ Edit × 4    🔍 Grep × 2    ⚙️ Bash × 1   │
│                                                        │
│  ┌─ Read: src/auth/jwt.ts ───────────────────────┐  │
│  │  ✓ Success | 142 lines                         │  │
│  │  [View output ▼]                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Read: src/auth/refresh.ts ────────────────────┐  │
│  │  ✓ Success | 89 lines                           │  │
│  │  [View output ▼]                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Edit: src/auth/jwt.ts ─────────────────────────┐ │
│  │  ✓ Success                                       │ │
│  │  - export function verifyToken(token: string)   │ │
│  │  + export async function verifyToken(token)     │ │
│  │  [View full diff ▼]                             │ │
│  └────────────────────────────────────────────────┘ │
│                                                        │
│  ... (8 more tools)                                   │
│                                                        │
│  [Collapse ▲]                                         │
└────────────────────────────────────────────────────────┘
```

**Expanded features:**

- Each tool gets its own collapsible section
- Tool-specific rendering (diffs for Edit, syntax highlighting for Read)
- Individual expand/collapse for each tool's output
- Virtual scrolling for long lists

### Advanced Visualizations

**File Impact Graph** (when many edits):

```tsx
┌─ Files Modified ─────────────────────────────────┐
│                                                   │
│  src/auth/                                        │
│    ├─ jwt.ts        [Edit × 3, Read × 1]         │
│    ├─ refresh.ts    [Edit × 2]                   │
│    └─ middleware/                                 │
│        └─ auth.ts   [Edit × 1, Read × 1]         │
│                                                   │
│  tests/                                           │
│    └─ auth.test.ts  [Edit × 1, Bash × 1]         │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Test Results Matrix** (when running tests):

```tsx
┌─ Test Run: npm test ─────────────────────────────┐
│  ⚙️ Bash: npm test                                │
│                                                   │
│  ✓ 24 passed    ✗ 2 failed    ⏭️ 1 skipped       │
│                                                   │
│  Failed tests:                                    │
│  • auth.test.ts: "should refresh expired token"  │
│  • auth.test.ts: "should reject invalid refresh" │
│                                                   │
│  [View full output ▼]                            │
└───────────────────────────────────────────────────┘
```

**Search Results Heatmap** (when using Grep):

```tsx
┌─ Search: "refreshToken" ─────────────────────────┐
│  🔍 Grep × 2                                      │
│                                                   │
│  📊 Found in 8 files (23 matches):               │
│                                                   │
│  src/auth/jwt.ts           ████████ 8            │
│  src/auth/refresh.ts       ██████ 6              │
│  src/middleware/auth.ts    ███ 3                 │
│  tests/auth.test.ts        ████ 4                │
│  docs/api.md              ██ 2                   │
│                                                   │
│  [View all matches ▼]                            │
└───────────────────────────────────────────────────┘
```

### When to Create Tool Blocks

**Heuristics:**

1. **3+ consecutive tool uses** (no text messages between)
2. **Same operation type** (all Reads, all Edits, etc.) → More aggressive grouping
3. **Related files** (same directory, same feature) → Show file tree
4. **Time proximity** (within 5 seconds) → Part of same "burst"

**Exceptions (DON'T group):**

- Single tool use → Render inline as normal
- Tool use followed by assistant text → Keep separate (agent is explaining)
- Mixed thinking + tools → Keep as is (thinking provides context)

### Implementation

```typescript
function groupMessagesIntoBlocks(messages: Message[]): Block[] {
  const blocks: Block[] = [];
  let toolBuffer: ToolUseBlock[] = [];

  for (const msg of messages) {
    const hasToolUses = msg.tool_uses && msg.tool_uses.length > 0;
    const hasText = typeof msg.content === 'string' && msg.content.trim().length > 0;

    if (hasToolUses && !hasText) {
      // Accumulate tool-only messages
      toolBuffer.push(...extractToolBlocks(msg));
    } else {
      // Flush tool buffer if we have 3+ tools
      if (toolBuffer.length >= 3) {
        blocks.push({ type: 'tool-block', tools: toolBuffer });
        toolBuffer = [];
      } else if (toolBuffer.length > 0) {
        // Too few to group - render individually
        blocks.push(...toolBuffer.map(t => ({ type: 'tool-use', tool: t })));
        toolBuffer = [];
      }

      // Add the current message
      if (hasText || hasToolUses) {
        blocks.push({ type: 'message', message: msg });
      }
    }
  }

  // Flush remaining buffer
  if (toolBuffer.length >= 3) {
    blocks.push({ type: 'tool-block', tools: toolBuffer });
  } else if (toolBuffer.length > 0) {
    blocks.push(...toolBuffer.map(t => ({ type: 'tool-use', tool: t })));
  }

  return blocks;
}
```

### Why This Matters

**Terminals can't do this.** They show:

```
Read src/auth/jwt.ts
[142 lines of output]
Read src/auth/refresh.ts
[89 lines of output]
Edit src/auth/jwt.ts
Edit src/auth/refresh.ts
...
```

**Agor shows:**

```
🔧 Tool Block: Read × 5, Edit × 4
📁 Modified 4 files in src/auth/
[Collapse for summary, expand for details]
```

**This is the new visual grammar.** Dense information, progressive disclosure, context at a glance.

---

## Extensibility: Tool-Specific Renderers

### Plugin Architecture

```typescript
interface MessageRenderer {
  name: string;
  match: (message: Message) => boolean;
  render: (message: Message) => ReactElement;
}

// Register tool-specific renderer
registerRenderer({
  name: 'cursor-diff',
  match: (msg) => msg.metadata?.tool === 'cursor' && msg.metadata?.diff,
  render: (msg) => <CursorDiffView diff={msg.metadata.diff} />
});

// Fallback to generic renderer
const renderer = renderers.find(r => r.match(message)) || genericRenderer;
```

### Tool-Specific Examples

**Cursor Inline Diff:**

```tsx
<CursorDiff
  file="src/app.ts"
  changes={message.metadata.changes}
  actions={
    <>
      <Button type="primary">Apply</Button>
      <Button>Reject</Button>
    </>
  }
/>
```

**Aider Git Commit:**

```tsx
<GitCommit
  sha={message.metadata.commit_sha}
  message={message.metadata.commit_message}
  files={message.metadata.changed_files}
  onView={() => showDiff(sha)}
/>
```

---

## Performance Considerations

### Virtual Scrolling

- Use `react-window` or `@tanstack/react-virtual`
- Render only visible messages + buffer
- Critical for sessions with 1000+ messages

### Lazy Loading

- Don't fetch messages until task is expanded
- Use `useMessages(sessionId, taskId)` for task-scoped fetching
- Cache expanded task messages

### Incremental Rendering

- Render tasks incrementally as user scrolls
- Collapse old tasks automatically after scrolling past
- Keep max 3 tasks expanded simultaneously

### Code Splitting

- Lazy-load tool renderers: `React.lazy(() => import('./renderers/BashRenderer'))`
- Only load what's visible

---

## Implementation Phases

### Phase 1: Basic Task-Message Hierarchy ✅

- [x] Task sections with collapse/expand
- [x] Basic message bubbles (user/assistant)
- [x] Task metadata badges
- [x] Markdown rendering

### Phase 2: Tool Visualization (Next)

- [ ] Generic tool renderer (JSON display)
- [ ] Edit tool renderer (file + diff)
- [ ] Bash tool renderer (terminal style)
- [ ] Read tool renderer (file preview)
- [ ] Tool status indicators

### Phase 3: Advanced Features

- [ ] ThoughtChain for AI thinking
- [ ] File references with click-to-open
- [ ] Code block syntax highlighting
- [ ] Truncation with "Show more"
- [ ] Virtual scrolling

### Phase 4: Extensibility

- [ ] Plugin architecture for tool renderers
- [ ] Cursor-specific renderers
- [ ] Aider-specific renderers
- [ ] Custom metadata display

---

## LLM-Powered Session Enrichment

### Vision

Agor sessions are **living documents** that get richer over time through LLM-powered analysis jobs.

**Core Insight:** We can run background LLM jobs to analyze completed sessions and enrich them with:

- Summaries (task-level, session-level)
- Categorization (feature type, complexity level)
- Pattern detection (similar past work, reusable approaches)
- Knowledge extraction (concepts learned, decisions made)

**These enrichments are optional** - they appear in the UI only when available, progressively enhancing the experience.

### Enrichment Types

#### 1. Task Summaries

**Problem:** Task descriptions come from the first few words of user prompts. Not always helpful.

**Solution:** Run LLM to generate concise task summaries.

```typescript
// Before enrichment
task.description = 'can you help me add auth to the ap'; // Truncated at 40 chars

// After enrichment (stored in task.summary)
task.summary = 'Added JWT authentication with refresh tokens to API endpoints';
```

**UI Treatment:**

```tsx
<TaskHeader>
  {task.summary ? (
    <>
      <TaskTitle>{task.summary}</TaskTitle>
      <Tooltip title={task.full_prompt}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Original: {task.description}...
        </Text>
      </Tooltip>
    </>
  ) : (
    <TaskTitle>{task.description}</TaskTitle>
  )}
</TaskHeader>
```

#### 2. Session Summaries

**Problem:** Hard to remember what a session accomplished at a glance.

**Solution:** Generate session-level summary from all tasks.

```typescript
session.summary = {
  overview: 'Implemented OAuth 2.0 authentication system with JWT tokens',
  key_changes: [
    'Added jwt.ts and refresh.ts authentication modules',
    'Created auth middleware for route protection',
    'Wrote comprehensive test suite (24 tests)',
  ],
  files_modified: 8,
  tests_added: 24,
  complexity: 'medium', // Estimated by LLM
};
```

**UI Treatment:**

```tsx
<SessionCard session={session}>
  {session.summary && (
    <div className="session-summary">
      <Text strong>{session.summary.overview}</Text>
      <List
        size="small"
        dataSource={session.summary.key_changes}
        renderItem={change => <List.Item>{change}</List.Item>}
      />
      <Space size={8}>
        <Badge count={session.summary.files_modified} />
        <Badge count={`${session.summary.tests_added} tests`} color="green" />
        <Tag>{session.summary.complexity}</Tag>
      </Space>
    </div>
  )}
</SessionCard>
```

#### 3. Tool Block Summaries

**Problem:** Even collapsed tool blocks can be dense when there are 50+ tool uses.

**Solution:** LLM generates natural language summary.

```typescript
// Before
toolBlock.collapsed = '🔧 52 tools: Read × 23, Edit × 18, Grep × 8, Bash × 3';

// After enrichment
toolBlock.summary =
  'Refactored authentication logic across 8 files, focusing on JWT token validation and refresh handling. Added error handling for expired tokens.';
```

**UI Treatment:**

```tsx
<ToolBlock>
  {toolBlock.summary ? (
    <Alert type="info" message={toolBlock.summary} showIcon style={{ marginBottom: 12 }} />
  ) : null}

  {/* Standard tool counts and file list */}
  <ToolCounts tools={toolBlock.tools} />
</ToolBlock>
```

#### 4. Pattern & Concept Detection

**Problem:** Hard to find similar past work or reusable patterns.

**Solution:** LLM extracts reusable patterns and concepts.

```typescript
session.patterns = [
  {
    type: 'authentication',
    subtype: 'jwt',
    confidence: 0.95,
    description: 'JWT authentication with refresh tokens',
  },
  {
    type: 'testing',
    subtype: 'integration',
    confidence: 0.88,
    description: 'Integration tests for auth endpoints',
  },
];

session.concepts_mentioned = [
  'OAuth 2.0',
  'JWT tokens',
  'Refresh tokens',
  'Middleware pattern',
  'Token expiration',
];
```

**UI Treatment:**

- Enable search by pattern type ("show me all JWT implementations")
- Show related sessions in sidebar
- Tag-based filtering and grouping

#### 5. Code Quality Insights

**Problem:** Was this session successful? Did it introduce issues?

**Solution:** Analyze tool outputs and test results.

```typescript
session.quality_insights = {
  tests_status: 'all_passing', // Extracted from Bash tool outputs
  type_errors: 0, // Extracted from typecheck outputs
  lint_warnings: 3, // Extracted from lint outputs
  estimated_quality: 'high', // LLM assessment
};
```

### Implementation Strategy

#### Background Job Architecture

```typescript
// Job queue for enrichment tasks
interface EnrichmentJob {
  job_id: string;
  type: 'task-summary' | 'session-summary' | 'tool-block-summary' | 'pattern-detection';
  target_id: string; // session_id or task_id
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number; // Higher = more important
  created_at: string;
  completed_at?: string;
}

// Run enrichment jobs in background
async function runEnrichmentJob(job: EnrichmentJob) {
  const llm = new AnthropicClient({ model: 'claude-3-haiku-20240307' }); // Fast, cheap model

  switch (job.type) {
    case 'task-summary':
      const task = await getTask(job.target_id);
      const messages = await getTaskMessages(job.target_id);

      const summary = await llm.generate({
        system: 'You are a code session analyzer. Generate concise task summaries.',
        prompt: `Analyze this coding task and generate a 1-sentence summary:\n\nUser prompt: ${task.full_prompt}\n\nMessages: ${formatMessages(messages)}`,
      });

      await updateTask(job.target_id, { summary: summary.text });
      break;

    // ... other job types
  }
}
```

#### Triggering Enrichment

**On session completion:**

```typescript
async function onSessionComplete(sessionId: string) {
  // Queue low-priority enrichment jobs
  await queueJob({
    type: 'session-summary',
    target_id: sessionId,
    priority: 1,
  });

  await queueJob({
    type: 'pattern-detection',
    target_id: sessionId,
    priority: 2,
  });
}
```

**On-demand (user-triggered):**

```tsx
<Button onClick={() => enrichSession(session.session_id)} loading={enrichmentStatus === 'running'}>
  ✨ Generate Summary
</Button>
```

### UI Progressive Enhancement

**Key Principle:** Never wait for enrichment. Show raw data immediately, enhance when available.

```tsx
function TaskHeader({ task }: { task: Task }) {
  return (
    <div>
      {/* Always show description */}
      <Text strong>{task.description}</Text>

      {/* Show summary badge if available */}
      {task.summary && (
        <Tooltip title={task.summary}>
          <Tag color="blue" style={{ marginLeft: 8 }}>
            ✨ AI Summary
          </Tag>
        </Tooltip>
      )}

      {/* Show enrichment status if running */}
      {task.enrichment_status === 'running' && <Spin size="small" style={{ marginLeft: 8 }} />}
    </div>
  );
}
```

### Cost Management

**Haiku for cheap, fast enrichment:**

- Task summaries: ~100 tokens/task = $0.0001 per task
- Session summaries: ~500 tokens/session = $0.0005 per session
- Tool block summaries: ~200 tokens/block = $0.0002 per block

**For a 50-task session:**

- Total cost: ~$0.05
- Total time: ~10 seconds (parallel processing)

**User controls:**

- Enable/disable auto-enrichment
- Choose which enrichment types to run
- Batch enrich old sessions

### Future Possibilities

1. **Real-time enrichment** during active sessions (summarize as you go)
2. **Cross-session learning** (find similar patterns across all your sessions)
3. **Recommendation engine** ("Based on this task, you might want to...")
4. **Automatic concept extraction** to Agor's knowledge base
5. **Quality scoring** to identify your most successful patterns

**This is where Agor truly shines:** Not just showing what happened, but helping you **understand** what happened.

---

## Open Questions

1. **Task Boundaries:** Should we allow merging/splitting tasks in UI?
2. **Search:** How to search within collapsed tasks? Highlight + auto-expand?
3. **Filtering:** Filter by tool type? Message type? Time range?
4. **Annotations:** Can users add comments to messages?
5. **Replay:** Should we support "replay" mode (show conversation as it happened)?
6. **Multi-select:** Select multiple messages for export/copy?
7. **Enrichment Privacy:** Should enrichment be local-only option? Cloud-based?
8. **Enrichment Accuracy:** How to handle incorrect LLM summaries? Allow manual override?

---

## References

- Ant Design X Components: `@ant-design/x`
- Agor Message Types: `packages/core/src/types/message.ts`
- Agor Task Model: `packages/core/src/types/task.ts`
- Current Implementation: `apps/agor-ui/src/components/ConversationView/`

---

## Next Steps

1. Review this exploration with team
2. Create wire frames for task expansion/collapse UX
3. Implement Phase 2: Tool visualization
4. User testing with real Claude Code sessions
5. Iterate based on feedback
