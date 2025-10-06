<div align="center">
  <img src="https://github.com/user-attachments/assets/e34f3d25-71dd-4084-8f3e-4f1c73381c66" alt="Agor Logo" width="320" style="border-radius: 50%;" />
</div>

# Agor: Agent Orchestrator

> **Agor — Next-gen agent orchestration**
> Manage unlimited agents in hyper-context-aware session trees

**Pronunciation:** "AY-gore"

**Status:** Backend + CLI Complete | UI Integration Next
**Project:** Open Source (Apache 2.0)
**Organization:** Tembo
**Date:** January 2025

**Quick Links:**

- [PROJECT.md](PROJECT.md) - Implementation roadmap & current status
- [CLAUDE.md](CLAUDE.md) - Developer guide & technical documentation
- [context/](context/) - Architecture documentation

---

## What Is Agor?

**Agor is the orchestration layer for AI-assisted development.** Instead of juggling multiple agentic coding tools (Claude Code, Cursor, Codex, Gemini) in isolation, Agor provides one unified interface to coordinate all your agents, visualize session trees, and capture knowledge automatically.

### The Core Insight

> Context engineering isn't about prompt templates—it's about managing sessions, tasks, and concepts as first-class composable primitives stored in a session tree.

### Five Fundamental Primitives

1. **Session** - Everything is a session. Fork, spawn, navigate workflows as trees.
2. **Task** - User prompts are tasks. Checkpoint work, track git state.
3. **Report** - Post-task hooks generate structured learnings automatically.
4. **Worktree** - Git worktrees for session isolation (optional but powerful).
5. **Concept** - Modular context nuggets, compose into session-specific knowledge.

**See [context/concepts/core.md](context/concepts/core.md) for detailed explanations.**

---

## Picture The Experience

**The canvas:** A visual tree of all your coding sessions—past, present, and parallel.

```
┌─ Session A (Claude Code) ──────────────────────┐  RUNNING
│  "Build authentication system"                  │
│  📍 feature/auth @ b3e4d12                      │
│  📦 [auth, security, api-design]                │
│                                                  │
│  ✓ Task 1: Design JWT flow                     │
│  ⚡ Task 2: Implement endpoints (in progress)   │
│                                                  │
│  ├─ Session B (forked @ Task 1) ───────┐        │
│  │  "Try OAuth 2.0 instead"            │  IDLE  │
│  │  📍 feature/oauth @ c5f6e23          │        │
│  │  ✓ Task 3: Implement OAuth           │        │
│  │                                       │        │
│  └─ Session C (spawned @ Task 2) ──────┐        │
│     "Design user database schema"      │  DONE  │
│     Agent: Gemini                       │        │
│     📍 main @ d7g8h34                   │        │
│     📦 [database, security]             │        │
│     ✓ Task 4: Schema design             │        │
└─────────────────────────────────────────┘
```

**One click:** Jump into any session. Resume conversations. Fork at decision points. Spawn focused subtasks.

**One view:** See which sessions succeeded, which stalled. Understand your exploration tree at a glance.

**One library:** All reports, all learnings, searchable. "Show me all OAuth implementations." "What worked for database migrations?"

**One workspace:** Claude Code for backend, Cursor for frontend, Gemini for schemas—all orchestrated, all visible, all tracked.

**This is Agor: One UI to rule them all.**

---

## The Session Tree

**The session tree is Agor's fundamental artifact** - a complete, versioned record of all agentic coding sessions in your project.

### What It Stores

- **All sessions** - Every conversation with every agent
- **Complete genealogy** - Fork and spawn relationships
- **Git integration** - Which sessions produced which code
- **Task history** - Granular checkpoint of every user prompt
- **Reports** - Structured learnings extracted from each task
- **Concepts** - Modular context library

### Why It Matters

- **Observable** - Visualize explorations, see what worked
- **Interactive** - Fork, spawn, navigate between sessions
- **Shareable** - Push/pull like git, collaborate on trees
- **Versioned** - Complete audit trail of AI-assisted development

### Session Tree As Git's Companion

```
Your Project:
├── .git/          # Code repository (git)
│   └── Your code's version history
│
└── .agor/         # Session tree (agor)
    ├── agor.db    # Session database (SQLite)
    ├── repos/     # Cloned repositories
    └── worktrees/ # Git worktrees for session isolation
```

**Git tracks code. Agor tracks the conversations that produced the code.**

