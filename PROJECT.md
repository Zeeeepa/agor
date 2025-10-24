# Launch Checklist

Simple todo list for launch preparation.

## Must-Do for Launch

### Core Features

- [ ] Troubleshoot Claude session edge cases (unclear/incomplete results)
- [ ] Session forking UI with genealogy visualization in WorktreeCard
- [ ] Session spawning UI with genealogy visualization in WorktreeCard

### Documentation

- [ ] Complete getting started guide with screenshots/videos

### Distribution

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
- [ ] Typing indicators in prompt input
- [ ] Worktree CLI commands (`agor worktree list/create/delete`)

### Advanced Features

- [ ] Export session/task as markdown

---

## Consider for Launch

- [ ] Write/Edit tool with file diffs and syntax highlighting
- [ ] Concepts as first-class primitives (CRUD in UI/CLI)
- [ ] Reports as first-class primitives (CRUD in UI/CLI)
- [ ] bulk create worktrees based on a set of issue_url
- [ ] `@`-triggered autocomplete for sessions/repos/concepts
- [ ] annotations/comment/post-it notes social features

## Post-Launch (Future)

See [context/explorations/](context/explorations/) for detailed designs:

- **CLI session sync** - Keep local CLI sessions in sync with Agor for seamless solo-to-collab handoff
- enhance around SDK advanced features, try to meet CLI parity as much as possible (support Claude Agents, slash commands, etc)
- Cloud deployment (PostgreSQL, Turso/Supabase, hosted version)
- Advanced worktree UX (see `worktree-ux-design.md`)
- Background job system (see `async-jobs.md`)
- Subtask orchestration (see `subtask-orchestration.md`)
- [ ] Keyboard shortcuts for board navigation
