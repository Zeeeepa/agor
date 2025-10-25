# Launch Checklist

Simple todo list for launch preparation.

## Must-Do for Launch

### Core Features

- [ ] Troubleshoot Claude session edge cases (unclear/incomplete results)
- [ ] Session spawning UI with genealogy visualization in WorktreeCard

### Documentation

- [ ] Complete getting started guide with screenshots/videos

### Distribution

- [ ] Fix codespaces setup for Agor repo
- [ ] Publish `@agor/core` to npm
- [ ] Publish `@agor/daemon` to npm
- [ ] Publish `@agor/cli` to npm
- [ ] Bundle daemon into CLI for simplified install
- [ ] Auto-start daemon on CLI commands
- [ ] Add `agor daemon` lifecycle commands (start/stop/status/logs)

---

## Nice-to-Have for Launch

### UX Polish

- [ ] Token count & cost tracking ($ per task/session)
- [ ] Worktree CLI commands (`agor worktree list/create/delete`)
- [ ] Terminal shortcut: Command palette shortcut to open terminal in worktree path (without opening WorktreeModal)

## Consider for Launch

- [ ] Write/Edit tool with file diffs and syntax highlighting
- [ ] Concepts as first-class primitives (CRUD in UI/CLI)
- [ ] Reports as first-class primitives (CRUD in UI/CLI)
- [ ] `@`-triggered autocomplete for sessions/repos/concepts

## Post-Launch (Future)

See [context/explorations/](context/explorations/) for detailed designs:

- **CLI session sync** - Keep local CLI sessions in sync with Agor for seamless solo-to-collab handoff
- enhance around SDK advanced features, try to meet CLI parity as much as possible (support Claude Agents, slash commands, etc)
- Cloud deployment (PostgreSQL, Turso/Supabase, hosted version)
- Background job system (see `async-jobs.md`)
- Subtask orchestration (see `subtask-orchestration.md`)
- [ ] Keyboard shortcuts for board navigation
- Terminal persistence across restarts (?)
