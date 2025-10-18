import type { AgorClient } from '@agor/core/api';
import type { MCPServer, PermissionMode, User } from '@agor/core/types';
import {
  ApiOutlined,
  BranchesOutlined,
  ForkOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Divider,
  Drawer,
  Input,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React from 'react';
import type { Session } from '../../types';
import { ConversationView } from '../ConversationView';
import { CreatedByTag } from '../metadata';
import { PermissionModeSelector } from '../PermissionModeSelector';
import {
  BranchPill,
  ConceptPill,
  ForkPill,
  GitShaPill,
  MessageCountPill,
  RepoPill,
  SessionIdPill,
  SpawnPill,
  ToolCountPill,
  WorktreePill,
} from '../Pill';
import { ToolIcon } from '../ToolIcon';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Re-export PermissionMode from SDK for convenience
export type { PermissionMode };

interface SessionDrawerProps {
  client: AgorClient | null;
  session: Session | null;
  users?: User[];
  currentUserId?: string;
  mcpServers?: MCPServer[];
  sessionMcpServerIds?: string[];
  open: boolean;
  onClose: () => void;
  onSendPrompt?: (prompt: string, permissionMode?: PermissionMode) => void;
  onFork?: (prompt: string) => void;
  onSubtask?: (prompt: string) => void;
  onPermissionDecision?: (
    sessionId: string,
    requestId: string,
    taskId: string,
    allow: boolean
  ) => void;
  onOpenSettings?: (sessionId: string) => void;
  onUpdateSession?: (sessionId: string, updates: Partial<Session>) => void;
}

const SessionDrawer = ({
  client,
  session,
  users = [],
  currentUserId,
  mcpServers = [],
  sessionMcpServerIds = [],
  open,
  onClose,
  onSendPrompt,
  onFork,
  onSubtask,
  onPermissionDecision,
  onOpenSettings,
  onUpdateSession,
}: SessionDrawerProps) => {
  const { token } = theme.useToken();
  const [inputValue, setInputValue] = React.useState('');

  // Get agent-aware default permission mode (wrapped in useCallback for hook deps)
  const getDefaultPermissionMode = React.useCallback((agent?: string): PermissionMode => {
    return agent === 'codex' ? 'auto' : 'acceptEdits';
  }, []);

  const [permissionMode, setPermissionMode] = React.useState<PermissionMode>(
    session?.permission_config?.mode || getDefaultPermissionMode(session?.agentic_tool)
  );
  const [scrollToBottom, setScrollToBottom] = React.useState<(() => void) | null>(null);

  // Update permission mode when session changes
  React.useEffect(() => {
    if (session?.permission_config?.mode) {
      setPermissionMode(session.permission_config.mode);
    } else if (session?.agentic_tool) {
      // Set default based on agentic tool type if no permission mode is configured
      setPermissionMode(getDefaultPermissionMode(session.agentic_tool));
    }
  }, [session?.permission_config?.mode, session?.agentic_tool, getDefaultPermissionMode]);

  // Scroll to bottom when drawer opens
  React.useEffect(() => {
    if (open && scrollToBottom) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [open, scrollToBottom]);

  const handleSendPrompt = () => {
    if (inputValue.trim()) {
      onSendPrompt?.(inputValue, permissionMode);
      setInputValue('');
    }
  };

  const handleFork = () => {
    if (inputValue.trim()) {
      onFork?.(inputValue);
      setInputValue('');
    }
  };

  const handleSubtask = () => {
    if (inputValue.trim()) {
      onSubtask?.(inputValue);
      setInputValue('');
    }
  };

  const handlePermissionModeChange = (newMode: PermissionMode) => {
    setPermissionMode(newMode);

    // Persist to database immediately (will broadcast via WebSocket)
    if (session && onUpdateSession) {
      onUpdateSession(session.session_id, {
        permission_config: {
          ...session.permission_config,
          mode: newMode,
        },
      });
    }
  };

  const getStatusColor = () => {
    switch (session.status) {
      case 'running':
        return 'processing';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Early return if no session
  if (!session) return null;

  const isForked = !!session.genealogy.forked_from_session_id;
  const isSpawned = !!session.genealogy.parent_session_id;

  // Check if git state is dirty
  const isDirty = session.git_state.current_sha.endsWith('-dirty');
  const _cleanSha = session.git_state.current_sha.replace('-dirty', '');

  // Check if session is currently running (disable prompts to avoid confusion)
  const isRunning = session.status === 'running';

  return (
    <Drawer
      title={
        <Space size={12} align="center">
          <ToolIcon tool={session.agentic_tool} size={40} />
          <div>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {session.title || session.agentic_tool}
              </Text>
              <Badge
                status={getStatusColor()}
                text={session.status.toUpperCase()}
                style={{ marginLeft: 12 }}
              />
            </div>
            {session.created_by && (
              <div style={{ marginTop: 4 }}>
                <CreatedByTag
                  createdBy={session.created_by}
                  currentUserId={currentUserId}
                  users={users}
                  prefix="Created by"
                />
              </div>
            )}
          </div>
        </Space>
      }
      extra={
        onOpenSettings && (
          <Tooltip title="Session Settings">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => onOpenSettings(session.session_id)}
            />
          </Tooltip>
        )
      }
      placement="right"
      width={720}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          paddingBottom: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      {/* Genealogy Tags */}
      {(isForked || isSpawned) && (
        <div style={{ marginBottom: token.sizeUnit }}>
          <Space size={4} wrap>
            {isForked && session.genealogy.forked_from_session_id && (
              <ForkPill
                fromSessionId={session.genealogy.forked_from_session_id}
                taskId={session.genealogy.fork_point_task_id}
              />
            )}
            {isSpawned && session.genealogy.parent_session_id && (
              <SpawnPill
                fromSessionId={session.genealogy.parent_session_id}
                taskId={session.genealogy.spawn_point_task_id}
              />
            )}
          </Space>
        </div>
      )}

      {/* Git & Repo Info */}
      <div style={{ marginBottom: token.sizeUnit }}>
        <Space size={4} wrap>
          {session.repo?.repo_slug ? (
            <RepoPill repoName={session.repo.repo_slug} worktreeName={session.repo.worktree_name} />
          ) : session.repo?.cwd ? (
            <RepoPill repoName={session.repo.cwd.split('/').pop() || session.repo.cwd} />
          ) : null}
          {session.repo?.managed_worktree && <WorktreePill managed={true} />}
          <BranchPill branch={session.git_state.ref} />
          <GitShaPill sha={session.git_state.current_sha} isDirty={isDirty} />
        </Space>
      </div>

      {/* Concepts */}
      {session.concepts && session.concepts.length > 0 && (
        <div style={{ marginBottom: token.sizeUnit }}>
          <Title level={5}>Loaded Concepts</Title>
          <Space size={4} wrap>
            {session.concepts.map(concept => (
              <ConceptPill key={concept} name={concept} />
            ))}
          </Space>
        </div>
      )}

      {/* MCP Servers */}
      {sessionMcpServerIds.length > 0 && (
        <div style={{ marginBottom: token.sizeUnit }}>
          <Space size={4} wrap>
            {sessionMcpServerIds
              .map(serverId => mcpServers.find(s => s.mcp_server_id === serverId))
              .filter(Boolean)
              .map(server => (
                <Tag key={server?.mcp_server_id} color="purple" icon={<ApiOutlined />}>
                  {server?.display_name || server?.name}
                </Tag>
              ))}
          </Space>
        </div>
      )}

      <Divider style={{ margin: `${token.sizeUnit * 2}px 0` }} />

      {/* Task-Centric Conversation View - Scrollable */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ConversationView
          client={client}
          sessionId={session.session_id}
          agentic_tool={session.agentic_tool}
          users={users}
          currentUserId={currentUserId}
          onScrollRef={setScrollToBottom}
          onPermissionDecision={onPermissionDecision}
        />
      </div>

      {/* Input Box Footer */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorder}`,
          padding: `${token.sizeUnit * 2}px ${token.sizeUnit * 6}px`,
          marginLeft: -token.sizeUnit * 6,
          marginRight: -token.sizeUnit * 6,
          marginBottom: -token.sizeUnit * 6,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <TextArea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Send a prompt, fork, or create a subtask..."
            autoSize={{ minRows: 1, maxRows: 10 }}
            disabled={isRunning}
            onPressEnter={e => {
              if (e.shiftKey) {
                return;
              }
              e.preventDefault();
              handleSendPrompt();
            }}
          />
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size={8}>
              <SessionIdPill sessionId={session.session_id} showCopy={true} />
              <MessageCountPill count={session.message_count} />
              <ToolCountPill count={session.tool_use_count} />
            </Space>
            <Space size={8}>
              {/* Permission Mode Selector - Agentic tool-specific options */}
              <PermissionModeSelector
                value={permissionMode}
                onChange={handlePermissionModeChange}
                agentic_tool={session.agentic_tool}
                compact
                size="small"
                width={200}
              />
              {isRunning && <Spin size="small" />}
              <Button.Group>
                <Tooltip title={isRunning ? 'Session is running...' : 'Fork Session'}>
                  <Button
                    icon={<ForkOutlined />}
                    onClick={handleFork}
                    disabled={isRunning || !inputValue.trim()}
                  />
                </Tooltip>
                <Tooltip title={isRunning ? 'Session is running...' : 'Spawn Subtask'}>
                  <Button
                    icon={<BranchesOutlined />}
                    onClick={handleSubtask}
                    disabled={isRunning || !inputValue.trim()}
                  />
                </Tooltip>
                <Tooltip title={isRunning ? 'Session is running...' : 'Send Prompt'}>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendPrompt}
                    disabled={isRunning || !inputValue.trim()}
                  />
                </Tooltip>
              </Button.Group>
            </Space>
          </Space>
        </Space>
      </div>
    </Drawer>
  );
};

export default SessionDrawer;
