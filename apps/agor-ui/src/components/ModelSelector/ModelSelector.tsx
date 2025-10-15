import { AVAILABLE_CLAUDE_MODEL_ALIASES } from '@agor/core/tools/models';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Input, Radio, Select, Space, Tooltip, Typography } from 'antd';
import { useState } from 'react';

const { Link } = Typography;

export interface ModelConfig {
  mode: 'alias' | 'exact';
  model: string;
}

export interface ModelSelectorProps {
  value?: ModelConfig;
  onChange?: (config: ModelConfig) => void;
}

/**
 * Model Selector Component
 *
 * Allows users to choose between:
 * - Model aliases (e.g., 'claude-sonnet-4-5-latest') - automatically uses latest version
 * - Exact model IDs (e.g., 'claude-sonnet-4-5-20250929') - pins to specific release
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange }) => {
  // Determine initial mode based on whether the value is in the aliases list
  // If no value provided, default to 'alias' mode (recommended)
  const isValueInAliases = value?.model
    ? AVAILABLE_CLAUDE_MODEL_ALIASES.some(m => m.id === value.model)
    : true; // Default to true when no value (will use alias mode)

  const initialMode = value?.mode || (isValueInAliases ? 'alias' : 'exact');
  const [mode, setMode] = useState<'alias' | 'exact'>(initialMode);

  const handleModeChange = (newMode: 'alias' | 'exact') => {
    setMode(newMode);
    if (onChange) {
      // When switching modes, provide a default model
      const defaultModel =
        newMode === 'alias' ? AVAILABLE_CLAUDE_MODEL_ALIASES[0].id : 'claude-sonnet-4-5-20250929';
      onChange({
        mode: newMode,
        model: value?.model || defaultModel,
      });
    }
  };

  const handleModelChange = (newModel: string) => {
    if (onChange) {
      onChange({
        mode,
        model: newModel,
      });
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Radio.Group value={mode} onChange={e => handleModeChange(e.target.value)}>
        <Space direction="vertical">
          <Radio value="alias">
            <Space>
              Use model alias (recommended)
              <Tooltip title="Automatically uses the latest version of the model">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          </Radio>

          {mode === 'alias' && (
            <div style={{ marginLeft: 24, marginTop: 8 }}>
              <Select
                value={value?.model || AVAILABLE_CLAUDE_MODEL_ALIASES[0].id}
                onChange={handleModelChange}
                style={{ width: '100%', minWidth: 400 }}
                options={AVAILABLE_CLAUDE_MODEL_ALIASES.map(m => ({
                  value: m.id,
                  label: m.id,
                }))}
              />
            </div>
          )}

          <Radio value="exact">
            <Space>
              Specify exact model ID
              <Tooltip title="Pin to a specific model release for reproducibility">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          </Radio>

          {mode === 'exact' && (
            <div style={{ marginLeft: 24, marginTop: 8 }}>
              <Input
                value={value?.model}
                onChange={e => handleModelChange(e.target.value)}
                placeholder="e.g., claude-opus-4-20250514"
                style={{ width: '100%', minWidth: 400 }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255, 255, 255, 0.45)' }}>
                Enter any model ID to pin to a specific version.{' '}
                <Link
                  href="https://docs.anthropic.com/en/docs/about-claude/models"
                  target="_blank"
                  style={{ fontSize: 12 }}
                >
                  View available models
                </Link>
              </div>
            </div>
          )}
        </Space>
      </Radio.Group>
    </Space>
  );
};
