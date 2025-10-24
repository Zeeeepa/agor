# User Comments and Conversation

**Status:** Exploration / Design Proposal
**Related:** [multiplayer.md](../concepts/multiplayer.md), [websockets.md](../concepts/websockets.md), [auth.md](../concepts/auth.md)

---

## Overview

This document explores adding **human-to-human conversations and comments** to Agor. The goal is to enable team collaboration through contextual discussions—without cluttering the AI conversation interface.

**Key Question:** What should comments be attached to?

After studying Figma's implementation, we discovered that Figma comments are **spatial annotations** pinned to canvas coordinates (x, y), not just chronological threads. This raises important design questions for Agor.

### Design Question: Attachment Strategy

We need to decide what comments are attached to:

1. **Spatial (Figma-style)** - Positioned at (x, y) coordinates on board canvas
2. **Object-level** - Attached to sessions, tasks, or messages
3. **Board-level** - Chronological conversation thread (channel-style)
4. **Hybrid** - Combination of approaches

Each has significant UX and technical tradeoffs (explored below).

### Key Design Principles

1. **Contextual** - Comments should relate to specific work
2. **Non-invasive** - Toggle on/off, doesn't interfere with AI workflows
3. **Multiplayer-first** - Real-time updates via existing WebSocket infrastructure
4. **Anonymous-compatible** - Works in both authenticated and anonymous modes

---

## Attachment Strategy Exploration

### Option 1: Spatial Annotations (Figma Pattern)

**How it works:** Comments pinned to (x, y) coordinates on board canvas, visible as icons/pins.

**User Experience:**

1. User clicks "Comment" button in header → enters comment mode
2. Clicks anywhere on canvas → comment bubble appears at that location
3. Other users see comment pin at (x, y) coordinate
4. Click pin → opens comment thread in right panel
5. Comments stay at coordinates even if sessions move

**Visual Example:**

```
┌──────────────────────────────────────┐
│  Board: Auth Refactor                │
│                                      │
│  [Session A]      💬 "Check this!"  │
│                   ↑ (x:300, y:150)  │
│                                      │
│       💬 "Why OAuth?"                │
│       ↑ (x:150, y:250)               │
│                                      │
│            [Session B]  [Session C]  │
│                                      │
│  💬 "Needs review"                   │
│  ↑ (x:100, y:400)                    │
└──────────────────────────────────────┘
```

**Pros:**

- ✅ True Figma-like experience
- ✅ Spatial context preserved ("that area", "top left")
- ✅ Can comment on empty space (e.g., "add session here")
- ✅ Visual scan shows discussion hotspots

**Cons:**

- ❌ Complex UX (comment mode, pin placement)
- ❌ Sessions move → comments don't follow (confusing)
- ❌ Clutter on canvas (many pins)
- ❌ Hard to see all comments (must scan canvas)
- ❌ Doesn't work well for non-visual discussions

**Technical:**

- Store `{ x: number, y: number }` in React Flow coordinates
- Render as custom nodes on canvas
- Need "comment mode" UI state

---

### Option 2: Object-Level Comments (GitHub PR Pattern)

**How it works:** Comments attached to specific entities (sessions, tasks, messages).

**User Experience:**

1. Right-click session → "Add comment"
2. Comment appears in session's context (SessionDrawer or dedicated comments section)
3. Comments follow the object (if session moves, comments move with it)

**Visual Example:**

```
Session A (Claude Code)
├─ Task 1: Implement auth
│  └─ 💬 "Use bcrypt for hashing" (Alice, 2h ago)
├─ Task 2: Add JWT
│  ├─ 💬 "Expiry should be 15min" (Bob, 1h ago)
│  └─ 💬 "Agreed" (Alice, 30m ago)
└─ Message 12 (assistant response)
   └─ 💬 "This approach won't scale" (Charlie, 10m ago)
```

**Pros:**

- ✅ Clear context (comment belongs to specific thing)
- ✅ Follows object (session moves → comments move)
- ✅ Natural fit for code review ("comment on this task")
- ✅ Can be granular (message-level) or coarse (session-level)

**Cons:**

