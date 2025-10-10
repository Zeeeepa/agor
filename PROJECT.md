# Agor Project

> **Next-gen agent orchestration platform** - Manage unlimited AI coding agents in hyper-context-aware session trees.

**See [context/](context/) for complete architecture, data models, and design documentation.**

---

## What Is Agor?

**Agor is an agent orchestrator** - the platform layer that sits above all agentic coding tools (Claude Code, Cursor, Codex, Gemini), providing unified session management, visual session trees, and automatic knowledge capture.

**Core Insight:** Context engineering isn't about prompt templates—it's about managing sessions, tasks, and concepts as first-class composable primitives stored in a session tree.

**See:** [context/concepts/core.md](context/concepts/core.md) for vision and primitives.

---

## Current Status

### ✅ Completed (Phases 1-2)

**UI Prototype** (`apps/agor-ui/`)

- Complete React + Ant Design component library with Storybook
- SessionCard with drag handles and task preview
- SessionDrawer with ConversationView (Ant Design X Bubble)
- SessionCanvas with React Flow for tree visualization
- Board organization and session tree visualization
- Real messages API integration with WebSocket subscriptions
- Mock data layer with 18+ realistic sessions

**Backend Infrastructure** (`apps/agor-daemon/`, `packages/core/`)

- FeathersJS REST + WebSocket daemon on :3030
- Drizzle ORM + LibSQL with hybrid materialization strategy
- Repository pattern: Sessions, Tasks, Messages, Repos, Boards
- UUIDv7 IDs with short ID resolution
- Git operations: clone, worktree management

**CLI** (`apps/agor-cli/`)

- `agor init` - Database initialization
- `agor repo add/list/rm` - Repository management
- `agor repo worktree add/list` - Worktree operations
- `agor session list` - Table view with filters
- `agor session load-claude <id>` - Import Claude Code sessions from transcript files
- `agor board list/add-session` - Board organization

**Live Agent Execution** (`packages/core/tools/claude/`)

- Claude Agent SDK integration (`@anthropic-ai/claude-agent-sdk`)
- `ClaudePromptService` - Execute prompts with CLAUDE.md auto-loading
- `ClaudeTool` - Create user/assistant messages, emit WebSocket events
- Preset system prompts matching CLI behavior
- **Session continuity** - Agent SDK `resume` parameter for conversation history
- Progressive message streaming with real-time WebSocket updates
- Optional tool execution framework (Read, Write, Bash - disabled for now)

**Data Architecture**

- Messages = immutable event log (append-only)
- Tasks = mutable state containers (extracted from user messages)
- Bulk insert endpoints (`/messages/bulk`, `/tasks/bulk`)
- Message → Task extraction pipeline (batched at 100 items)
- Real-time 4-phase prompt execution: Create task → Call Claude → Link messages → Mark complete

**See:** [CLAUDE.md](CLAUDE.md) for complete implementation details.

---

## What's Next

### ✅ Phase 3: Live Claude Agent Integration (COMPLETE)

**What Works Now:**

- ✅ Claude Agent SDK integration with CLAUDE.md auto-loading
- ✅ Progressive WebSocket message streaming (real-time UI updates)
- ✅ Agent SDK session continuity (`resume` parameter for conversation history)
- ✅ Task-centric conversation view with running/completed states

**Next Steps**

- [ ] Add token usage tracking from Agent SDK metadata
- [ ] Enable optional tools (`allowedTools: ['Read', 'Grep']`) with UX design
- [ ] Session fork/spawn with genealogy tracking

**Session Management**

- [ ] `agor session show <id>` - Detailed view with genealogy tree
- [ ] `agor session create` - Interactive session wizard
- [ ] Session state transitions (idle → running → completed)
- [ ] Fork at decision points, spawn for subtasks

**Advanced Features**

- [ ] Concept management (modular context composition)
- [ ] Report generation from completed tasks
- [ ] Multi-agent abstraction (when adding agent #2)
- [ ] Daemon auto-start and process management

### 🚧 Phase 4: UI Integration & Desktop App

**Connect UI to Backend**

- [x] Messages API integration with real-time WebSocket
- [x] ConversationView component with task-centric organization
- [x] SessionDrawer with live message loading
- [x] Progressive message rendering with streaming WebSocket updates
- [x] Task status updates (running → completed) with UI feedback
- [x] ToolUseRenderer for displaying tool calls inline
- [x] MarkdownRenderer with proper Ant Design Typography styling
- [ ] Replace remaining mock data with daemon API calls (sessions, boards)
- [ ] Session creation flow integrated with daemon
- [ ] Prompt input component with submit to daemon
- [ ] Task timeline visualization from messages table
- [ ] Genealogy tree rendering from database

**Desktop Packaging**

- [ ] Electron/Tauri wrapper
- [ ] Bundled daemon (auto-start on app launch)
- [ ] System tray integration
- [ ] Local file system access for worktrees

---

## Roadmap

### V1: Local Desktop App (Target: Q2 2025)

**Goal:** Full-featured local agent orchestrator with GUI + CLI

**Core Capabilities:**

- Multi-agent session management (Claude Code, Cursor, Codex, Gemini)
- Visual session tree canvas with fork/spawn genealogy
- Git worktree integration for isolated parallel sessions
- Concept library for modular context composition
- Automatic report generation from completed tasks
- Local-only (no cloud, SQLite-based)

**Deliverables:**

- Desktop app (Electron or Tauri)
- Standalone CLI binary (`agor`)
- Documentation + tutorials

---

### V2: Agor Cloud (Target: Q4 2025)

**Goal:** Real-time collaborative agent orchestration

**New Capabilities:**

- Cloud-hosted sessions (migrate LibSQL → PostgreSQL)
- Real-time multiplayer (multiple devs, same session tree)
- Shared concept libraries (team knowledge bases)
- Pattern recommendations (learn from successful session workflows)
- Session replay/export for knowledge sharing

**Tagline:** _Real-time strategy multiplayer for AI development_

**See:** [README.md](README.md) for full product vision.

---

## Project Structure

```
agor/
├── apps/
│   ├── agor-daemon/       # FeathersJS backend (REST + WebSocket)
│   ├── agor-cli/          # CLI tool (oclif)
│   └── agor-ui/           # React UI (Storybook-first)
│
├── packages/
│   └── core/              # Shared @agor/core package
│       ├── types/         # TypeScript types
│       ├── db/            # Drizzle ORM + repositories
│       ├── git/           # Git utilities
│       ├── claude/        # Claude Code integration
│       └── api/           # FeathersJS client
│
└── context/               # Architecture documentation
    ├── concepts/          # Core design docs (read first)
    └── explorations/      # Experimental designs
```

**Monorepo:** Turborepo + pnpm workspaces

---

## Quick Start

### Run Daemon

```bash
cd apps/agor-daemon
pnpm dev  # Starts on :3030
```

### Use CLI

```bash
# Initialize database
pnpm agor init

# Import a Claude Code session
pnpm agor session load-claude <session-id>

# List sessions
pnpm agor session list
```

### Develop UI

```bash
cd apps/agor-ui
pnpm storybook  # Component development
pnpm dev        # Full app
```

**See:** [CLAUDE.md](CLAUDE.md) for complete development guide.

---
