import { PlusOutlined } from '@ant-design/icons';
import { FloatButton } from 'antd';

export interface NewSessionButtonProps {
  onClick?: () => void;
  hasRepos?: boolean;
}

export const NewSessionButton: React.FC<NewSessionButtonProps> = ({ onClick, hasRepos = true }) => {
  const tooltip = hasRepos ? 'Create new worktree' : 'Create a repository first';

  return (
    <FloatButton
      icon={<PlusOutlined />}
      type="primary"
      onClick={onClick}
      tooltip={tooltip}
      style={{ right: 24, top: 80 }}
    />
  );
};
