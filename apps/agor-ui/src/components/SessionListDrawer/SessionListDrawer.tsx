import type { Board, Session, Worktree } from '@agor/core/types';
import { SearchOutlined } from '@ant-design/icons';
import { Badge, Drawer, Input, List, Select, Space, Typography, theme } from 'antd';
import type React from 'react';
import { useMemo, useState } from 'react';

const { Title } = Typography;
const { useToken } = theme;

interface SessionListDrawerProps {
  open: boolean;
  onClose: () => void;
  boards: Board[];
  currentBoardId: string;
  onBoardChange: (boardId: string) => void;
  sessions: Session[];
  worktrees: Worktree[];
  onSessionClick: (sessionId: string) => void;
}

export const SessionListDrawer: React.FC<SessionListDrawerProps> = ({
  open,
  onClose,
  boards,
  currentBoardId,
  onBoardChange,
  sessions,
  worktrees,
  onSessionClick,
}) => {
  const { token } = useToken();
  const [searchQuery, setSearchQuery] = useState('');

  // Get current board
  const currentBoard = boards.find(b => b.board_id === currentBoardId);

  // Filter sessions by current board (worktree-centric model)
  const boardSessions = useMemo(() => {
    // Get worktrees for this board
    const boardWorktrees = worktrees.filter(wt => wt.board_id === currentBoardId);
    const boardWorktreeIds = new Set(boardWorktrees.map(wt => wt.worktree_id));

    // Get sessions for these worktrees
    return sessions.filter(
      session => session.worktree_id && boardWorktreeIds.has(session.worktree_id)
    );
  }, [sessions, worktrees, currentBoardId]);

  // Filter sessions by search query
  const filteredSessions = boardSessions.filter(
    session =>
      session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.agentic_tool.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
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

  const getAgentIcon = (agent: string) => {
    const agentIcons: Record<string, string> = {
      'claude-code': '🤖',
      cursor: '✏️',
      codex: '💻',
      gemini: '💎',
    };
    return agentIcons[agent] || '🤖';
  };

  return (
    <Drawer
      title={null}
      placement="left"
      width={400}
      open={open}
      onClose={onClose}
      styles={{
        body: { padding: 0 },
      }}
    >
      {/* Board Switcher Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${token.colorBorder}`,
        }}
      >
        <Title level={5} style={{ marginBottom: 8 }}>
          Board
        </Title>
        <Select
          style={{ width: '100%' }}
          value={currentBoardId}
          onChange={onBoardChange}
          options={boards.map(board => ({
            label: `${board.icon || '📋'} ${board.name}`,
            value: board.board_id,
          }))}
        />
      </div>

      {/* Search Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${token.colorBorder}`,
        }}
      >
        <Input
          placeholder="Search sessions..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      {/* Session List */}
      <div style={{ padding: '8px 0' }}>
        <List
          dataSource={filteredSessions}
          locale={{ emptyText: 'No sessions in this board' }}
          renderItem={session => (
            <List.Item
              style={{
                cursor: 'pointer',
                padding: '12px 24px',
                transition: 'background 0.2s',
              }}
              onClick={() => {
                onSessionClick(session.session_id);
                onClose();
              }}
            >
              <List.Item.Meta
                avatar={<span style={{ fontSize: 24 }}>{getAgentIcon(session.agentic_tool)}</span>}
                title={
                  <Space size={8}>
                    <Typography.Text strong>
                      {session.title || session.description || session.agentic_tool}
                    </Typography.Text>
                    <Badge status={getStatusColor(session.status)} />
                  </Space>
                }
                description={
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {session.agentic_tool} • {session.tasks.length}{' '}
                      {session.tasks.length === 1 ? 'task' : 'tasks'}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      📍 {session.git_state.ref}
                    </Typography.Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </div>

      {/* Board Info Footer */}
      {currentBoard && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            borderTop: `1px solid ${token.colorBorder}`,
            background: token.colorBgContainer,
          }}
        >
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {filteredSessions.length} of {boardSessions.length} sessions
            {currentBoard.description && ` • ${currentBoard.description}`}
          </Typography.Text>
        </div>
      )}
    </Drawer>
  );
};

export default SessionListDrawer;
