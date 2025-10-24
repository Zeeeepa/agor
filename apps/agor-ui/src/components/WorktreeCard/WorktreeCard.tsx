import type { Session, Task, User, Worktree } from '@agor/core/types';
import { TaskStatus } from '@agor/core/types';
import {
  BranchesOutlined,
  CloseOutlined,
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  ExpandOutlined,
  FolderOpenOutlined,
  LinkOutlined,
  PushpinFilled,
} from '@ant-design/icons';
import { App, Badge, Button, Card, Collapse, Space, Spin, Tag, Typography, theme } from 'antd';
import { useState } from 'react';
import { CreatedByTag } from '../metadata';
import { ToolIcon } from '../ToolIcon';

const WORKTREE_CARD_MAX_WIDTH = 600;

interface WorktreeCardProps {
  worktree: Worktree;
  sessions: Session[];
  tasks: Record<string, Task[]>;
  users: User[];
  currentUserId?: string;
  onTaskClick?: (taskId: string) => void;
  onSessionClick?: (sessionId: string) => void;
  onDelete?: (worktreeId: string) => void;
  onOpenSettings?: (worktreeId: string) => void;
  onUnpin?: (worktreeId: string) => void;
  isPinned?: boolean;
  zoneName?: string;
  zoneColor?: string;
  defaultExpanded?: boolean;
}

const WorktreeCard = ({
  worktree,
  sessions,
  tasks,
  users,
  currentUserId,
  onTaskClick,
  onSessionClick,
  onDelete,
  onOpenSettings,
  onUnpin,
  isPinned = false,
  zoneName,
  zoneColor,
  defaultExpanded = true,
}: WorktreeCardProps) => {
  const { modal } = App.useApp();
  const { token } = theme.useToken();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const handleDelete = () => {
    modal.confirm({
      title: 'Delete Worktree',
      content:
        'Are you sure you want to delete this worktree? This will also delete all associated sessions. This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        onDelete?.(worktree.worktree_id);
      },
    });
  };

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  // Session list content (collapsible)
  const sessionListContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sessions.length === 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          No sessions yet
        </Typography.Text>
      ) : (
        sessions.map(session => {
          const sessionTasks = tasks[session.session_id] || [];
          const isExpanded = expandedSessions.has(session.session_id);

          return (
            <div
              key={session.session_id}
              style={{
                border: `1px solid rgba(255, 255, 255, 0.1)`,
                borderRadius: 4,
                padding: 8,
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              {/* Session header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => toggleSessionExpanded(session.session_id)}
              >
                <Space size={4} align="center">
                  <ToolIcon tool={session.agentic_tool} size={20} />
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    {session.agentic_tool}
                  </Typography.Text>
                  {session.status === TaskStatus.RUNNING ? (
                    <Spin size="small" />
                  ) : (
                    <Badge
                      status={
                        session.status === TaskStatus.COMPLETED
                          ? 'success'
                          : session.status === TaskStatus.FAILED
                            ? 'error'
                            : 'default'
                      }
                    />
                  )}
                </Space>

                <Space size={4}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ExpandOutlined />}
                    onClick={e => {
                      e.stopPropagation();
                      onSessionClick?.(session.session_id);
                    }}
                    title="Open session"
                  />
                </Space>
              </div>

              {/* Session details (when expanded) */}
              {isExpanded && (
                <div style={{ marginTop: 8, paddingLeft: 24 }}>
                  {(session.title || session.description) && (
                    <Typography.Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                      {session.title || session.description}
                    </Typography.Text>
                  )}

                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    💬 {session.message_count} messages
                  </Typography.Text>

                  {sessionTasks.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        📋 {sessionTasks.length} tasks
                      </Typography.Text>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  // Session list collapse header
  const sessionListHeader = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <Typography.Text strong>Sessions</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        ({sessions.length})
      </Typography.Text>
    </div>
  );

  return (
    <Card
      style={{
        maxWidth: WORKTREE_CARD_MAX_WIDTH,
        ...(isPinned && zoneColor ? { borderColor: zoneColor, borderWidth: 1 } : {}),
      }}
      styles={{
        body: { padding: 16 },
      }}
    >
      {/* Worktree header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Space size={8} align="center">
          <div className="drag-handle" style={{ display: 'flex', alignItems: 'center' }}>
            <BranchesOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography.Text strong className="nodrag">
              {worktree.name}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {worktree.ref}
            </Typography.Text>
          </div>
        </Space>

        <Space size={4}>
          <div className="nodrag">
            {isPinned && zoneName && (
              <Tag
                icon={<PushpinFilled />}
                color="blue"
                onClick={e => {
                  e.stopPropagation();
                  onUnpin?.(worktree.worktree_id);
                }}
                style={{ cursor: 'pointer' }}
                title={`Pinned to ${zoneName} (click to unpin)`}
              >
                {zoneName}
              </Tag>
            )}
          </div>
          <Button
            type="text"
            size="small"
            icon={<DragOutlined />}
            className="drag-handle"
            title="Drag to reposition"
          />
          <div className="nodrag">
            {onOpenSettings && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  onOpenSettings(worktree.worktree_id);
                }}
                title="Edit worktree"
              />
            )}
            {onDelete && (
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  handleDelete();
                }}
                title="Delete worktree"
                danger
              />
            )}
          </div>
        </Space>
      </div>

      {/* Worktree metadata */}
      <div className="nodrag">
        {/* Created By */}
        {worktree.created_by && (
          <div style={{ marginBottom: 8 }}>
            <CreatedByTag
              createdBy={worktree.created_by}
              currentUserId={currentUserId}
              users={users}
              prefix="Created by"
            />
          </div>
        )}

        {/* Links */}
        {(worktree.issue_url || worktree.pull_request_url) && (
          <div style={{ marginBottom: 8 }}>
            <Space size={4}>
              {worktree.issue_url && (
                <Button
                  type="link"
                  size="small"
                  icon={<LinkOutlined />}
                  href={worktree.issue_url}
                  target="_blank"
                  style={{ padding: 0, height: 'auto' }}
                >
                  Issue
                </Button>
              )}
              {worktree.pull_request_url && (
                <Button
                  type="link"
                  size="small"
                  icon={<BranchesOutlined />}
                  href={worktree.pull_request_url}
                  target="_blank"
                  style={{ padding: 0, height: 'auto' }}
                >
                  PR
                </Button>
              )}
            </Space>
          </div>
        )}

        {/* Notes */}
        {worktree.notes && (
          <div style={{ marginBottom: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
              {worktree.notes}
            </Typography.Text>
          </div>
        )}
      </div>

      {/* Sessions - collapsible */}
      <div className="nodrag">
        <Collapse
          defaultActiveKey={defaultExpanded ? ['sessions'] : []}
          items={[
            {
              key: 'sessions',
              label: sessionListHeader,
              children: sessionListContent,
            },
          ]}
          ghost
          style={{ marginTop: 8 }}
        />

        {/* Footer metadata */}
        <div style={{ marginTop: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            📁 {worktree.path}
          </Typography.Text>
        </div>
      </div>
    </Card>
  );
};

export default WorktreeCard;
