import type { Repo, Worktree } from '@agor/core/types';
import {
  CheckCircleOutlined,
  EditOutlined,
  GlobalOutlined,
  LoadingOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Space, Tag, Tooltip, theme } from 'antd';

interface EnvironmentPillProps {
  repo: Repo; // Need repo for environment_config
  worktree: Worktree; // Has environment_instance (runtime state)
  onEdit?: () => void; // Opens WorktreeModal → Environment tab
}

export function EnvironmentPill({ repo, worktree, onEdit }: EnvironmentPillProps) {
  const { token } = theme.useToken();
  const hasConfig = !!repo.environment_config;
  const env = worktree.environment_instance;

  // Get URL from backend-computed access_urls
  const environmentUrl =
    env?.access_urls && env.access_urls.length > 0 ? env.access_urls[0].url : undefined;

  // Case 1: No config at all - show grayed discovery pill
  if (!hasConfig) {
    return (
      <Tooltip title="Click to configure environment (optional)">
        <Tag
          color="default"
          style={{ cursor: 'pointer', userSelect: 'none', opacity: 0.6 }}
          onClick={e => {
            e.stopPropagation();
            onEdit?.();
          }}
        >
          <Space size={4}>
            <GlobalOutlined style={{ fontSize: 12 }} />
            <span style={{ fontFamily: token.fontFamilyCode }}>env</span>
            <EditOutlined style={{ fontSize: 12 }} />
          </Space>
        </Tag>
      </Tooltip>
    );
  }

  // Case 2 & 3: Config exists - show status
  const getStatusIcon = () => {
    if (!env || env.status === 'stopped') {
      return <StopOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />;
    }
    switch (env.status) {
      case 'running':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />;
      case 'error':
        return <WarningOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />;
      case 'starting':
      case 'stopping':
        return <LoadingOutlined style={{ fontSize: 12 }} />;
      default:
        return <StopOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />;
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const status = env?.status || 'stopped';

  // Build helpful tooltip based on state
  const getTooltipText = () => {
    if (!hasConfig) {
      return 'Click to configure environment';
    }

    switch (status) {
      case 'running':
        return environmentUrl
          ? `Running - ${environmentUrl} - click to open`
          : 'Running - click to configure';
      case 'starting':
        return environmentUrl ? `Starting... - ${environmentUrl}` : 'Starting...';
      case 'error':
        return 'Environment error - click to configure';
      case 'stopped':
      default:
        return 'Stopped - click to configure';
    }
  };

  // Determine color based on status
  const getColor = () => {
    if (!env || env.status === 'stopped') return 'default';
    switch (env.status) {
      case 'running':
        return 'geekblue';
      case 'error':
        return 'red';
      case 'starting':
      case 'stopping':
        return 'blue';
      default:
        return 'default';
    }
  };

  return (
    <Tooltip title={getTooltipText()}>
      <Tag
        color={getColor()}
        style={{ userSelect: 'none', padding: 0, overflow: 'hidden', lineHeight: '20px' }}
      >
        <Space size={0} style={{ width: '100%' }}>
          {/* Left section - clickable to open URL (when running) */}
          {env?.status === 'running' && environmentUrl ? (
            <a
              href={environmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'inherit',
                padding: '0 7px',
                textDecoration: 'none',
                height: '22px',
              }}
            >
              <Space size={4} align="center">
                {getStatusIcon()}
                <span style={{ fontFamily: token.fontFamilyCode, lineHeight: 1 }}>env</span>
              </Space>
            </a>
          ) : (
            <div
              style={{
                padding: '0 7px',
                height: '22px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Space size={4} align="center">
                {getStatusIcon()}
                <span style={{ fontFamily: token.fontFamilyCode, lineHeight: 1 }}>env</span>
              </Space>
            </div>
          )}

          {/* Edit button - always visible */}
          <EditOutlined
            onClick={handleEdit}
            style={{
              cursor: 'pointer',
              opacity: 0.7,
              padding: '0 7px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: 12,
              height: '22px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          />
        </Space>
      </Tag>
    </Tooltip>
  );
}