**See [context/concepts/core.md](context/concepts/core.md#the-session-tree) for more details.**

---

## Why Agor?

### For Individual Developers

- **Never lose context** - Full session history, always accessible
- **Explore confidently** - Fork sessions to try alternatives
- **Learn from yourself** - Reports capture what worked, what didn't
- **Work in parallel** - Multiple agents, multiple sessions, zero conflicts

### For Teams

- **Share knowledge** - Session trees are version-controlled and shareable
- **Onboard faster** - Explore past sessions to understand decisions
- **Pattern recognition** - Find similar past work, reuse approaches
- **Audit trail** - Complete provenance of code changes

### Why It Wins

- **Platform play** - Orchestrates all agents, doesn't compete with them
- **Developer-centric** - Git-aware, visual tools, report-driven
- **Open source** - Community-driven, vendor-neutral

---

## Current Status

**✅ Completed:**

- Backend daemon (FeathersJS + Drizzle + LibSQL)
- CLI tool (session management, repo/worktree operations)
- Claude Code session import with task extraction
- UI prototype (React + Ant Design + Storybook)
- Data architecture (Messages → Tasks event sourcing)

**🚧 In Progress:**

- Agent integration framework
- UI ↔ Backend connection
- Real-time updates

**See [PROJECT.md](PROJECT.md) for detailed roadmap.**

---

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Git repository (optional, for worktree features)

### Installation

```bash
git clone https://github.com/mistercrunch/agor
cd agor
pnpm install
pnpm build
```

### Run the Daemon

```bash
cd apps/agor-daemon
pnpm dev  # Starts on http://localhost:3030
```

### Use the CLI

```bash
# Initialize Agor database
pnpm agor init

# Import a Claude Code session
pnpm agor session load-claude <session-id>

# List all sessions
pnpm agor session list

# Clone a repository
pnpm agor repo add https://github.com/user/repo

# Create a worktree for isolated work
pnpm agor repo worktree add <repo-slug> <worktree-name>
```

### Develop the UI

```bash
cd apps/agor-ui
pnpm storybook  # Component development on :6006
pnpm dev        # Full app
```

**See [CLAUDE.md](CLAUDE.md) for complete developer documentation.**

---

## Documentation

Agor's knowledge is organized into modular concept files:

### Core Concepts

- **[core.md](context/concepts/core.md)** - The 5 primitives, vision, and how they compose
- **[models.md](context/concepts/models.md)** - Data models and relationships
- **[architecture.md](context/concepts/architecture.md)** - System design and storage structure
- **[design.md](context/concepts/design.md)** - UI/UX principles and component patterns
- **[id-management.md](context/concepts/id-management.md)** - UUIDv7 and short ID strategy

### Implementation Guides

- **[CLAUDE.md](CLAUDE.md)** - Complete technical documentation for developers
- **[PROJECT.md](PROJECT.md)** - Implementation roadmap and status

**See [context/README.md](context/README.md) for the complete concept index.**

---

## Product Roadmap

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

---

## Architecture

**Full Stack:**

- **Backend:** FeathersJS (REST + WebSocket) + Drizzle ORM + LibSQL
- **CLI:** oclif + cli-table3
- **Frontend:** React + TypeScript + Ant Design + React Flow + Storybook
- **Desktop:** Electron/Tauri wrapper (planned)

**Key Technologies:**

- UUIDv7 for time-ordered globally unique IDs
- Hybrid materialization strategy (indexed columns + JSON blobs)
- Event sourcing pattern (Messages = log, Tasks = state)
- Git worktrees for session isolation
- Repository pattern for local → cloud migration path

**See [context/concepts/architecture.md](context/concepts/architecture.md) for complete system design.**

---

## Contributing

Agor is open source (Apache 2.0). Contributions welcome!

**Before contributing:**

1. Read [context/concepts/core.md](context/concepts/core.md) - Understand primitives and vision
2. Read [CLAUDE.md](CLAUDE.md) - Development workflow and standards
3. Check [PROJECT.md](PROJECT.md) for current roadmap

**Code standards:**

- **UI:** Follow [context/concepts/design.md](context/concepts/design.md)
- **Backend:** Repository pattern, Drizzle ORM, FeathersJS services
- **CLI:** oclif conventions, entity-based commands
- **Types:** Shared via `@agor/core/types`

**Issues:** [github.com/mistercrunch/agor/issues](https://github.com/mistercrunch/agor/issues)
**Discussions:** [github.com/mistercrunch/agor/discussions](https://github.com/mistercrunch/agor/discussions)

---

## License

Apache License 2.0

---

_Agor - Next-gen agent orchestration. Built by developers, for developers._
