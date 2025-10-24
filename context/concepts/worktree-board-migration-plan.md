# Worktree-Centric Board Migration Plan

**Status:** Phase 0 & 1 Complete ✅
**Date:** 2025-10-24
**Context:** Shift from session-centric to worktree-centric boards

**Related:**

- [[worktree-board-design]] - UX design spec for worktree boards
- [[worktree-centric-prd]] - Worktree normalization and modal design
- [[session-worktree-attribute-migration]] - Data attribute migration analysis
- [[board-objects]] - Current board layout system

---

## Executive Summary

**The Big Pivot:** Boards display **Worktrees** (not Sessions) as primary units.

**Key Insight:** This is LESS disruptive than it seems because we can layer it in gradually:

1. Add `board_id` to worktrees (nullable)
2. Support BOTH session cards AND worktree cards on boards (hybrid mode)
3. Migrate existing session-based boards to worktree-based gradually
4. Eventually deprecate session cards on boards

**Core Architectural Change:**

```
BEFORE:
Boards ←(many-to-many via board_objects)→ Sessions ←(many-to-one)→ Worktrees

AFTER:
Boards ←(one-to-many)→ Worktrees ←(one-to-many)→ Sessions
```

**Worktree Ownership Model:**

- Worktree belongs to ONE board (or none)
- NOT many-to-many (simpler mental model: "worktree is a project on a board")
- Sessions are accessed THROUGH worktrees (genealogy tree inside WorktreeCard)

---

## Phase 0: Data Model Changes ✅ COMPLETE

### Add `board_id` to Worktrees ✅

**Schema Update:** ✅ Implemented

```sql
-- Added board_id column (nullable)
ALTER TABLE worktrees ADD COLUMN board_id TEXT REFERENCES boards(board_id) ON DELETE SET NULL;

-- Added index for fast queries
CREATE INDEX worktrees_board_idx ON worktrees(board_id);
```

**Type Update:** ✅ Implemented

```typescript
// packages/core/src/types/worktree.ts
export interface Worktree {
  // ... existing fields ...

  /**
   * Board this worktree belongs to (if any)
   *
   * Worktrees can live on ONE board (not many).
   * Sessions within the worktree are accessed through the worktree card.
   */
  board_id?: BoardID;
}
```

**Implementation Notes:**

- ✅ board_id added to Worktree type
- ✅ board_id stored as top-level column in database (not in data JSON blob)
- ✅ Repository layer reads and writes board_id correctly
- ✅ Critical bug fixed: rowToWorktree() now includes board_id when reading from DB
- ✅ Critical bug fixed: Use null instead of undefined for clearing (JSON serialization)

---

## Phase 1: Worktree-Centric Boards ✅ COMPLETE

**Goal:** Display worktrees as primary units on boards (simplified from original hybrid plan)

**Implementation Decision:** Skip hybrid dual-card system, go directly to worktree-only boards

**Why?** Simpler architecture, clearer user mental model, all sessions already have worktrees

**Note:** All sessions MUST have worktrees (fundamental constraint). We display sessions WITHIN worktree cards, not as separate canvas nodes.

### BoardObject Type Update ✅ Implemented (Simplified)

```typescript
// packages/core/src/types/board.ts
export interface BoardEntityObject {
  object_id: string;
  board_id: BoardID;
  worktree_id: WorktreeID; // Only worktrees on boards (no session cards)
  position: { x: number; y: number };
  created_at: string;
}
```

**Implementation Notes:**

- ✅ Simplified from hybrid approach - only worktrees on boards
- ✅ board_objects table stores worktree_id (required)
- ✅ No object_type field needed (always worktree)
- ✅ Sessions displayed within WorktreeCard, not as separate canvas nodes

---

### UI Components ✅ Implemented

**1. SessionCanvas (worktree-only):** ✅ Implemented

Located: `apps/agor-ui/src/components/SessionCanvas/SessionCanvas.tsx`

