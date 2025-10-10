# WebSocket Real-Time Communication

**Status:** Implemented (v0.1) + Future Design
**Related:** [architecture.md](architecture.md)

## Overview

Agor uses FeathersJS with Socket.io for real-time bidirectional communication between the daemon and clients (UI, CLI). All CRUD operations on services (sessions, tasks, messages, boards, repos) emit WebSocket events that clients can subscribe to.

---

## Current Implementation (v0.1)

### Architecture

**Single global channel broadcasting all events to all connected clients:**

```
┌─────────────┐
│   Daemon    │
│  :3030      │
└──────┬──────┘
       │
       │ 'everybody' channel
       ├─────────────┬─────────────┬─────────────┐
       │             │             │             │
   ┌───▼───┐    ┌───▼───┐    ┌───▼───┐    ┌───▼───┐
   │ UI #1 │    │ UI #2 │    │ CLI   │    │ UI #3 │
   │ :5173 │    │ :5173 │    │       │    │ :5173 │
   └───────┘    └───────┘    └───────┘    └───────┘
      ↑            ↑            ↑            ↑
      └────────────┴────────────┴────────────┘
           All receive ALL events
```

### Configuration

**File:** `apps/agor-daemon/src/index.ts`

```typescript
// Configure Socket.io with CORS
app.configure(
  socketio({
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
  })
);

// Join all connections to 'everybody' channel
app.on('connection', connection => {
  app.channel('everybody').join(connection);
});

// Publish all events to all clients
app.publish(() => {
  return app.channel('everybody');
});
```

### Event Flow

**Example: Progressive message streaming**

1. **Client action:** UI sends prompt to `/sessions/:id/prompt`
2. **Backend:** Daemon creates task, returns immediately with `taskId`
3. **Background execution:** `setImmediate()` executes prompt without blocking HTTP response
4. **Agent SDK streaming:** As Agent SDK yields messages, daemon creates them one-by-one
5. **Event emission:** Each `messagesService.create()` emits `'created'` event
6. **WebSocket broadcast:** FeathersJS publishes to `app.channel('everybody')`
7. **Client reception:** UI receives events progressively in real-time
8. **State update:** `useMessages` hook + `flushSync()` forces immediate React render

### Supported Events

Each service emits CRUD events:

| Service     | Events                                     | Description                    |
| ----------- | ------------------------------------------ | ------------------------------ |
| `/sessions` | `created`, `patched`, `updated`, `removed` | Session lifecycle              |
| `/tasks`    | `created`, `patched`, `updated`, `removed` | Task lifecycle                 |
| `/messages` | `created`, `patched`, `updated`, `removed` | Message creation (progressive) |
| `/boards`   | `created`, `patched`, `updated`, `removed` | Board lifecycle                |
| `/repos`    | `created`, `patched`, `updated`, `removed` | Repository management          |

### Client Subscription Pattern

**File:** `apps/agor-ui/src/hooks/useMessages.ts`

```typescript
// Subscribe to message events for specific session
const messagesService = client.service('messages');

const handleMessageCreated = (message: Message) => {
  if (message.session_id === sessionId) {
    // Use flushSync to bypass React 18 automatic batching
    flushSync(() => {
      setMessages(prev => {
        if (prev.some(m => m.message_id === message.message_id)) {
          return prev; // Avoid duplicates
        }
        // CRITICAL: Create NEW array for React useMemo to detect changes
        return [...prev, message].sort((a, b) => a.index - b.index);
      });
    });
  }
};

messagesService.on('created', handleMessageCreated);
// ... other events

// Cleanup
return () => {
  messagesService.removeListener('created', handleMessageCreated);
  // ... other listeners
};
```

**Critical React pattern:**

```typescript
// ❌ WRONG - mutates array in place, breaks useMemo
return newMessages.sort((a, b) => a.index - b.index);

// ✅ CORRECT - creates new array, triggers re-render
return [...newMessages].sort((a, b) => a.index - b.index);
```

### Limitations

**Current architecture is simple but not scalable:**

1. **No segmentation** - All clients receive all events
2. **No privacy** - Can't restrict events to users/teams
3. **No filtering** - Clients must filter client-side
4. **Bandwidth waste** - 1000 sessions × 10 clients = 10k unnecessary messages

---

## Future: Board-Based Channels (v0.2+)

### Architecture

**Multiple named channels, one per board:**

```
┌─────────────────────────────────────────────────┐
│              Daemon :3030                        │
├─────────────┬──────────────┬────────────────────┤
│ Channel:    │ Channel:     │ Channel:           │
│ board-123   │ board-456    │ board-789          │
└──────┬──────┴──────┬───────┴──────┬─────────────┘
       │             │              │
   ┌───▼───┐    ┌───▼───┐     ┌────▼────┐
   │ UI #1 │    │ UI #2 │     │ UI #3   │
   │Board  │    │Board  │     │Board    │
   │ 123   │    │ 456   │     │ 789     │
   └───────┘    └───────┘     └─────────┘
```

### Benefits

1. **Scalability** - Clients only receive relevant events
2. **Privacy** - Board-level access control
3. **Bandwidth efficiency** - Dramatic traffic reduction
4. **Server efficiency** - Target only interested clients

---

## Future: Multiplayer Features (v0.3+)

### Presence Awareness

- User roster (who's viewing this board)
- Selection highlighting (which sessions others are viewing)
- Cursor tracking (real-time cursor positions)
- Typing indicators
- Activity feed

### Implementation Strategy

```typescript
// Presence service
interface UserPresence {
  userId: string;
  boardId: string;
  cursorPosition?: { x: number; y: number };
  selectedSessionId?: string;
  lastActive: Date;
}

// Broadcast only to same board
app.service('presence').publish('updated', presence => {
  return app.channel(`board-${presence.boardId}`);
});
```

---

## Related Documents

- [architecture.md](architecture.md) - Overall system architecture
- [frontend-guidelines.md](frontend-guidelines.md) - React patterns

---

## References

- [FeathersJS Channels API](https://feathersjs.com/api/channels.html)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Figma Multiplayer Architecture](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
