import type { MCPServer } from '@agor/core/types';
import { Divider, Form, Input, Modal } from 'antd';
import React from 'react';
import type { Session } from '../../types';
import { MCPServerSelect } from '../MCPServerSelect';
import type { ModelConfig } from '../ModelSelector';
import { ModelSelector } from '../ModelSelector';

export interface SessionSettingsModalProps {
  open: boolean;
  onClose: () => void;
  session: Session;
  mcpServers: MCPServer[];
  sessionMcpServerIds: string[];
  onUpdate?: (sessionId: string, updates: Partial<Session>) => void;
  onUpdateSessionMcpServers?: (sessionId: string, mcpServerIds: string[]) => void;
  onUpdateModelConfig?: (sessionId: string, modelConfig: ModelConfig) => void;
}

/**
 * Session Settings Modal
 *
 * Unified settings modal for sessions (used from both SessionCard and SessionDrawer)
 * Allows editing:
 * - Session title
 * - Claude model configuration
 * - MCP Server attachments
 */
export const SessionSettingsModal: React.FC<SessionSettingsModalProps> = ({
  open,
  onClose,
  session,
  mcpServers,
  sessionMcpServerIds,
  onUpdate,
  onUpdateSessionMcpServers,
  onUpdateModelConfig,
}) => {
  const [form] = Form.useForm();

  // Reset form values when modal opens or props change
  React.useEffect(() => {
    if (open) {
      form.setFieldsValue({
        title: session.description || '',
        mcpServerIds: sessionMcpServerIds,
        modelConfig: session.model_config,
      });
    }
  }, [open, session.description, sessionMcpServerIds, session.model_config, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      // Collect all updates
      const updates: Partial<Session> = {};

      // Update session title/description
      if (values.title !== session.description) {
        updates.description = values.title;
      }

      // Update model config
      if (values.modelConfig) {
        updates.model_config = {
          ...values.modelConfig,
          updated_at: new Date().toISOString(),
        };
      }

      // Apply session updates if any
      if (Object.keys(updates).length > 0 && onUpdate) {
        onUpdate(session.session_id, updates);
      }

      // Backward compatibility: also call onUpdateModelConfig if provided
      if (values.modelConfig && onUpdateModelConfig) {
        onUpdateModelConfig(session.session_id, values.modelConfig);
      }

      // Update MCP server attachments
      if (onUpdateSessionMcpServers) {
        onUpdateSessionMcpServers(session.session_id, values.mcpServerIds || []);
      }

      onClose();
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Session Settings"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Save"
      cancelText="Cancel"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          title: session.description || '',
          mcpServerIds: sessionMcpServerIds,
          modelConfig: session.model_config,
        }}
      >
        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: false, message: 'Please enter a session title' }]}
        >
          <Input placeholder="Enter session title" />
        </Form.Item>

        <Form.Item name="modelConfig" label="Claude Model">
          <ModelSelector />
        </Form.Item>

        <Divider />

        <Form.Item name="mcpServerIds" label="MCP Servers">
          <MCPServerSelect mcpServers={mcpServers} placeholder="No MCP servers attached" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
