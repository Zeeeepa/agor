# Frontend Guidelines

## Overview

Agor UI is a React-based interface for visualizing and managing AI agent sessions. Built with Ant Design, it emphasizes clean component design, consistent theming, and minimal custom styling.

**Tech Stack:**

- **React 18 + TypeScript + Vite** - Modern build tooling
- **Ant Design 5.x** - Component library with design token system
- **React Flow** - Session tree canvas visualization
- **FeathersJS Client** - Real-time WebSocket + REST API

## Core Design Philosophy

1. **Vanilla Ant Design First** - Use Ant Design components as-is whenever possible
2. **Token-Based Styling** - Use `theme.useToken()` for all spacing, colors, borders
3. **No CSS Files** - Eliminate separate CSS files; use inline `style=` props only when needed
4. **Minimal Custom Styles** - Prefer Ant Design's built-in component props over custom styling
5. **Dark Mode Default** - All components inherit ConfigProvider theme

## Styling Patterns

### ✅ DO: Use Design Tokens

```typescript
import { theme } from 'antd';

const MyComponent = () => {
  const { token } = theme.useToken();

  return (
    <div style={{
      padding: `${token.sizeUnit * 4}px`,  // Spacing as multiples of sizeUnit
      border: `1px solid ${token.colorBorder}`,
      background: token.colorBgContainer,
      borderRadius: token.borderRadius,
    }}>
      Content
    </div>
  );
};
```

### ❌ DON'T: Use CSS Variables or Hardcoded Values

```typescript
// ❌ DON'T use CSS variables
border: '1px solid var(--ant-color-border)';

// ❌ DON'T hardcode numbers
padding: '16px';
marginTop: 24;

// ❌ DON'T create separate CSS files
import './MyComponent.css';
```

### ✅ DO: Use Ant Design Components' Native Props

```typescript
// Prefer component props
<Space size={token.sizeUnit * 4} direction="vertical">
  <Card bordered={false} style={{ marginBottom: token.sizeUnit * 6 }}>
    Content
  </Card>
</Space>

// Use Divider instead of custom borders
<Divider />
```

### Spacing System

All spacing should use multiples of `token.sizeUnit` (typically 8px):

- `token.sizeUnit * 1` = 8px (tight)
- `token.sizeUnit * 2` = 16px (compact)
- `token.sizeUnit * 3` = 24px (standard)
- `token.sizeUnit * 4` = 32px (spacious)
- `token.sizeUnit * 6` = 48px (loose)

### Common Token Properties

**Layout:**

- `token.sizeUnit` - Base spacing unit
- `token.borderRadius` - Consistent border radius
- `token.lineHeight` - Text line height

**Colors:**

- `token.colorBorder` - Default border color
- `token.colorBgContainer` - Container background
- `token.colorBgLayout` - Layout background
- `token.colorText` - Primary text color
- `token.colorTextSecondary` - Secondary text color
- `token.colorPrimary` - Primary brand color
- `token.colorSuccess` - Success state color
- `token.colorError` - Error state color

## Context APIs

### App.useApp() for Modals/Messages

Use `App.useApp()` hook for modals and messages to ensure proper theme inheritance:

```typescript
import { App } from 'antd';

const MyComponent = () => {
  const { modal, message } = App.useApp();

  const handleDelete = () => {
    modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure?',
      okType: 'danger',
      onOk: async () => {
        await deleteItem();
        message.success('Deleted successfully');
      },
    });
  };

  return <Button onClick={handleDelete}>Delete</Button>;
};
```

**Why:** `Modal.confirm()` creates modals outside React tree and doesn't inherit ConfigProvider theme. The `App.useApp()` hook ensures proper context.

## Real-Time Updates

### WebSocket Integration

Use custom hooks for FeathersJS WebSocket subscriptions:

```typescript
import { useAgorClient, useMessages, useTasks } from '../hooks';

const MyComponent = () => {
  const client = useAgorClient();
  const { messages, loading, error } = useMessages(client, sessionId);
  const { tasks } = useTasks(client, sessionId);

  // Hooks auto-subscribe to WebSocket events and update on changes
  return <ConversationView messages={messages} tasks={tasks} />;
};
```

**Backend Event Broadcasting:**

- All service events (created, updated, patched, removed) broadcast to 'everybody' channel
- UI hooks subscribe to service events and update state automatically
- Cross-entity cleanup handled via service event hooks (e.g., removing session from boards on deletion)

**Critical: Use app.service() for Event Emission**

When calling service methods from backend code, **always use `app.service('name')`** instead of direct service instances:

