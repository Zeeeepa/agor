import type { Repo } from '@agor/core/types';
import { BranchesOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';

const { Text } = Typography;

interface WorktreesTableProps {
  repos: Repo[];
  onDelete?: (repoId: string, worktreeName: string) => void;
}

interface WorktreeRow {
  key: string;
  repoId: string;
  repoSlug: string;
  worktreeName: string;
  ref: string;
  path: string;
  sessions: string[];
  newBranch: boolean;
}

export const WorktreesTable: React.FC<WorktreesTableProps> = ({ repos, onDelete }) => {
  // Flatten worktrees from all repos into rows
  const worktreeRows: WorktreeRow[] = repos.flatMap(repo =>
    (repo.worktrees || []).map(worktree => ({
      key: `${repo.repo_id}-${worktree.name}`,
      repoId: repo.repo_id,
      repoSlug: repo.slug,
      worktreeName: worktree.name,
      ref: worktree.ref,
      path: worktree.path,
      sessions: worktree.sessions,
      newBranch: worktree.new_branch,
    }))
  );

  const handleDelete = (repoId: string, worktreeName: string) => {
    onDelete?.(repoId, worktreeName);
  };

  const columns = [
    {
      title: 'Repository',
      dataIndex: 'repoSlug',
      key: 'repoSlug',
      width: 150,
      render: (slug: string) => (
        <Text code style={{ fontSize: 12 }}>
          {slug}
        </Text>
      ),
    },
    {
      title: 'Worktree',
      key: 'worktree',
      render: (_: unknown, row: WorktreeRow) => (
        <Space direction="vertical" size={4}>
          <Space>
            <BranchesOutlined />
            <Text strong>{row.worktreeName}</Text>
            {row.newBranch && (
              <Tag color="green" style={{ fontSize: 11 }}>
                New Branch
              </Tag>
            )}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.ref}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => (
        <Text type="secondary" code style={{ fontSize: 11 }}>
          {path}
        </Text>
      ),
    },
    {
      title: 'Sessions',
      dataIndex: 'sessions',
      key: 'sessions',
      width: 100,
      render: (sessions: string[]) => sessions?.length || 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, row: WorktreeRow) => (
        <Popconfirm
          title="Delete worktree?"
          description={
            <>
              <p>Are you sure you want to delete worktree "{row.worktreeName}"?</p>
              {row.sessions.length > 0 && (
                <p style={{ color: '#ff4d4f' }}>
                  ⚠️ {row.sessions.length} session(s) reference this worktree.
                </p>
              )}
            </>
          }
          onConfirm={() => handleDelete(row.repoId, row.worktreeName)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Worktrees are created when you create a new session with "New Worktree" or "Clone
          Repository" mode.
        </Text>
      </div>

      <Table
        dataSource={worktreeRows}
        columns={columns}
        rowKey="key"
        pagination={false}
        size="small"
      />
    </div>
  );
};