```tsx
// Simplified - only worktree nodes (no hybrid dual-card system)
const initialNodes: Node[] = useMemo(() => {
  return worktrees.map(worktree => ({
    id: worktree.worktree_id,
    type: 'worktreeNode',
    data: {
      worktree,
      sessions: worktreeSessions,
      tasks,
      users,
      // ... handlers
    },
    position: boardObject?.position || autoLayoutPosition,
  }));
}, [boardObjects, worktrees, sessions, tasks, users]);
```

**2. WorktreeCard component:** ✅ Implemented

Located: `apps/agor-ui/src/components/WorktreeCard/WorktreeCard.tsx`

Features implemented:

- ✅ Worktree header with name, ref, and metadata
- ✅ Branch icon (BranchesOutlined)
- ✅ Edit and delete buttons
- ✅ Collapsible session list with expand/collapse
- ✅ Session status indicators and badges
- ✅ Click session to open SessionDrawer
- ✅ Issue/PR links
- ✅ Created by metadata with user avatars
- ✅ Draggable via React Flow
- ✅ Pinnable to zones (visual indicator)

---

### Backend Services

**1. Update BoardObjectsService:**

```typescript
// apps/agor-daemon/src/services/board-objects.ts

export class BoardObjectsService extends Service {
  async create(data: Partial<BoardObject>) {
    // Validate: exactly one of session_id or worktree_id
    if (!data.session_id && !data.worktree_id) {
      throw new BadRequest('Must specify session_id or worktree_id');
    }
    if (data.session_id && data.worktree_id) {
      throw new BadRequest('Cannot specify both session_id and worktree_id');
    }

    data.object_type = data.session_id ? 'session' : 'worktree';

    return super.create(data);
  }
}
```

**2. Add helper methods to WorktreesService:**

```typescript
// apps/agor-daemon/src/services/worktrees.ts

export class WorktreesService extends Service {
  async addToBoard(worktreeId: WorktreeID, boardId: BoardID) {
    // Set worktree.board_id
    await this.patch(worktreeId, { board_id: boardId });

    // Create board_object entry (for positioning)
    await this.app.service('board-objects').create({
      board_id: boardId,
      object_type: 'worktree',
      worktree_id: worktreeId,
      position: { x: 100, y: 100 }, // Default position
    });
  }

  async removeFromBoard(worktreeId: WorktreeID) {
    // Clear worktree.board_id
    await this.patch(worktreeId, { board_id: null });

    // Remove board_object entry
    const objects = await this.app.service('board-objects').find({
      query: { worktree_id: worktreeId },
    });

    for (const obj of objects.data) {
      await this.app.service('board-objects').remove(obj.object_id);
    }
  }
}
```

---

## Phase 2: Zone Trigger Updates

**Goal:** Zones trigger worktrees (not sessions) with modal flow

### Update Zone Schema

```typescript
// packages/core/src/types/board.ts

export interface Zone {
  zone_id: string;
  board_id: BoardID;
  name: string;
  color: string;
  bounds: { x: number; y: number; width: number; height: number };

  // Trigger config
  trigger?: {
    template: string; // Handlebars template

    // NEW: Binary behavior setting
    behavior: 'always_new' | 'show_picker'; // Default: 'show_picker'
  };
}
```

### Zone Trigger Flow (See worktree-board-design.md)

**Behavior 1: "always_new"**

- Drop worktree → Create new root session → Apply trigger

**Behavior 2: "show_picker"** (default)

- Drop worktree → Open ZoneTriggerModal
  - Step 1: Select session (smart default)
  - Step 2: Choose action (Prompt/Fork/Spawn)
  - Apply trigger

---

## Phase 3: UI Migration Path

### Strategy: Gradual Feature Rollout

**Week 1: Worktree Cards (Read-Only)**

