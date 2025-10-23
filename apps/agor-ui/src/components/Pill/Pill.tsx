import type { SessionStatus, TaskStatus } from '@agor/core/types';
import {
  ApartmentOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  EditOutlined,
  FileTextOutlined,
  ForkOutlined,
  GithubOutlined,
  MessageOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { message, Tag, theme } from 'antd';
import type React from 'react';

/**
 * Standardized color palette for pills/badges
 * Using subset of Ant Design preset colors for consistency
 */
export const PILL_COLORS = {
  // Metadata
  message: 'blue', // Message counts
  tool: 'purple', // Tool usage
  git: 'geekblue', // Git info
  session: 'default', // Session IDs

  // Status
  success: 'green', // Completed/success
  error: 'red', // Failed/error
  warning: 'orange', // Dirty state, warnings
  processing: 'cyan', // Running/in-progress

  // Genealogy
  fork: 'cyan', // Forked sessions
  spawn: 'purple', // Spawned sessions

  // Features
  report: 'green', // Has report
  concept: 'geekblue', // Loaded concepts
  worktree: 'blue', // Managed worktree
} as const;

interface BasePillProps {
  size?: 'small' | 'default';
  style?: React.CSSProperties;
}

/**
 * Base Pill component - standardized Tag wrapper with consistent styling
 *
 * Provides:
 * - Monospace font (token.fontFamilyCode) for content
 * - Consistent icon sizing (12px)
 * - Standard Tag dimensions (22px height, 7px padding)
 * - Consistent line-height for vertical alignment
 *
 * DO NOT accept style prop - all styling is standardized internally
 */
interface PillProps {
  icon?: React.ReactNode;
  color?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  tooltip?: string;
}

export const Pill: React.FC<PillProps> = ({
  icon,
  color = 'default',
  children,
  onClick,
  tooltip,
}) => {
  const { token } = theme.useToken();

  const tag = (
    <Tag
      icon={icon}
      color={color}
      style={{
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <span style={{ fontFamily: token.fontFamilyCode, lineHeight: 1 }}>{children}</span>
    </Tag>
  );

  return tooltip ? <span title={tooltip}>{tag}</span> : tag;
};

interface MessageCountPillProps extends BasePillProps {
  count: number;
}

export const MessageCountPill: React.FC<MessageCountPillProps> = ({ count, style }) => (
  <Tag icon={<MessageOutlined />} color={PILL_COLORS.message} style={style}>
    {count} {count === 1 ? 'message' : 'messages'}
  </Tag>
);

interface ToolCountPillProps extends BasePillProps {
  count: number;
  toolName?: string;
}

export const ToolCountPill: React.FC<ToolCountPillProps> = ({ count, toolName, style }) => (
  <Tag icon={<ToolOutlined />} color={PILL_COLORS.tool} style={style}>
    {count} {toolName || 'tools'}
  </Tag>
);

interface GitShaPillProps extends BasePillProps {
  sha: string;
  isDirty?: boolean;
  showDirtyIndicator?: boolean;
}

export const GitShaPill: React.FC<GitShaPillProps> = ({
  sha,
  isDirty = false,
  showDirtyIndicator = true,
  size,
  style,
}) => {
  const { token } = theme.useToken();
  const cleanSha = sha.replace('-dirty', '');
  const displaySha = cleanSha.substring(0, 7);

  return (
    <Tag
      icon={<GithubOutlined />}
      color={isDirty && showDirtyIndicator ? PILL_COLORS.warning : PILL_COLORS.git}
      style={style}
    >
      <span style={{ fontFamily: token.fontFamilyCode }}>{displaySha}</span>
      {isDirty && showDirtyIndicator && ' (dirty)'}
    </Tag>
  );
};

interface GitStatePillProps extends BasePillProps {
  branch?: string; // Branch name (renamed from 'ref' to avoid React reserved word)
  sha: string;
  showDirtyIndicator?: boolean;
}

export const GitStatePill: React.FC<GitStatePillProps> = ({
  branch,
  sha,
  showDirtyIndicator = true,
  style,
}) => {
  const { token } = theme.useToken();
  const isDirty = sha.endsWith('-dirty');
  const cleanSha = sha.replace('-dirty', '');
  const displaySha = cleanSha.substring(0, 7);

  return (
    <Tag
      icon={<ForkOutlined />}
      color={isDirty && showDirtyIndicator ? PILL_COLORS.warning : 'cyan'}
      style={style}
    >
      {branch && <span>{branch} : </span>}
      <span style={{ fontFamily: token.fontFamilyCode }}>{displaySha}</span>
      {isDirty && showDirtyIndicator && ' (dirty)'}
    </Tag>
  );
};

interface SessionIdPillProps extends BasePillProps {
  sessionId: string;
  showCopy?: boolean;
}

export const SessionIdPill: React.FC<SessionIdPillProps> = ({
  sessionId,
  showCopy = true,
  size = 'small',
  style,
}) => {
  const { token } = theme.useToken();
  const shortId = sessionId.substring(0, 8);

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionId);
    message.success('Session ID copied to clipboard');
  };

  if (showCopy) {
    return (
      <Tag
        icon={<CopyOutlined />}
        color={PILL_COLORS.session}
        style={{ cursor: 'pointer', ...style }}
        onClick={handleCopy}
      >
        <span style={{ fontFamily: token.fontFamilyCode }}>{shortId}</span>
      </Tag>
    );
  }

  return (
    <Tag icon={<CodeOutlined />} color={PILL_COLORS.session} style={style}>
      <span style={{ fontFamily: token.fontFamilyCode }}>{shortId}</span>
    </Tag>
  );
};

interface StatusPillProps extends BasePillProps {
  status:
    | (typeof TaskStatus)[keyof typeof TaskStatus]
    | (typeof SessionStatus)[keyof typeof SessionStatus]
    | 'pending';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, style }) => {
  // Both TaskStatus and SessionStatus share the same values (completed, failed, running)
  // So we can use a single config object without duplicates
  const config: Record<string, { icon: React.ReactElement; color: string; text: string }> = {
    completed: {
      icon: <CheckCircleOutlined />,
      color: PILL_COLORS.success,
      text: 'Completed',
    },
    failed: {
      icon: <CloseCircleOutlined />,
      color: PILL_COLORS.error,
      text: 'Failed',
    },
    running: {
      icon: <ToolOutlined />,
      color: PILL_COLORS.processing,
      text: 'Running',
    },
    idle: {
      icon: <ToolOutlined />,
      color: PILL_COLORS.session,
      text: 'Idle',
    },
    pending: { icon: <ToolOutlined />, color: PILL_COLORS.session, text: 'Pending' },
  };

  const statusConfig = config[status];
  if (!statusConfig) {
    // Fallback for unknown status
    return (
      <Tag icon={<ToolOutlined />} color={PILL_COLORS.session} style={style}>
        {status}
      </Tag>
    );
  }

  return (
    <Tag icon={statusConfig.icon} color={statusConfig.color} style={style}>
      {statusConfig.text}
    </Tag>
  );
};

