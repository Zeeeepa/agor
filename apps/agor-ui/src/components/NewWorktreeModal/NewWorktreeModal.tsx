import type { Repo } from '@agor/core/types';
import { Button, Form, Modal } from 'antd';
import { useState } from 'react';
import { WorktreeFormFields } from '../WorktreeFormFields';

export interface NewWorktreeConfig {
  repoId: string;
  name: string;
  ref: string;
  createBranch: boolean;
  sourceBranch: string;
  pullLatest: boolean;
  issue_url?: string;
  pull_request_url?: string;
  board_id?: string; // Board to add worktree to after creation
}

export interface NewWorktreeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (config: NewWorktreeConfig) => void;
  repos: Repo[];
  currentBoardId?: string; // Auto-fill board if provided
}

export const NewWorktreeModal: React.FC<NewWorktreeModalProps> = ({
  open,
  onClose,
  onCreate,
  repos,
  currentBoardId,
}) => {
  const [form] = Form.useForm();
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);

  const selectedRepo = repos.find(r => r.repo_id === selectedRepoId);

  const handleValuesChange = () => {
    form
      .validateFields()
      .then(() => setIsFormValid(true))
      .catch(() => setIsFormValid(false));
  };

  const handleCreate = async () => {
    const values = await form.validateFields();

    const config: NewWorktreeConfig = {
      repoId: values.repoId,
      name: values.worktreeName,
      ref: values.ref,
      createBranch: values.createBranch || false,
      sourceBranch: values.sourceBranch || selectedRepo?.default_branch || 'main',
      pullLatest: values.pullLatest ?? true,
      issue_url: values.issue_url,
      pull_request_url: values.pull_request_url,
      board_id: currentBoardId, // Include board_id if provided
    };

    onCreate(config);
    onClose();

    // Reset form
    form.resetFields();
    setSelectedRepoId(null);
    setIsFormValid(false);
  };

  const handleCancel = () => {
    onClose();
    form.resetFields();
    setSelectedRepoId(null);
    setIsFormValid(false);
  };

  return (
    <Modal
      title="Create New Worktree"
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="create" type="primary" onClick={handleCreate} disabled={!isFormValid}>
          Create Worktree
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        style={{ marginTop: 24 }}
      >
        <WorktreeFormFields
          repos={repos}
          selectedRepoId={selectedRepoId}
          onRepoChange={setSelectedRepoId}
        />
      </Form>
    </Modal>
  );
};