- [ ] Implement WorktreeCard component
- [ ] Support displaying worktrees on boards (no editing yet)
- [ ] Users can see worktree cards alongside session cards

**Week 2: Worktree Card Interactions**

- [ ] Click session in tree → Open SessionDrawer
- [ ] Click [edit] → Open WorktreeModal
- [ ] Expand/collapse session tree
- [ ] Drag worktree cards (reposition)

**Week 3: Add to Board Functionality**

- [ ] Settings → Worktrees → "+ Add to Board" button
- [ ] Dropdown to select target board
- [ ] Sets worktree.board_id + creates board_object

**Week 4: Zone Triggers for Worktrees**

- [ ] Implement ZoneTriggerModal (two-step flow)
- [ ] Smart default session selection logic
- [ ] Template expansion with worktree context

**Week 5: Deprecation Path**

- [ ] Add banner: "Session cards are deprecated. Move sessions to worktrees."
- [ ] Provide migration wizard: "Convert board to worktree-centric"
- [ ] Eventually remove session card support (Phase 4+)

---

## Phase 4: Data Migration (Future)

### Convert Session-Based Boards to Worktree-Based

**Migration Script:**

```typescript
export async function migrateBoardsToWorktreeCentric(db: Database) {
  const boards = await db.select().from(boardsTable);

  for (const board of boards) {
    // Get all sessions on this board
    const boardObjects = await db
      .select()
      .from(boardObjectsTable)
      .where(eq(boardObjectsTable.board_id, board.board_id));

    const sessionObjects = boardObjects.filter(obj => obj.object_type === 'session');

    // Group sessions by worktree
    const sessionsByWorktree = new Map<WorktreeID, BoardObject[]>();

    for (const obj of sessionObjects) {
      const session = await db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.session_id, obj.session_id!))
        .get();

      if (session.worktree_id) {
        if (!sessionsByWorktree.has(session.worktree_id)) {
          sessionsByWorktree.set(session.worktree_id, []);
        }
        sessionsByWorktree.get(session.worktree_id)!.push(obj);
      }
    }

    // Create worktree cards for each worktree (use position of first session)
    for (const [worktreeId, objs] of sessionsByWorktree) {
      const firstSessionPos = objs[0].position;

      // Set worktree.board_id
      await db
        .update(worktreesTable)
        .set({ board_id: board.board_id })
        .where(eq(worktreesTable.worktree_id, worktreeId));

      // Create worktree board_object
      await db.insert(boardObjectsTable).values({
        object_id: generateUUID(),
        board_id: board.board_id,
        object_type: 'worktree',
        worktree_id: worktreeId,
        position: firstSessionPos, // Use first session's position
        created_at: new Date().toISOString(),
      });

      // Delete old session board_objects
      for (const obj of objs) {
        await db.delete(boardObjectsTable).where(eq(boardObjectsTable.object_id, obj.object_id));
      }
    }
  }
}
```

---

## Cleanup: Superseded Documents

### Documents to Archive/Delete

