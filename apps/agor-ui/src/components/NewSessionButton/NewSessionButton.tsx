import { PlusOutlined } from '@ant-design/icons';
import { FloatButton } from 'antd';

export interface NewSessionButtonProps {
  onClick?: () => void;
}

export const NewSessionButton: React.FC<NewSessionButtonProps> = ({ onClick }) => {
  return (
    <FloatButton
      icon={<PlusOutlined />}
      type="primary"
      onClick={onClick}
      tooltip="Create new worktree"
      style={{ right: 24, top: 80 }}
    />
  );
};