- ❌ Can't comment on "general board" topics
- ❌ Harder to see all comments at once
- ❌ Requires context switching (open session to see comments)
- ❌ Complex data model (comments on multiple entity types)

**Technical:**

- `session_id`, `task_id`, or `message_id` foreign keys
- Display inline in SessionDrawer or as badges on session cards
- Need UI for each attachment point

---

### Option 3: Board-Level Conversations (Slack Channel Pattern)

**How it works:** Single chronological conversation thread per board (like a Slack channel).

**User Experience:**

1. Click "Comments" in header → drawer opens with conversation
2. See all board discussions in one place (oldest → newest)
3. Reference sessions with `#session-id` syntax
4. Click reference → highlights/opens session

**Visual Example:**

```
💬 Board: Auth Refactor

Alice (2h ago):
  "Started working on JWT implementation in #0199b856"

Bob (1h ago):
  "Looks good, but check #0199c4d2 - the expiry logic needs work"

Charlie (30m ago):
  "@alice can you review the bcrypt setup in #0199d123?"

Alice (10m ago):
  "@charlie looks good! Ready to merge"
```

**Pros:**

- ✅ Simple mental model (one conversation per board)
- ✅ Easy to see all discussions in one place
- ✅ Natural for async team communication
- ✅ No spatial complexity
- ✅ Works well for general questions ("which approach is best?")

**Cons:**