**1. README reference to worktree-ux-design.md (doesn't exist)**

- Update context/README.md to remove this reference

**2. Consider consolidating:**

- `worktree-centric-prd.md` (Phase 0-1 complete, focused on modal)
- `worktree-board-design.md` (NEW, focused on boards)
- `session-worktree-attribute-migration.md` (still relevant, data model)

**Recommendation:**

- Keep all three (they serve different purposes)
- Update worktree-centric-prd.md to reference worktree-board-design.md
- Add cross-references

---

## Key Constraints

### Sessions MUST Have Worktrees

**Fundamental Rule:** Sessions cannot exist without worktrees in Agor.

**Rationale:**

- Agentic coding requires a filesystem/git context
- No worktree = no place for agent to work
- `sessions.worktree_id` is NOT NULL (required FK)

**Deletion Cascade:**

```sql
-- sessions.worktree_id has ON DELETE CASCADE
-- Delete worktree → automatically deletes all sessions in it
ALTER TABLE sessions
  ADD FOREIGN KEY (worktree_id)
  REFERENCES worktrees(worktree_id)
  ON DELETE CASCADE;
```

**UI Warning:**
When user tries to delete worktree with sessions:

```
⚠️ Delete worktree "feat-auth"?

This will permanently delete:
- 3 active sessions
- 12 past sessions
- All conversation history

This action cannot be undone.

[Cancel] [Delete Worktree & Sessions]
```

---

## Open Questions to Resolve

### Q1: Can worktrees move between boards?

**Answer:** Yes! Via drag-and-drop or Settings → Worktrees → "Move to Board"

**Implementation:**

```typescript
async function moveWorktreeToBoard(worktreeId: WorktreeID, targetBoardId: BoardID) {
  // Update worktree.board_id
  await worktreesService.patch(worktreeId, { board_id: targetBoardId });

  // Update board_object.board_id
  await boardObjectsService.patch(objectId, { board_id: targetBoardId });
}
```

---

### Q2: What about session genealogy across worktrees?

**Current Design:** Sessions can only fork/spawn within same worktree

**Future Consideration:** Cross-worktree forks

- "Fork this session into a new worktree" (advanced feature)
- Deferred to Phase 5+

---

### Q3: How do zones interact with sessions directly?

**Answer:** They don't (in new model)

**Zones → Worktrees → Sessions**

- Zones trigger worktrees
- Worktree determines which session receives trigger (via modal)
- No direct zone → session interaction

**Legacy:** Old session-based boards can still use session zones (deprecated)

---

## Success Metrics

**Phase 1 (Hybrid Support):**

- [ ] Boards display both session and worktree cards
- [ ] No regression in existing session-based workflows
- [ ] WorktreeCard renders correctly with session tree

**Phase 2 (Zone Triggers):**

- [ ] Zone drops on worktrees open ZoneTriggerModal
- [ ] Smart default selection > 80% accurate
- [ ] Template expansion works with worktree context

**Phase 3 (Migration):**

- [ ] Users successfully add worktrees to boards
- [ ] Session trees visible and interactive
- [ ] No data loss during migration

**Phase 4 (Deprecation):**

- [ ] All boards converted to worktree-centric
- [ ] Session cards removed from codebase
- [ ] Clean, maintainable architecture

---

## Implementation Timeline

**Week 1-2: Phase 0 + 1 (Data Model + Hybrid Support)**

- Add board_id to worktrees schema
- Implement WorktreeCard component
- Support dual card types on boards

**Week 3-4: Phase 2 (Zone Triggers)**

- Implement ZoneTriggerModal
- Smart default selection logic
- Template expansion

**Week 5-6: Phase 3 (UI Polish)**

- Add to board functionality
- Migration wizard
- Deprecation warnings

**Week 7+: Phase 4 (Full Migration)**

- Migrate existing boards
- Remove session card support
- Celebrate! 🎉

---

## Summary

**This is less scary than it seems!** We're adding worktree-centric boards alongside existing session-based boards, not replacing them immediately.

**Key Decisions:**

1. ✅ Worktrees belong to ONE board (not many) via `board_id`
2. ✅ Sessions MUST have worktrees (NOT NULL FK, CASCADE on delete)
3. ✅ Hybrid mode: Support both session AND worktree cards (gradual migration)
4. ✅ Zones trigger worktrees → modal → session selection
5. ✅ Sessions accessed through worktree cards (genealogy tree)
6. ✅ Deprecate session cards eventually (not immediately)

**Next Steps:**

1. Add `board_id` column to worktrees table
2. Update Worktree type
3. Implement WorktreeCard component
4. Support dual card types in BoardCanvas
5. Ship hybrid mode, gather feedback, iterate

**Philosophy:** Layer it in, don't rip and replace. Gradual migration > big bang.

---

_Ready to build the future of worktree-centric boards!_ 🚀
