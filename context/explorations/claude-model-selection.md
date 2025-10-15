# Claude Model Selection

## Overview

Allow users to choose which Claude model to use for sessions, with support for both:

- **Model aliases** (e.g., `claude-sonnet-4-5-latest`) - always get latest patches
- **Exact model IDs** (e.g., `claude-sonnet-4-5-20250929`) - pin to specific version

Model selection happens at the **session level** (configurable in session settings modal), and the **actual model used is captured at the task level** for auditability.

## User Experience

### Session Settings Modal

Add a "Model Selection" section with two modes:

```
┌─────────────────────────────────────────────────────┐
│ Session Settings                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Model Selection                                     │
│                                                     │
│ ○ Use model alias (recommended)                    │
│   └─ [Dropdown: Claude Sonnet 4.5 (latest)    ▼]  │
│                                                     │
│ ○ Specify exact model ID                           │
│   └─ [Text input: claude-sonnet-4-5-20250929    ] │
│                                                     │
│ ℹ️ Aliases automatically use the latest version    │
│    Exact IDs pin to a specific model release       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Dropdown Options (aliases):**

- `claude-sonnet-4-5-latest` - Claude Sonnet 4.5 (Best for coding & agents)
- `claude-opus-4-latest` - Claude Opus 4 (Most capable reasoning)
- `claude-3-7-sonnet-latest` - Claude 3.7 Sonnet (Fast & balanced)
- `claude-3-5-haiku-latest` - Claude 3.5 Haiku (Fastest)
- `claude-3-5-sonnet-latest` - Claude 3.5 Sonnet (Previous gen)

**Text Input (exact IDs):**

- User can paste any valid model ID from Anthropic's docs
- No validation (Anthropic SDK will error if invalid)
- Useful for:
  - Pinning to specific release for reproducibility
  - Testing beta/experimental models
  - Using future models not in our hardcoded list

### Default Behavior

- **New sessions**: Use `claude-sonnet-4-5-latest` (current best)
- **Imported sessions**: Preserve model from transcript if available, else default
- **Forked sessions**: Inherit parent's model setting
- **User override**: Always respected in session settings

## Data Model Changes

### Session Schema

Add `model_config` to session JSON blob:

```typescript
interface Session {
  session_id: SessionID;
  // ... existing fields

  // NEW: Model configuration (stored in JSON blob)
  model_config?: {
    // Model selection mode
    mode: 'alias' | 'exact';

    // Model identifier (alias or exact ID)
    model: string;

    // When this config was last updated
    updated_at: string;

    // Optional: User notes about why this model
    notes?: string;
  };
}
```

**Examples:**

```typescript
// Using alias (recommended)
model_config: {
  mode: 'alias',
  model: 'claude-sonnet-4-5-latest',
  updated_at: '2025-01-15T10:30:00Z'
}

// Using exact ID
model_config: {
  mode: 'exact',
  model: 'claude-sonnet-4-5-20250929',
  updated_at: '2025-01-15T10:30:00Z',
  notes: 'Pinned for reproducibility in production testing'
}
```

### Task Schema

Capture the **resolved model ID** at task creation time:

```typescript
interface Task {
  task_id: TaskID;
  session_id: SessionID;
  // ... existing fields

  // NEW: Actual model used for this task
  model?: string; // e.g., "claude-sonnet-4-5-20250929" (resolved from alias)

