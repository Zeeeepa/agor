/**
 * ToolUseRenderer - Displays tool invocations and results
 *
 * Renders tool_use and tool_result content blocks with:
 * - Tool name and icon
 * - Collapsible input parameters
 * - Tool output/result
 * - Error states
 * - Syntax highlighting for code
 */

import type { Message } from '@agor/core/types';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ThoughtChainProps } from '@ant-design/x';
import { ThoughtChain } from '@ant-design/x';
import { Typography, theme } from 'antd';
import type React from 'react';
import { ToolIcon } from '../ToolIcon';

const { Paragraph } = Typography;

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

type ContentBlock = { type: 'text'; text: string } | ToolUseBlock | ToolResultBlock;

interface ToolUseRendererProps {
  /**
   * Tool use block with invocation details
   */
  toolUse: ToolUseBlock;

  /**
   * Optional tool result block
   */
  toolResult?: ToolResultBlock;
}

export const ToolUseRenderer: React.FC<ToolUseRendererProps> = ({ toolUse, toolResult }) => {
  const { token } = theme.useToken();
  const { name, input } = toolUse;
  const isError = toolResult?.is_error;

  // Determine status for ThoughtChain
  const getStatus = (): ThoughtChainProps['items'][number]['status'] => {
    if (!toolResult) return 'pending';
    return isError ? 'error' : 'success';
  };

  // Generate smart description for tools
  const getToolDescription = (): string | null => {
    // Use explicit description if provided
    if (typeof input.description === 'string') {
      return input.description;
    }

    // Generate descriptions for common tools
    switch (name) {
      case 'Read':
        if (input.file_path) {
          // Try to make path relative (strip common prefixes)
          const path = String(input.file_path);
          const relativePath = path
            .replace(/^\/Users\/[^/]+\/code\/[^/]+\//, '') // Strip /Users/max/code/agor/
            .replace(/^\/Users\/[^/]+\//, '~/'); // Or make it ~/...
          return relativePath;
        }
        return null;

      case 'Write':
        if (input.file_path) {
          const path = String(input.file_path);
          const relativePath = path
            .replace(/^\/Users\/[^/]+\/code\/[^/]+\//, '')
            .replace(/^\/Users\/[^/]+\//, '~/');
          return `Write ${relativePath}`;
        }
        return null;

      case 'Edit':
        if (input.file_path) {
          const path = String(input.file_path);
          const relativePath = path
            .replace(/^\/Users\/[^/]+\/code\/[^/]+\//, '')
            .replace(/^\/Users\/[^/]+\//, '~/');
          return `Edit ${relativePath}`;
        }
        return null;

      case 'Grep':
        if (input.pattern) {
          return `Search: ${input.pattern}`;
        }
        return null;

      case 'Glob':
        if (input.pattern) {
          return `Find files: ${input.pattern}`;
        }
        return null;

      default:
        return null;
    }
  };

  const description = getToolDescription();

  // Extract text content from tool result
  const getResultText = (): string => {
    if (!toolResult) return '';

    if (typeof toolResult.content === 'string') {
      return toolResult.content;
    }

    if (Array.isArray(toolResult.content)) {
      return toolResult.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map(block => block.text)
        .join('\n\n');
    }

    return '';
  };

  const resultText = getResultText();

  // Build ThoughtChain item
  const thoughtChainItem: ThoughtChainProps['items'][number] = {
    title: (
      <div style={{ display: 'flex', alignItems: 'center', gap: token.sizeUnit / 2 }}>
        <ToolIcon tool={name} size={16} />
        <span>{name}</span>
      </div>
    ),
    description: description || undefined,
    status: getStatus(),
    icon: toolResult ? (
      isError ? (
        <CloseCircleOutlined style={{ color: token.colorError }} />
      ) : (
        <CheckCircleOutlined style={{ color: token.colorSuccess }} />
      )
    ) : undefined,
    content: toolResult ? (
      <div>
        {/* Tool result */}
        <div
          style={{
            padding: token.sizeUnit,
            borderRadius: token.borderRadius,
            background: isError ? 'rgba(255, 77, 79, 0.05)' : 'rgba(82, 196, 26, 0.05)',
            border: `1px solid ${isError ? token.colorErrorBorder : token.colorSuccessBorder}`,
          }}
        >
          <Paragraph
            ellipsis={{ rows: 10, expandable: true, symbol: 'show more' }}
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              margin: 0,
            }}
          >
            {resultText}
          </Paragraph>
        </div>

        {/* Tool input parameters (collapsible below result) */}
        <details style={{ marginTop: token.sizeUnit }}>
          <summary style={{ cursor: 'pointer', fontSize: 11, color: token.colorTextSecondary }}>
            Show input parameters
          </summary>
          <pre
            style={{
              marginTop: token.sizeUnit / 2,
              background: token.colorBgLayout,
              padding: token.sizeUnit,
              borderRadius: token.borderRadius,
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, Consolas, source-code-pro, monospace',
              fontSize: 10,
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(input, null, 2)}
          </pre>
        </details>
      </div>
    ) : undefined,
  };

  return (
    <ThoughtChain items={[thoughtChainItem]} style={{ margin: `${token.sizeUnit / 2}px 0` }} />
  );
};
