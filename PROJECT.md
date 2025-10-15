## Implementation Status

### Social features

See [context/explorations/social-features.md](context/explorations/social-features.md) for detailed implementation plan.

**Goal:** Add presence indicators so teammates can see what each other is doing in real-time.

- [ ] **Facepile** - Show active users on board (1-2 days)
  - PresenceManager service in daemon
  - `board:join` / `board:leave` WebSocket events
  - `usePresence()` hook in UI
  - Ant Design `Avatar.Group` component in canvas header

- [ ] **Cursor swarm** - Real-time cursor positions (2-3 days)
  - `cursor:move` / `cursor:update` events (throttled to 50ms)
  - `useCursorBroadcast()` and `useRemoteCursors()` hooks
  - CursorOverlay component with smooth interpolation
  - Use React Flow project() for coordinate mapping

- [ ] **Presence indicators** - Who's viewing which sessions (1 day)
  - `viewing:session` events
  - Mini avatar badges on session cards
  - Tooltip showing viewer names

- [ ] **Typing indicators** - Who's prompting (1 day)
  - `typing:start` / `typing:stop` events
  - "User is typing..." below prompt input

### Phase 3c: Session Orchestration (2-3 weeks)

**Goal:** Complete the core fork/spawn workflow for parallel session management.

- [ ] **Session forking UI** - Fork sessions at decision points
  - Wire fork button to `/sessions/:id/fork` API
  - Display fork genealogy on canvas (React Flow edges)
  - Show fork point in conversation view

- [ ] **Genealogy visualization** - Show session relationships
  - React Flow edges between parent/child/forked sessions
  - Different edge styles (solid spawn, dashed fork)
  - Click edge to see fork/spawn context

### Phase 4: Distribution & Packaging (Q2-Q4 2025)

**Goal:** Make Agor easy to install and use for non-developers.

See [context/explorations/single-package.md](context/explorations/single-package.md) for complete distribution strategy.

**Phase 4a: Quick npm Release (Q2 2025) - 1-2 weeks**

- [ ] Publish `@agor/core` to npm
- [ ] Publish `@agor/daemon` to npm
- [ ] Publish `@agor/cli` to npm
- [ ] Update README with npm install instructions
- [ ] Document daemon setup separately

**Phase 4b: Bundled Experience (Q3 2025) - 2-4 weeks**

- [ ] Bundle daemon into CLI package
- [ ] Implement auto-start daemon on CLI commands
- [ ] Add `agor daemon` lifecycle commands (start/stop/status/logs)
- [ ] Publish `agor` meta-package
- [ ] Update README with simplified instructions

**Phase 4c: Desktop Application (Q4 2025) - 6-8 weeks**

- [ ] Choose framework: Tauri (recommended) or Electron
- [ ] Embed daemon as Tauri sidecar
- [ ] Build native installers (macOS .dmg, Windows .exe, Linux .deb)
- [ ] Add system tray integration
- [ ] Publish to Homebrew, winget, apt repositories
- [ ] Implement native auto-update mechanism

---

### Future (Phase 5+)

See [context/explorations/](context/explorations/) for detailed designs:

- **OAuth & organizations** ([multiplayer-auth.md](context/explorations/multiplayer-auth.md)) - GitHub/Google login, team workspaces, RBAC
- **Multi-agent support** ([agent-interface.md](context/concepts/agent-integration.md)) - Cursor, Codex, Gemini
- **Cloud deployment** - PostgreSQL migration, Turso/Supabase, hosted version

# Critical path

- [ ] model picker for claude
- [ ] wrap up permissions-handling in Claude Code (currently, "allow for this session" doesn't session)
- [ ] attach proper git sha to tasks: what was the latest commit when the task was created, mark whether -dirty or not
- [ ] integrate concepts and reports in the information architecture
- [ ] Finish MCP server integrations (3a): sort out the scoping stuff
- [ ] stream answers in blocks

# Nice to have

- [ ] get Codex/Gemini to work
- [ ] allow attaching a PR link to the session metadata, add a text field to the "session settings"
- [ ] show token count and $ (if it applies) per task/session
- [ ] concept management (CRUD/CLI) shows as readonly - many-to-many per session
- [ ] report management + production system
