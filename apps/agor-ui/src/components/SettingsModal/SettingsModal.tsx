import type { Board, Repo } from '@agor/core/types';
import { Modal, Tabs } from 'antd';
import { BoardsTable } from './BoardsTable';
import { ReposTable } from './ReposTable';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  boards: Board[];
  repos: Repo[];
  onCreateBoard?: (board: Partial<Board>) => void;
  onUpdateBoard?: (boardId: string, updates: Partial<Board>) => void;
  onDeleteBoard?: (boardId: string) => void;
  onDeleteRepo?: (repoId: string) => void;
  onDeleteWorktree?: (repoId: string, worktreeName: string) => void;
  onCreateWorktree?: (
    repoId: string,
    data: { name: string; ref: string; createBranch: boolean }
  ) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  boards,
  repos,
  onCreateBoard,
  onUpdateBoard,
  onDeleteBoard,
  onDeleteRepo,
  onDeleteWorktree,
  onCreateWorktree,
}) => {
  return (
    <Modal
      title="Settings"
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      styles={{
        body: { padding: '24px 0' },
      }}
    >
      <Tabs
        defaultActiveKey="boards"
        items={[
          {
            key: 'boards',
            label: 'Boards',
            children: (
              <BoardsTable
                boards={boards}
                onCreate={onCreateBoard}
                onUpdate={onUpdateBoard}
                onDelete={onDeleteBoard}
              />
            ),
          },
          {
            key: 'repos',
            label: 'Repositories',
            children: (
              <ReposTable
                repos={repos}
                onDelete={onDeleteRepo}
                onDeleteWorktree={onDeleteWorktree}
                onCreateWorktree={onCreateWorktree}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
};