```typescript
// ❌ WRONG - No events emitted
const messagesService = createMessagesService(db);
app.use('/messages', messagesService);
await messagesService.create(message); // Events NOT published!

// ✅ CORRECT - Events emitted
const messagesService = createMessagesService(db);
app.use('/messages', messagesService);
await app.service('messages').create(message); // Events published to WebSocket clients!
```

**Why:** FeathersJS only emits WebSocket events when methods are called through the app-level service proxy (`app.service('name')`), not when called directly on the service instance. Direct calls bypass the event publishing layer.

### Common Pitfall: Props Not Updating Derived State

**Problem:** Component receives updated props via WebSocket, but UI doesn't reflect changes.

**Root Cause:** React state initialized from props doesn't automatically sync when props change.

**Example (WRONG):**

```typescript
const MyCanvas = ({ sessions }: { sessions: Session[] }) => {
  // ❌ initialNodes only computed once on mount
  const initialNodes = useMemo(() => sessions.map(toNode), [sessions]);

  // ❌ nodes state initialized but never syncs with sessions changes
  const [nodes, setNodes] = useNodesState(initialNodes);

  // When sessions update via WebSocket, nodes state is stale!
  return <ReactFlow nodes={nodes} />;
};
```

**Solution:**

```typescript
const MyCanvas = ({ sessions }: { sessions: Session[] }) => {
  const initialNodes = useMemo(() => sessions.map(toNode), [sessions]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // ✅ Sync nodes when sessions change
  useEffect(() => {
    setNodes(sessions.map(toNode));
  }, [sessions, setNodes]);

  return <ReactFlow nodes={nodes} onNodesChange={onNodesChange} />;
};
```

**Key Principle:** When props come from WebSocket subscriptions, use `useEffect` to sync derived state.

## Component Structure

### Conversation View Architecture

**Task-Centric Organization:**

- Tasks are the primary organization unit
- Messages grouped within task boundaries
- Tool uses grouped into collapsible ToolBlocks (3+ sequential tools)
- Latest task expanded by default
- Progressive disclosure for older tasks

**Component Hierarchy:**

```
ConversationView
├── TaskBlock (one per task)
│   ├── MessageBlock (user/assistant messages)
│   │   └── ReactMarkdown (for assistant messages)
│   └── ToolBlock (groups 3+ sequential tool uses)
│       └── ToolUseRenderer (individual tool)
```

### Density Guidelines

Prioritize information density while maintaining readability:

- Use compact spacing (`token.sizeUnit * 1-2`)
- Collapse details by default (expand on demand)
- Remove redundant status indicators
- Group related information visually
- Use icons over text labels when clear

## Markdown Rendering

Assistant messages render as GitHub Flavored Markdown:

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {messageContent}
</ReactMarkdown>
```

**Supported:**

- Code blocks with syntax highlighting
- Tables
- Task lists
- Strikethrough
- Autolinks

## File Organization

```
apps/agor-ui/src/
├── components/          # React components (no .css files)
│   ├── ConversationView/
│   ├── SessionCard/
│   ├── TaskBlock/
│   ├── ToolBlock/
│   └── ToolUseRenderer/
├── hooks/              # Custom React hooks
│   ├── useAgorClient.ts
│   ├── useMessages.ts
│   └── useTasks.ts
├── types/              # TypeScript type definitions
└── App.tsx             # Root component with ConfigProvider
```

## Development Workflow

1. **Run core package in watch mode:**

   ```bash
   cd packages/core && pnpm dev
   ```

2. **Run UI dev server:**

   ```bash
   cd apps/agor-ui && pnpm dev
   ```

3. **TypeScript checking:**

   ```bash
   pnpm typecheck
   ```

4. **Storybook (component development):**
   ```bash
   pnpm storybook
   ```

## Key Principles

- **Type Safety:** Strict TypeScript, no `any` types
- **Accessibility:** Use semantic HTML and ARIA labels
- **Performance:** Minimize re-renders, use React.memo for expensive components
- **Testability:** Components should be testable in isolation
- **Consistency:** Follow Ant Design's design language

## Common Pitfalls

1. **Don't** create separate CSS files - use inline styles with tokens
2. **Don't** use CSS variables like `var(--ant-color-border)` - use `token.colorBorder`
3. **Don't** hardcode spacing numbers - use `token.sizeUnit` multiples
4. **Don't** use `Modal.confirm()` directly - use `App.useApp()` hook
5. **Don't** duplicate status indicators - use icons or tags, not both
