import type { Meta, StoryObj } from '@storybook/react';
import { Space } from 'antd';
import {
  ConceptPill,
  DirtyStatePill,
  ForkPill,
  GitShaPill,
  MessageCountPill,
  ReportPill,
  SessionIdPill,
  SpawnPill,
  StatusPill,
  ToolCountPill,
  WorktreePill,
} from './Pill';

const meta = {
  title: 'Components/Pill',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const AllPills: Story = {
  render: () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <h3>Metadata Pills</h3>
        <Space wrap>
          <MessageCountPill count={42} />
          <MessageCountPill count={1} />
          <ToolCountPill count={15} />
          <ToolCountPill count={3} toolName="Read" />
          <SessionIdPill sessionId="0199b856-1234-5678-9abc-def012345678" showCopy={true} />
          <SessionIdPill sessionId="0199b856-1234-5678-9abc-def012345678" showCopy={false} />
        </Space>
      </div>

      <div>
        <h3>Git Pills</h3>
        <Space wrap>
          <GitShaPill sha="abc123def456" />
          <GitShaPill sha="abc123def456-dirty" isDirty={true} />
          <GitShaPill sha="abc123def456-dirty" isDirty={true} showDirtyIndicator={false} />
          <DirtyStatePill />
        </Space>
      </div>

      <div>
        <h3>Status Pills</h3>
        <Space wrap>
          <StatusPill status="completed" />
          <StatusPill status="failed" />
          <StatusPill status="running" />
          <StatusPill status="pending" />
        </Space>
      </div>

      <div>
        <h3>Genealogy Pills</h3>
        <Space wrap>
          <ForkPill fromSessionId="0199b850-d329-7893-bc1c-197cbf4f4a7f" />
          <ForkPill
            fromSessionId="0199b850-d329-7893-bc1c-197cbf4f4a7f"
            taskId="0199b851-1234-5678-9abc-def012345678"
          />
          <SpawnPill fromSessionId="0199b850-d329-7893-bc1c-197cbf4f4a7f" />
          <SpawnPill
            fromSessionId="0199b850-d329-7893-bc1c-197cbf4f4a7f"
            taskId="0199b851-1234-5678-9abc-def012345678"
          />
        </Space>
      </div>

      <div>
        <h3>Feature Pills</h3>
        <Space wrap>
          <ReportPill />
          <ReportPill reportId="0199b852-1234-5678-9abc-def012345678" />
          <ConceptPill name="authentication" />
          <ConceptPill name="database-schema" />
          <WorktreePill managed={true} />
          <WorktreePill managed={false} />
        </Space>
      </div>
    </Space>
  ),
};

export const MessageCount: Story = {
  render: () => (
    <Space>
      <MessageCountPill count={1} />
      <MessageCountPill count={42} />
      <MessageCountPill count={1337} />
    </Space>
  ),
};

export const ToolCount: Story = {
  render: () => (
    <Space>
      <ToolCountPill count={0} />
      <ToolCountPill count={5} />
      <ToolCountPill count={3} toolName="Read" />
      <ToolCountPill count={7} toolName="Edit" />
    </Space>
  ),
};

export const GitSha: Story = {
  render: () => (
    <Space>
      <GitShaPill sha="abc123def456" />
      <GitShaPill sha="abc123def456-dirty" isDirty={true} />
      <GitShaPill sha="abc123def456-dirty" isDirty={true} showDirtyIndicator={false} />
    </Space>
  ),
};

export const SessionId: Story = {
  render: () => (
    <Space>
      <SessionIdPill sessionId="0199b856-1234-5678-9abc-def012345678" showCopy={true} />
      <SessionIdPill sessionId="0199b856-1234-5678-9abc-def012345678" showCopy={false} />
    </Space>
  ),
};

export const Status: Story = {
  render: () => (
    <Space>
      <StatusPill status="completed" />
      <StatusPill status="failed" />
      <StatusPill status="running" />
      <StatusPill status="pending" />
    </Space>
  ),
};

export const Genealogy: Story = {
  render: () => (
    <Space direction="vertical">
      <Space>
        <ForkPill fromSessionId="0199b850-d329-7893-bc1c-197cbf4f4a7f" />
        <ForkPill
          fromSessionId="0199b850-d329-7893-bc1c-197cbf4f4a7f"
          taskId="0199b851-1234-5678-9abc-def012345678"
        />
      </Space>
      <Space>
        <SpawnPill fromSessionId="0199b850-d329-7893-bc1c-197cbf4f4a7f" />
        <SpawnPill
          fromSessionId="0199b850-d329-7893-bc1c-197cbf4f4a7f"
          taskId="0199b851-1234-5678-9abc-def012345678"
        />
      </Space>
    </Space>
  ),
};

export const Features: Story = {
  render: () => (
    <Space>
      <ReportPill />
      <ReportPill reportId="0199b852-1234-5678-9abc-def012345678" />
      <ConceptPill name="authentication" />
      <WorktreePill managed={true} />
      <DirtyStatePill />
    </Space>
  ),
};
