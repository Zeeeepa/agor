/**
 * ToolUseRenderer - Displays tool invocations and results
 *
 * Renders tool_use and tool_result content blocks with:
 * - Tool output/result
 * - Error states
 * - Collapsible input parameters
 *
 * Note: This component does NOT use ThoughtChain - parent components
 * (like AgentChain) are responsible for wrapping this in ThoughtChain items.
 */

import type { Message } from '@agor/core/types';
import { Typography, theme } from 'antd';
import type React from 'react';

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
  const { input } = toolUse;
  const isError = toolResult?.is_error;

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

  // Simple content renderer (no ThoughtChain wrapper - that's handled by parent)
  return toolResult ? (
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
  ) : null;
};
