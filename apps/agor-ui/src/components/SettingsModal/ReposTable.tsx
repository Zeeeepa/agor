import type { Repo } from '@agor/core/types';
import { BranchesOutlined, DeleteOutlined, FolderOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';

const { Text, Title } = Typography;

interface ReposTableProps {
  repos: Repo[];
  onDelete?: (repoId: string) => void;
  onDeleteWorktree?: (repoId: string, worktreeName: string) => void;
  onCreateWorktree?: (
    repoId: string,
    data: { name: string; ref: string; createBranch: boolean }
  ) => void;
}

export const ReposTable: React.FC<ReposTableProps> = ({
  repos,
  onDelete,
  onDeleteWorktree,
  onCreateWorktree,
}) => {
  const [createWorktreeModalOpen, setCreateWorktreeModalOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleDeleteRepo = (repoId: string) => {
    onDelete?.(repoId);
  };

  const handleDeleteWorktree = (repoId: string, worktreeName: string) => {
    onDeleteWorktree?.(repoId, worktreeName);
  };

  const handleOpenCreateWorktree = (repoId: string, defaultBranch?: string) => {
    setSelectedRepoId(repoId);
    form.setFieldsValue({
      name: '',
      ref: defaultBranch || 'main',
      createBranch: false,
    });
    setCreateWorktreeModalOpen(true);
  };

  const handleCreateWorktree = () => {
    if (!selectedRepoId) return;

    form.validateFields().then(values => {
      onCreateWorktree?.(selectedRepoId, {
        name: values.name,
        ref: values.ref,
        createBranch: values.createBranch || false,
      });
      form.resetFields();
      setCreateWorktreeModalOpen(false);
      setSelectedRepoId(null);
    });
  };

  if (repos.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="No repositories yet" style={{ marginTop: 32 }}>
          <Text type="secondary">
            Repositories are created when you create a new session with "Clone Repository" mode.
          </Text>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Repositories are created when you create a new session with "Clone Repository" mode.
        </Text>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {repos.map(repo => (
          <Card
            key={repo.repo_id}
            size="small"
            title={
              <Space>
                <FolderOutlined />
                <Text strong>{repo.name}</Text>
                {repo.managed_by_agor && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    Managed
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Popconfirm
                title="Delete repository?"
                description={
                  <>
                    <p>Are you sure you want to delete "{repo.name}"?</p>
                    {repo.managed_by_agor && (
                      <p style={{ color: '#ff4d4f' }}>
                        ⚠️ This will delete the local repository and all{' '}
                        {repo.worktrees?.length || 0} worktree(s).
                      </p>
                    )}
                  </>
                }
                onConfirm={() => handleDeleteRepo(repo.repo_id)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" size="small" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            }
          >
            {/* Repo metadata */}
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Slug:{' '}
                </Text>
                <Text code style={{ fontSize: 12 }}>
                  {repo.slug}
                </Text>
              </div>

              {repo.remote_url && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Remote:{' '}
                  </Text>
                  <Text code style={{ fontSize: 11 }}>
                    {repo.remote_url}
                  </Text>
                </div>
              )}

              {/* Worktrees section */}
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Title level={5} style={{ marginBottom: 0, fontSize: 13 }}>
                    Worktrees ({repo.worktrees?.length || 0})
                  </Title>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenCreateWorktree(repo.repo_id, repo.default_branch)}
                  >
                    New Worktree
                  </Button>
                </div>
                {repo.worktrees && repo.worktrees.length > 0 && (
                  <List
                    size="small"
                    bordered
                    dataSource={repo.worktrees}
                    renderItem={worktree => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="delete"
                            title="Delete worktree?"
                            description={
                              <>
                                <p>Delete worktree "{worktree.name}"?</p>
                                {worktree.sessions.length > 0 && (
                                  <p style={{ color: '#ff4d4f' }}>
                                    ⚠️ {worktree.sessions.length} session(s) reference this
                                    worktree.
                                  </p>
                                )}
                              </>
                            }
                            onConfirm={() => handleDeleteWorktree(repo.repo_id, worktree.name)}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<BranchesOutlined />}
                          title={
                            <Space>
                              <Text strong style={{ fontSize: 13 }}>
                                {worktree.name}
                              </Text>
                              {worktree.new_branch && (
                                <Tag color="green" style={{ fontSize: 11 }}>
                                  New Branch
                                </Tag>
                              )}
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                📍 {worktree.ref}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                💬 {worktree.sessions.length}{' '}
                                {worktree.sessions.length === 1 ? 'session' : 'sessions'}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
                {repo.worktrees && repo.worktrees.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    No worktrees yet
                  </Text>
                )}
              </div>
            </Space>
          </Card>
        ))}
      </Space>

      {/* Create Worktree Modal */}
      <Modal
        title="Create Worktree"
        open={createWorktreeModalOpen}
        onOk={handleCreateWorktree}
        onCancel={() => {
          form.resetFields();
          setCreateWorktreeModalOpen(false);
          setSelectedRepoId(null);
        }}
        okText="Create"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Worktree Name"
            name="name"
            rules={[{ required: true, message: 'Please enter a worktree name' }]}
            extra="A descriptive name for this worktree (e.g., feature-x, bugfix-123)"
          >
            <Input placeholder="my-feature" />
          </Form.Item>

          <Form.Item
            label="Branch/Ref"
            name="ref"
            rules={[{ required: true, message: 'Please enter a branch or ref' }]}
            extra="The branch or commit SHA to checkout"
          >
            <Input placeholder="main" />
          </Form.Item>

          <Form.Item name="createBranch" valuePropName="checked">
            <Checkbox>Create as new branch</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