interface ForkPillProps extends BasePillProps {
  fromSessionId: string;
  taskId?: string;
}

export const ForkPill: React.FC<ForkPillProps> = ({ fromSessionId, taskId, style }) => (
  <Tag icon={<ForkOutlined />} color={PILL_COLORS.fork} style={style}>
    FORKED from {fromSessionId.substring(0, 7)}
    {taskId && ` at ${taskId.substring(0, 7)}`}
  </Tag>
);

interface SpawnPillProps extends BasePillProps {
  fromSessionId: string;
  taskId?: string;
}

export const SpawnPill: React.FC<SpawnPillProps> = ({ fromSessionId, taskId, style }) => (
  <Tag icon={<BranchesOutlined />} color={PILL_COLORS.spawn} style={style}>
    SPAWNED from {fromSessionId.substring(0, 7)}
    {taskId && ` at ${taskId.substring(0, 7)}`}
  </Tag>
);

interface ReportPillProps extends BasePillProps {
  reportId?: string;
}

export const ReportPill: React.FC<ReportPillProps> = ({ reportId, style }) => (
  <Tag icon={<FileTextOutlined />} color={PILL_COLORS.report} style={style}>
    {reportId ? `Report ${reportId.substring(0, 7)}` : 'Has Report'}
  </Tag>
);

interface ConceptPillProps extends BasePillProps {
  name: string;
}

export const ConceptPill: React.FC<ConceptPillProps> = ({ name, style }) => (
  <Tag color={PILL_COLORS.concept} style={style}>
    📦 {name}
  </Tag>
);

interface WorktreePillProps extends BasePillProps {
  managed?: boolean;
}

export const WorktreePill: React.FC<WorktreePillProps> = ({ managed = true, style }) => {
  const { token } = theme.useToken();

  return (
    <Tag color={PILL_COLORS.worktree} style={style}>
      <span style={{ fontFamily: token.fontFamilyCode }}>{managed ? 'Managed' : 'Worktree'}</span>
    </Tag>
  );
};

interface DirtyStatePillProps extends BasePillProps {}

export const DirtyStatePill: React.FC<DirtyStatePillProps> = ({ style }) => {
  const { token } = theme.useToken();

  return (
    <Tag icon={<EditOutlined />} color={PILL_COLORS.warning} style={style}>
      <span style={{ fontFamily: token.fontFamilyCode }}>uncommitted changes</span>
    </Tag>
  );
};

interface BranchPillProps extends BasePillProps {
  branch: string;
}

export const BranchPill: React.FC<BranchPillProps> = ({ branch, style }) => {
  const { token } = theme.useToken();

  return (
    <Tag icon={<BranchesOutlined />} color={PILL_COLORS.git} style={style}>
      <span style={{ fontFamily: token.fontFamilyCode }}>{branch}</span>
    </Tag>
  );
};

interface RepoPillProps extends BasePillProps {
  repoName: string;
  worktreeName?: string;
  onClick?: () => void;
}

export const RepoPill: React.FC<RepoPillProps> = ({
  repoName,
  worktreeName,
  onClick,
  size,
  style,
}) => {
  const { token } = theme.useToken();

  return (
    <Tag
      icon={<BranchesOutlined />}
      color="cyan"
      style={{ ...style, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <span style={{ fontFamily: token.fontFamilyCode }}>
        {repoName}
        {worktreeName && (
          <>
            {' '}
            <ApartmentOutlined style={{ fontSize: '0.85em', opacity: 0.7 }} /> {worktreeName}
          </>
        )}
      </span>
    </Tag>
  );
};