  // Existing metadata can include token counts
  metadata?: {
    tokens?: {
      input: number;
      output: number;
    };
    // ... other metadata
  };
}
```

**Why capture at task level?**

- **Auditability**: Know exactly which model version generated each response
- **Debugging**: If a task fails, know if it was model-related
- **Cost tracking**: Different models have different pricing
- **Reproducibility**: Can replay tasks with the same model version
- **Alias resolution**: When `claude-sonnet-4-5-latest` → `claude-sonnet-4-5-20250929`, we record the resolved ID

**Migration:**

- Existing tasks: `model` field is `null` (unknown/historical)
- New tasks: Always populated with resolved model ID

## Implementation Plan

### Phase 1: Data Model & Backend

**Files to modify:**

1. **`packages/core/src/types/index.ts`**

   ```typescript
   export interface Session {
     // ... existing fields
     model_config?: {
       mode: 'alias' | 'exact';
       model: string;
       updated_at: string;
       notes?: string;
     };
   }

   export interface Task {
     // ... existing fields
     model?: string; // Resolved model ID
   }
   ```

2. **`packages/core/src/tools/claude/models.ts`** (NEW)

   ```typescript
   export interface ClaudeModel {
     id: string; // Alias like "claude-sonnet-4-5-latest"
     displayName: string; // "Claude Sonnet 4.5"
     family: string; // "claude-4"
     description: string; // User-facing description
   }

   export const AVAILABLE_CLAUDE_MODELS: ClaudeModel[] = [
     {
       id: 'claude-sonnet-4-5-latest',
       displayName: 'Claude Sonnet 4.5',
       family: 'claude-4',
       description: 'Best for coding & complex agents',
     },
     // ... other models
   ];

   export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5-latest';
   ```

3. **`packages/core/src/tools/claude/prompt-service.ts`**
   - Change `CLAUDE_MODEL` from constant to method that reads from session
   - Resolve model at query time (alias or exact)
   - Log resolved model ID for debugging

4. **`packages/core/src/tools/claude/claude-tool.ts`**
   - Update `createAssistantMessage()` to include resolved `model` field
   - Store resolved model ID in task metadata

5. **`apps/agor-daemon/src/services/sessions.ts`**
   - Add validation for `model_config` on patch/update
   - Ensure mode is 'alias' or 'exact'

### Phase 2: UI Components

**Files to create/modify:**

1. **`apps/agor-ui/src/components/SessionSettings/ModelSelector.tsx`** (NEW)

   ```typescript
   interface ModelSelectorProps {
     value?: { mode: 'alias' | 'exact'; model: string };
     onChange: (config: { mode: 'alias' | 'exact'; model: string }) => void;
   }

   export function ModelSelector({ value, onChange }: ModelSelectorProps) {
     const [mode, setMode] = useState<'alias' | 'exact'>(value?.mode || 'alias');

     return (
       <div>
         <Radio.Group value={mode} onChange={e => setMode(e.target.value)}>
           <Radio value="alias">
             Use model alias (recommended)
             <Tooltip title="Automatically uses latest version">
               <InfoCircleOutlined />
             </Tooltip>
           </Radio>

           {mode === 'alias' && (
             <Select
               value={value?.model}
               onChange={model => onChange({ mode, model })}
               options={AVAILABLE_CLAUDE_MODELS.map(m => ({
                 value: m.id,
                 label: `${m.displayName} - ${m.description}`,
               }))}
             />
           )}

           <Radio value="exact">
             Specify exact model ID
             <Tooltip title="Pin to specific release">
               <InfoCircleOutlined />
             </Tooltip>
           </Radio>

           {mode === 'exact' && (
             <Input
               value={value?.model}
               onChange={e => onChange({ mode, model: e.target.value })}
               placeholder="claude-sonnet-4-5-20250929"
             />
           )}
         </Radio.Group>
       </div>
     );
   }
   ```

2. **`apps/agor-ui/src/components/SessionSettings/SessionSettingsModal.tsx`**
   - Add `<ModelSelector />` component
   - Wire up to session patch API

3. **`apps/agor-ui/src/components/TaskBlock/TaskBlock.tsx`**
   - Display task model in metadata (if available)
   - Show badge: "🤖 claude-sonnet-4-5-20250929"

### Phase 3: Session Service Integration

**`packages/core/src/tools/claude/prompt-service.ts` changes:**

```typescript
private async setupQuery(
  sessionId: SessionID,
  prompt: string,
  taskId?: TaskID,
  permissionMode?: PermissionMode,
  resume = true
) {
  const session = await this.sessionsRepo.findById(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  // Determine model to use
  const modelConfig = session.model_config;
  const model = modelConfig?.model || DEFAULT_CLAUDE_MODEL;

  console.log(`🤖 Using model: ${model} (mode: ${modelConfig?.mode || 'default'})`);

  const options: Record<string, unknown> = {
    cwd: session.repo.cwd,
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    settingSources: ['user', 'project'],
    model, // Use configured model
    // ...
  };

  // ... rest of setup

  return { query: result, resolvedModel: model };
}
```

**`packages/core/src/tools/claude/claude-tool.ts` changes:**

```typescript
async executePromptWithStreaming(
  sessionId: SessionID,
  prompt: string,
  taskId?: TaskID,
  permissionMode?: PermissionMode,
  streamingCallbacks?: StreamingCallbacks
): Promise<{ userMessageId: MessageID; assistantMessageIds: MessageID[] }> {
  // ... existing code ...

  // Track resolved model for task metadata
  let resolvedModel: string | undefined;

  for await (const event of this.promptService.promptSessionStreaming(
    sessionId, prompt, taskId, permissionMode
  )) {
    // Capture resolved model from first event
    if (!resolvedModel && event.resolvedModel) {
      resolvedModel = event.resolvedModel;
    }

    // ... existing event handling ...

    if (event.type === 'complete' && event.content) {
      await this.createAssistantMessage(
        sessionId,
        assistantMessageId,
        event.content,
        event.toolUses,
        taskId,
        nextIndex++,
        resolvedModel // Pass resolved model
      );
    }
  }
}

private async createAssistantMessage(
  sessionId: SessionID,
  messageId: MessageID,
  content: Array<...>,
  toolUses: Array<...> | undefined,
  taskId: TaskID | undefined,
  nextIndex: number,
  model?: string // NEW parameter
): Promise<Message> {
  const message: Message = {
    message_id: messageId,
    session_id: sessionId,
    type: 'assistant',
    role: 'assistant',
    index: nextIndex,
    timestamp: new Date().toISOString(),
    content_preview: contentPreview,
    content: content as Message['content'],
    tool_uses: toolUses,
    task_id: taskId,
    metadata: {
      model: model || ClaudeTool.CLAUDE_MODEL, // Use resolved or fallback
      tokens: {
        input: 0,
        output: 0,
      },
    },
  };

  await this.messagesService!.create(message);

  // If task exists, update it with resolved model
  if (taskId && model) {
    await this.tasksService?.patch(taskId, { model });
  }

  return message;
}
```

## Model Resolution Logic

When a session uses an alias like `claude-sonnet-4-5-latest`, the Anthropic SDK resolves it to an exact model ID (e.g., `claude-sonnet-4-5-20250929`). We need to capture this resolved ID.

**Options:**

1. **Trust the SDK** (simplest)
   - Pass alias to SDK, it handles resolution
   - We don't know the exact ID used
   - **Downside**: Can't track which specific version was used

2. **Call Models API first** (complete)
   - Fetch models list, find matching alias
   - Use exact ID from API response
   - **Downside**: Extra API call per query

3. **Capture from response metadata** (ideal)
   - SDK might include resolved model in response
   - Check `msg.model` or similar field
   - **Downside**: Need to verify SDK provides this

**Recommendation**: Start with Option 1 (trust SDK) and log the configured model. Later, investigate if SDK exposes resolved model in response metadata.

## Future Enhancements

### Cost Tracking

- Store pricing per model (tokens → USD)
- Calculate task cost based on input/output tokens + model
- Show cumulative session cost

### Model Comparison

- Run same prompt across multiple models
- Compare outputs side-by-side
- A/B test model performance

### Smart Model Selection

- Auto-downgrade to Haiku for simple tasks
- Auto-upgrade to Opus for complex reasoning
- ML-based model routing

### Model Metadata

- Fetch from Models API periodically (daily cron)
- Cache in DB with `created_at`, `display_name`
- Show "New!" badge for recently released models

## Open Questions

1. **Should we validate model strings?**
   - Pro: Catch typos early
   - Con: Breaks when new models release
   - **Recommendation**: No validation, let SDK error

2. **Should sessions inherit model from parent on fork?**
   - Pro: Consistent behavior
   - Con: User might want different model for fork
   - **Recommendation**: Yes, inherit but allow override

3. **Should we show model in session card?**
   - Pro: Quick visibility
   - Con: UI clutter
   - **Recommendation**: Show as small badge/tooltip

4. **How to handle deprecated models?**
   - Mark in UI as "(deprecated)"
   - Still allow selection (user might need it)
   - Show warning when selected

## Migration Strategy

### Existing Sessions

- No `model_config` → Use `DEFAULT_CLAUDE_MODEL` at runtime
- No schema migration needed (JSON blob is flexible)

### Existing Tasks

- `model` field is `null` → Display as "Unknown" in UI
- Cannot retroactively determine which model was used

### Rollout

1. Deploy backend changes (backward compatible)
2. Deploy UI changes (gracefully handles missing `model_config`)
3. Update documentation
4. Announce feature to users

## Testing Plan

### Unit Tests

- Model resolution logic
- Default fallback behavior
- Alias vs exact mode switching

### Integration Tests

- Create session with alias → task captures resolved model
- Create session with exact ID → task uses exact ID
- Update session model → new tasks use new model
- Fork session → child inherits model config

### Manual Testing

- Switch between alias/exact modes
- Save settings and reload
- Create tasks with different models
- Verify task metadata shows correct model

## References

- [Anthropic Models API](https://docs.claude.com/en/api/models-list)
- [Claude Agent SDK Docs](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Available Claude Models](https://docs.anthropic.com/en/docs/about-claude/models)