- ❌ Not Figma-like (no spatial context)
- ❌ Can get noisy with many comments
- ❌ Context requires manual references (#session-id)
- ❌ Less visual than spatial pins

**Technical:**

- Simple schema: `board_id` + `content` + `created_by`
- Optional `session_id`/`task_id` for explicit links
- Parse `#session-id` references for clickable links

---

### Option 4: Hybrid Approach

**How it works:** Combine board-level conversations + optional object attachments.

**User Experience:**

1. Default: Board-level conversation (Slack-style)
2. Optional: Attach comment to session/task (shows badge on card)
3. Drawer shows all comments, with visual grouping by context

**Visual Example:**

```
💬 Board Comments                   Filter: [All] [Sessions] [General]

📌 Session #0199b856
  Alice (2h ago): "JWT implementation done"
  Bob (1h ago): "Expiry logic needs work"

💬 General
  Charlie (45m ago): "Should we use OAuth instead?"
  Alice (30m ago): "Let's stick with JWT for now"

📌 Session #0199c4d2
  Charlie (10m ago): "@alice bcrypt setup looks good"
```

**Pros:**

- ✅ Flexibility (general + specific discussions)
- ✅ Simple default (board conversations)
- ✅ Optional context (attach to sessions when needed)
- ✅ Easy to see all comments in one place

**Cons:**

- ❌ More complex UX (two modes)
- ❌ Users might not understand when to attach vs not

**Technical:**

- Same schema as Option 3, but `session_id`/`task_id` are prominently used
- UI allows tagging sessions from within comment input

---

## Recommendation: Flexible Schema + Incremental Implementation

### The Best of All Worlds

Instead of choosing one approach, we design a **flexible schema that supports all attachment types**, but implement incrementally:

**Phase 1:** Board-level conversations only (simple, fast to ship)
**Phase 2:** Session/message attachments (object-level context)
**Phase 3:** Spatial positioning (visual annotations)

This gives us:

- ✅ Future-proof data model (no migrations later)
- ✅ Simple MVP (board conversations)
- ✅ Clear upgrade path (add features incrementally)
- ✅ User choice (pick attachment type per comment)

### Why This Works

1. **Schema flexibility** - Optional foreign keys support multiple attachment types
2. **UI simplicity** - Start with single drawer, add spatial rendering later
3. **No technical debt** - Data model supports all future features
4. **Incremental value** - Ship board conversations now, enhance later

### Figma vs Agor Context

| Aspect   | Figma                       | Agor                            |
| -------- | --------------------------- | ------------------------------- |
| Content  | Static designs              | Movable session cards           |
| Feedback | Visual ("move this")        | Abstract ("why this approach?") |
| Anchors  | UI elements (buttons, text) | Sessions (already have IDs)     |
| Layout   | Fixed layout per frame      | Free-form board arrangement     |
| Use Case | Design critique             | Code review, planning           |

**Key insight:** Agor needs flexibility for both abstract discussions (board-level) AND visual annotations (spatial). Our schema supports both

---

## Data Model: Flexible Schema

### New Table: `board_comments`

**Design Philosophy:** Support ALL attachment types in schema, implement incrementally in UI.

```typescript
// Location: packages/core/src/db/schema.ts
export const boardComments = sqliteTable(
  'board_comments',
  {
    // Primary identity
    comment_id: text('comment_id', { length: 36 }).primaryKey(), // UUIDv7
    created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp_ms' }),

    // Scoping & authorship
    board_id: text('board_id', { length: 36 })
      .notNull()
      .references(() => boards.board_id, { onDelete: 'cascade' }),
    created_by: text('created_by', { length: 36 })
      .notNull()
      .references(() => users.user_id, { onDelete: 'cascade' }),

    // FLEXIBLE ATTACHMENTS (all optional except board_id)
    // Phase 1: Only board_id used (board-level conversations)
    // Phase 2: session_id, task_id, message_id for object attachments
    // Phase 3: position for spatial annotations

    session_id: text('session_id', { length: 36 }).references(() => sessions.session_id, {
      onDelete: 'set null',
    }),
    task_id: text('task_id', { length: 36 }).references(() => tasks.task_id, {
      onDelete: 'set null',
    }),
    message_id: text('message_id', { length: 36 }).references(() => messages.message_id, {
      onDelete: 'set null',
    }),

    // Content
    content: text('content').notNull(), // Markdown-supported text
    content_preview: text('content_preview').notNull(), // First 200 chars

    // SPATIAL POSITIONING (Phase 3)
    // Stored as JSON to support both absolute and relative positioning
    position: text('position', { mode: 'json' }).$type<{
      // Absolute board coordinates (React Flow coordinates)
      absolute?: { x: number; y: number };

      // OR relative to session (follows session when it moves)
      relative?: {
        session_id: string;
        offset_x: number; // Offset from session's top-left corner
        offset_y: number;
      };
    }>(),

    // Thread support (optional for V1)
    parent_comment_id: text('parent_comment_id', { length: 36 }).references(
      () => boardComments.comment_id,
      { onDelete: 'cascade' }
    ), // NULL = top-level comment

    // Metadata
    resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
    edited: integer('edited', { mode: 'boolean' }).notNull().default(false),
    mentions: text('mentions', { mode: 'json' }).$type<string[]>(), // Array of user IDs
  },
  table => ({
    boardIdx: index('board_comments_board_idx').on(table.board_id),
    sessionIdx: index('board_comments_session_idx').on(table.session_id),
    taskIdx: index('board_comments_task_idx').on(table.task_id),
    messageIdx: index('board_comments_message_idx').on(table.message_id),
    createdByIdx: index('board_comments_created_by_idx').on(table.created_by),
    parentIdx: index('board_comments_parent_idx').on(table.parent_comment_id),
    createdIdx: index('board_comments_created_idx').on(table.created_at),
  })
);
```

### Attachment Type Logic

**How the system determines where to render a comment:**

```typescript
function getCommentAttachmentType(comment: BoardComment) {
  // Most specific → least specific
  if (comment.message_id) return 'message';
  if (comment.task_id) return 'task';
  if (comment.session_id && comment.position?.relative) return 'session-spatial';
  if (comment.session_id) return 'session';
  if (comment.position?.absolute) return 'board-spatial';
  return 'board'; // Default: board-level conversation
}
```

**Attachment hierarchy:**

1. **Message-level** - Most specific (e.g., "This line of code is wrong")
2. **Task-level** - Specific to a task (e.g., "This approach won't scale")
3. **Session-spatial** - Visual pin on session (e.g., "Check this session's output")
4. **Session-level** - Attached to session (e.g., "Great work on this!")
5. **Board-spatial** - Visual pin on empty space (e.g., "Add session here")
6. **Board-level** - General conversation (e.g., "Should we use JWT?")

### TypeScript Type

```typescript
// Location: packages/core/src/types/board-comment.ts
import type { BoardID, CommentID, SessionID, TaskID, UserID } from './id';

export interface BoardComment {
  comment_id: CommentID;
  board_id: BoardID;
  created_by: UserID;
  session_id?: SessionID; // Optional context link
  task_id?: TaskID; // Optional context link
  parent_comment_id?: CommentID; // For threaded replies

  content: string; // Markdown text
  content_preview: string; // First 200 chars for list views

  resolved: boolean; // Can mark as resolved (like GitHub PR comments)
  edited: boolean; // Indicates if edited after creation
  mentions: UserID[]; // @mentioned users

  created_at: Date;
  updated_at?: Date;
}

export type BoardCommentCreate = Omit<BoardComment, 'comment_id' | 'created_at' | 'updated_at'>;
```

### Why Board-Scoped?

- **Privacy:** Comments stay within board context (future: board permissions)
- **Organization:** Conversations naturally grouped by project/feature
- **Performance:** Smaller query scope (vs. global chat)
- **Figma pattern:** Comments belong to files/boards, not global

---

## Backend Architecture

### FeathersJS Service

**Location:** `apps/agor-daemon/src/services/board-comments.ts`

```typescript
import { hooks } from '@feathersjs/feathers';
import type { Application } from '../declarations';
import { BoardCommentsRepository } from '@agor/core/db/repositories/board-comments';

export function boardComments(app: Application) {
  const repository = new BoardCommentsRepository(app.get('db'));

  app.use('/board-comments', {
    async find(params) {
      const { board_id, session_id, task_id } = params.query || {};
      return repository.findAll({ board_id, session_id, task_id });
    },

    async get(id: string) {
      return repository.findById(id);
    },

    async create(data) {
      // Extract mentions from content (e.g., "@alice" → user_id lookup)
      const mentions = extractMentions(data.content, app);
      return repository.create({ ...data, mentions });
    },

    async patch(id: string, data) {
      return repository.update(id, { ...data, edited: true });
    },

    async remove(id: string) {
      return repository.delete(id);
    },
  });

  // Register service for WebSocket events
  app.service('board-comments').hooks({
    before: {
      create: [
        // Validate board_id exists
        // Validate created_by exists (if not anonymous)
        // Auto-populate content_preview
      ],
    },
    after: {
      create: [
        // Send notifications to @mentioned users (future)
      ],
    },
  });
}
```

### WebSocket Broadcasting

**No changes needed!** Existing FeathersJS setup already broadcasts:

```typescript
// apps/agor-daemon/src/index.ts
app.publish(() => {
  return app.channel('everybody'); // All CRUD events broadcast
});
```

**Events emitted:**

- `board-comments created` - New comment
- `board-comments patched` - Comment edited
- `board-comments removed` - Comment deleted

**Future:** Board-specific channels for privacy:

```typescript
app.service('board-comments').publish('created', comment => {
  return app.channel(`board-${comment.board_id}`);
});
```

---

## UI/UX Design

### x.ant.design Components

Perfect match! Use **Ant Design X** (v1.0) atomic components:

1. **`<Conversations>`** - Main conversation list container
2. **`<Bubble>`** - Individual comment bubbles (user avatar, timestamp, content)
3. **`<Sender>`** - Input box with @ mention support
4. **`<Attachment>`** - Future: Attach images/files to comments

**Installation:**

```bash
cd apps/agor-ui
pnpm add @ant-design/x
```

**Usage Example:**

```tsx
import { Conversations, Bubble, Sender } from '@ant-design/x';

<Conversations
  items={comments.map(c => ({
    key: c.comment_id,
    avatar: getUserEmoji(c.created_by),
    name: getUserName(c.created_by),
    message: c.content,
    timestamp: new Date(c.created_at),
  }))}
/>
<Sender
  placeholder="Add a comment... Use @ to mention teammates"
  onSend={handleSend}
/>
```

### Left Drawer Component

**Location:** `apps/agor-ui/src/components/CommentsDrawer/CommentsDrawer.tsx`

```tsx
import { Drawer, Space, Button, Badge } from 'antd';
import { CommentOutlined, CloseOutlined } from '@ant-design/icons';
import { Conversations, Bubble, Sender } from '@ant-design/x';
import type { BoardComment, User } from '@agor/core/types';

interface CommentsDrawerProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  comments: BoardComment[];
  users: User[];
  currentUserId: string;
  onSendComment: (content: string, sessionId?: string, taskId?: string) => void;
  onResolveComment: (commentId: string) => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  open,
  onClose,
  boardId,
  comments,
  users,
  currentUserId,
  onSendComment,
  onResolveComment,
}) => {
  const [filter, setFilter] = React.useState<'all' | 'unresolved' | 'mentions'>('all');

  const filteredComments = React.useMemo(() => {
    switch (filter) {
      case 'unresolved':
        return comments.filter(c => !c.resolved);
      case 'mentions':
        return comments.filter(c => c.mentions?.includes(currentUserId));
      default:
        return comments;
    }
  }, [comments, filter, currentUserId]);

  return (
    <Drawer
      title={
        <Space>
          <CommentOutlined />
          Board Comments
          <Badge count={filteredComments.length} showZero={false} />
        </Space>
      }
      placement="left" // LEFT drawer (vs SessionDrawer on right)
      width={400}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Filter Tabs */}
      <Space style={{ padding: 16, borderBottom: '1px solid #303030' }}>
        <Button
          type={filter === 'all' ? 'primary' : 'text'}
          size="small"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          type={filter === 'unresolved' ? 'primary' : 'text'}
          size="small"
          onClick={() => setFilter('unresolved')}
        >
          Unresolved
        </Button>
        <Button
          type={filter === 'mentions' ? 'primary' : 'text'}
          size="small"
          onClick={() => setFilter('mentions')}
        >
          Mentions
        </Button>
      </Space>

      {/* Conversation List */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Conversations
          items={filteredComments.map(comment => {
            const user = users.find(u => u.user_id === comment.created_by);
            return {
              key: comment.comment_id,
              avatar: user?.emoji || '👤',
              name: user?.name || 'Anonymous',
              message: comment.content,
              timestamp: new Date(comment.created_at),
              actions: [
                comment.created_by === currentUserId && (
                  <Button size="small" onClick={() => onResolveComment(comment.comment_id)}>
                    {comment.resolved ? 'Unresolve' : 'Resolve'}
                  </Button>
                ),
              ],
            };
          })}
        />
      </div>

      {/* Input Box */}
      <div style={{ padding: 16, borderTop: '1px solid #303030' }}>
        <Sender
          placeholder="Add a comment... Use @ to mention teammates"
          onSend={content => onSendComment(content)}
        />
      </div>
    </Drawer>
  );
};
```

### AppHeader Toggle Button

**Location:** `apps/agor-ui/src/components/AppHeader/AppHeader.tsx`

Add comment icon button:

```tsx
import { CommentOutlined } from '@ant-design/icons';

export const AppHeader: React.FC<AppHeaderProps> = ({
  // ... existing props
  onCommentsClick, // NEW
  unreadCommentsCount = 0, // NEW
}) => {
  return (
    <Header>
      <Space>
        {/* Existing buttons... */}
        <Badge count={unreadCommentsCount} dot>
          <Button
            type="text"
            icon={<CommentOutlined />}
            onClick={onCommentsClick}
            style={{ color: '#fff' }}
            title="Board Comments"
          />
        </Badge>
        {/* ... rest of header */}
      </Space>
    </Header>
  );
};
```

### Layout Integration

**Dual drawers:** SessionDrawer (right) + CommentsDrawer (left) can be open simultaneously.

```
┌────────────────────────────────────────────────┐
│             AppHeader [💬 Comments]            │
├──────────┬────────────────────────┬────────────┤
│          │                        │            │
│ Comments │   Session Canvas       │  Session   │
│ Drawer   │   (React Flow)         │  Drawer    │
│ (LEFT)   │                        │  (RIGHT)   │
│          │                        │            │
│ 💬 All   │   [Sessions] [Zones]   │ 🤖 Claude  │
│ 💬 @me   │                        │ Conversation
│ 💬 Open  │                        │ View       │
│          │                        │            │
└──────────┴────────────────────────┴────────────┘
```

---

## Advanced Features (V2+)

### 1. Context Links

Parse content for session/task references:

```markdown
Check session #0199b856 - the auth flow works!
```

→ Renders as clickable link that:

- Highlights session on canvas
- Opens SessionDrawer

### 2. @ Mentions with Autocomplete

**Sender component enhancement:**

```tsx
<Sender
  placeholder="Add comment..."
  onSend={handleSend}
  mentionOptions={users.map(u => ({
    value: u.user_id,
    label: `${u.emoji} ${u.name}`,
  }))}
/>
```

### 3. Notifications

**Future integration:**

- Email notifications for @mentions
- In-app toast when mentioned
- Badge count for unread mentions

### 4. Rich Media

**Ant Design X `<Attachment>` component:**

- Upload images/screenshots
- Attach code snippets
- Link to external resources

### 5. Comment Threads (Nested Replies)

Use `parent_comment_id` for GitHub-style threaded discussions:

```
💬 Alice: "Should we use JWT?"
  └─ 💬 Bob: "Yes, see session #abc123"
      └─ 💬 Charlie: "Agreed!"
```

### 6. Board Permissions

**Future:** When board access control is implemented:

- Only board members see comments
- Private boards = private comments
- Public boards = public comments (read-only for non-members)

---

## React Flow Spatial Rendering (Phase 3+)

### Technical Implementation

**Question:** How do we render comment pins spatially on the canvas?

**Answer:** React Flow provides APIs to get node positions and render comments as custom nodes!

### Getting Node Positions

```typescript
import { useReactFlow } from '@xyflow/react';

function CommentPinRenderer({ comment }: { comment: BoardComment }) {
  const { getNode } = useReactFlow();

  // Calculate final position based on attachment type
  const position = React.useMemo(() => {
    if (comment.position?.absolute) {
      // Absolute board coordinates
      return comment.position.absolute;
    }

    if (comment.position?.relative) {
      // Relative to session - follows session when it moves
      const sessionNode = getNode(comment.position.relative.session_id);
      if (sessionNode) {
        return {
          x: sessionNode.position.x + comment.position.relative.offset_x,
          y: sessionNode.position.y + comment.position.relative.offset_y,
        };
      }
    }

    // Fallback: center of board
    return { x: 0, y: 0 };
  }, [comment, getNode]);

  return { position };
}
```

**Key React Flow APIs:**

- `useReactFlow()` - Hook to access React Flow instance
- `getNode(id)` - O(1) lookup of node by ID, returns `{ position: { x, y }, ... }`
- `getNodes()` - Get all nodes
- `screenToFlowPosition()` - Convert screen coords → flow coords
- `project()` - Convert screen coords → flow coords (alternative)

### Rendering Comment Pins as React Flow Nodes

**Option A: Comment pins as custom nodes**

```typescript
// Add comment nodes to React Flow nodes array
const allNodes = [
  ...sessionNodes,
  ...zoneNodes,
  ...commentNodes.map(comment => ({
    id: `comment-${comment.comment_id}`,
    type: 'comment', // Custom node type
    position: calculateCommentPosition(comment, getNode),
    data: { comment },
    draggable: false,
    selectable: true,
  })),
];

// Custom comment node component
function CommentNode({ data }: { data: { comment: BoardComment } }) {
  const { comment } = data;

  return (
    <div
      style={{
        background: '#ffeb3b',
        borderRadius: '50%',
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
      onClick={() => openCommentThread(comment)}
    >
      💬
    </div>
  );
}

// Register custom node type
const nodeTypes = {
  session: SessionNode,
  zone: ZoneNode,
  comment: CommentNode, // NEW
};
```

**Benefits:**

- ✅ Comments automatically part of React Flow coordinate system
- ✅ Pan/zoom handled automatically
- ✅ Can make draggable (reposition comments)
- ✅ Works in minimap (appears as small dots)

**Option B: Overlay layer with manual positioning**

Use DOM positioning with `getBoundingClientRect()` + coordinate conversion. More complex, not recommended.

### Absolute vs Relative Positioning

**Use Case 1: Comment on empty space (absolute)**

User clicks empty canvas → comment placed at (x, y) absolute coordinates.

```typescript
// Creating comment
const handleCanvasClick = (event: React.MouseEvent) => {
  const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });

  createComment({
    board_id,
    created_by,
    content: 'Add a session here',
    position: { absolute: flowPosition },
  });
};
```

**Behavior:** Comment stays at (x, y) even if sessions move around it.

**Use Case 2: Comment on session (relative)**

User right-clicks session → comment placed relative to session.

```typescript
// Creating comment on session
const handleSessionComment = (sessionId: string, offsetX: number, offsetY: number) => {
  createComment({
    board_id,
    session_id: sessionId,
    created_by,
    content: 'Check this output',
    position: {
      relative: {
        session_id: sessionId,
        offset_x: offsetX, // e.g., +50px from session top-left
        offset_y: offsetY, // e.g., -20px (above session)
      },
    },
  });
};
```

**Behavior:** Comment follows session when user drags it to new position!

### Comment Pin Lifecycle

```
1. User creates comment → Store in database with position
2. UI loads comments → Filter by board_id
3. Calculate positions:
   - Absolute: Use position.absolute directly
   - Relative: getNode(session_id) + offset
4. Render as React Flow nodes
5. User clicks pin → Open thread in drawer/popover
6. Session moves → Relative comments auto-update (React Flow re-renders)
```

### Performance Considerations

**Concern:** Many comment pins on canvas?

**Solution:**

- Only render comments for current board (board_id filter)
- Limit: ~50-100 comment pins per board (reasonable for team discussions)
- Use React Flow's built-in virtualization (only renders visible nodes)
- Comment drawer shows ALL comments (scrollable), canvas shows pins

**Optimization:**

```typescript
// Only render spatial comments as pins (not board-level conversations)
const spatialComments = comments.filter(c => c.position?.absolute || c.position?.relative);
const conversationComments = comments.filter(c => !c.position);
```

---

## Implementation Phases

### Phase 1: MVP (Board-Level Conversations)

- [ ] Database table `board_comments` (flexible schema)
- [ ] FeathersJS service `/board-comments`
- [ ] Repository layer with CRUD operations
- [ ] Basic CommentsDrawer component (Ant Design X)
- [ ] AppHeader toggle button
- [ ] WebSocket real-time updates
- [ ] Create/read/delete board-level comments (no attachments yet)

**Effort:** ~1-2 days

**Schema note:** Include all optional fields (session_id, position, etc.) but leave NULL in Phase 1

### Phase 2: Object Attachments

- [ ] Link comments to sessions/tasks/messages
- [ ] Parse `#session-id` references in content
- [ ] Click reference → highlight/open session
- [ ] Filter drawer by attachment type
- [ ] Badge on session cards showing comment count
- [ ] "Comment on this session" button in SessionDrawer

**Effort:** ~1 day

### Phase 3: Spatial Annotations

- [ ] "Add comment" canvas mode (Figma-style)
- [ ] Render comment pins as React Flow nodes
- [ ] Absolute positioning (empty space comments)
- [ ] Relative positioning (session-attached comments)
- [ ] Click pin → open thread in drawer/popover
- [ ] Drag to reposition (optional)

**Effort:** ~1-2 days

### Phase 4: Mentions & Notifications

- [ ] @ mention autocomplete
- [ ] Extract mentions from content
- [ ] Store in `mentions` field
- [ ] "Mentions" filter in drawer
- [ ] Optional: Email/toast notifications

**Effort:** ~1 day

### Phase 5: Advanced UX

- [ ] Threaded replies (parent_comment_id)
- [ ] Resolve/unresolve comments
- [ ] Edit comments (markdown preview)
- [ ] Attachments (images, files)
- [ ] Reactions (👍, 🎉, etc.)

**Effort:** ~1-2 days

---

## Alternative Approaches Considered

### ❌ Global Chat (Rejected)

**Why not:** Doesn't scale, loses context, not Figma-like.

### ❌ Session-Scoped Comments (Rejected)

**Why not:** Too granular, board-level discussions are common ("which session should we use?").

### ✅ Board-Scoped Comments (Chosen)

**Why:** Natural context boundary, supports future board permissions, scales well.

---

## Technical Considerations

### Anonymous Mode Compatibility

**Question:** How do comments work in anonymous mode?

**Answer:**

- `created_by` defaults to `'anonymous'` user
- All comments show as "Anonymous" with default emoji
- @ mentions disabled (no user roster)
- Works for single-user local development

### Markdown Support

Use existing markdown renderer (or add):

```bash
pnpm add react-markdown
```

```tsx
import ReactMarkdown from 'react-markdown';

<Bubble content={<ReactMarkdown>{comment.content}</ReactMarkdown>} />;
```

### Performance

**Query optimization:**

```sql
-- Index on board_id ensures fast lookups
SELECT * FROM board_comments WHERE board_id = ? ORDER BY created_at ASC;

-- Session-filtered view
SELECT * FROM board_comments WHERE board_id = ? AND session_id = ? ORDER BY created_at ASC;
```

**Expected scale:**

- 100s of comments per board (fine for SQLite)
- Real-time WebSocket broadcasting (no pagination needed for MVP)

### Testing Strategy

**Unit tests:**

- Repository CRUD operations
- Mention extraction logic

**Integration tests:**

- WebSocket event emission
- Comment creation via API

**E2E tests (Storybook):**

- CommentsDrawer interactions
- Filter tabs
- Send comment flow

---

## Open Questions

1. **Default drawer state:** Should comments drawer open by default? (No - opt-in)
2. **Keyboard shortcut:** Should there be a hotkey to toggle? (e.g., `Cmd+/`)
3. **Unread tracking:** Do we need a "last read" timestamp per user? (V2 feature)
4. **Comment ordering:** Chronological (oldest first) or reverse? (Oldest first, like Figma)
5. **Editing:** Allow editing comments? Time limit? Show edit history? (Allow editing, mark as `edited`)

---

## References

- **Ant Design X:** https://x.ant.design/components/conversations/
- **Figma Comments:** https://help.figma.com/hc/en-us/articles/360041546233-Add-comments-to-files
- **GitHub PR Comments:** https://github.com (threaded replies, resolve, reactions)
- **Agor Multiplayer:** [multiplayer.md](../concepts/multiplayer.md)
- **Agor WebSockets:** [websockets.md](../concepts/websockets.md)

---

## Summary

**User conversations is a natural extension of Agor's multiplayer vision.** We've designed a flexible system that supports multiple comment attachment strategies:

### Key Design Decisions

1. **Flexible Schema** - Single table supports board-level, object-level, AND spatial comments
2. **Incremental Implementation** - Ship board conversations first (Phase 1), add complexity later
3. **Absolute + Relative Positioning** - Spatial comments can be fixed OR follow sessions
4. **React Flow Native** - Render comment pins as custom nodes for seamless pan/zoom/minimap
5. **Ant Design X Components** - Perfect fit with `<Conversations>`, `<Bubble>`, `<Sender>`

### Why This Approach Wins

| Feature                 | Status  | Benefit                               |
| ----------------------- | ------- | ------------------------------------- |
| Board conversations     | Phase 1 | Simple MVP, instant value             |
| Session attachments     | Phase 2 | Context without spatial complexity    |
| Spatial pins (absolute) | Phase 3 | Figma-like annotations on empty space |
| Spatial pins (relative) | Phase 3 | Comments follow sessions when moved   |
| Message-level comments  | Future  | Granular code review feedback         |

### Technical Highlights

- **React Flow APIs:** `useReactFlow()` + `getNode(id)` gives us O(1) position lookups
- **Relative positioning:** Comments with `session_id` + offset follow sessions automatically
- **Custom nodes:** Comment pins render as React Flow nodes (pan/zoom/minimap just work)
- **WebSocket sync:** Existing infrastructure broadcasts comment CRUD events
- **Anonymous-compatible:** Works in local dev with `created_by: 'anonymous'`

### Next Steps

**Immediate:** Implement Phase 1 (board conversations) - ~1-2 days
**Near-term:** Add session attachments (Phase 2) - ~1 day
**Future:** Spatial annotations when user demand is clear (Phase 3) - ~1-2 days

This design future-proofs Agor for Figma-style spatial annotations while shipping immediate value with board-level conversations.
