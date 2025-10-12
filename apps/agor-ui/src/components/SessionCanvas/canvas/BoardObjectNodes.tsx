/**
 * Custom React Flow node components for board objects (text labels, zones, etc.)
 */

import { theme } from 'antd';
import { useState } from 'react';
import { NodeResizer, NodeToolbar } from 'reactflow';
import type { BoardObject } from '../../types';

// Predefined color palette
const COLORS = [
  '#d9d9d9', // gray (default)
  '#ff4d4f', // red
  '#ff7a45', // orange
  '#ffa940', // yellow-orange
  '#52c41a', // green
  '#1677ff', // blue
  '#9333ea', // purple
  '#eb2f96', // pink
];

/**
 * TextNode - Inline-editable text label for canvas annotations
 */
interface TextNodeData {
  objectId: string;
  content: string;
  fontSize?: number;
  color?: string;
  background?: string;
  onUpdate?: (objectId: string, objectData: BoardObject) => void;
}

export const TextNode = ({ data, selected }: { data: TextNodeData; selected?: boolean }) => {
  const { token } = theme.useToken();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content);

  const handleSave = () => {
    setIsEditing(false);
    if (content !== data.content && data.onUpdate) {
      data.onUpdate(data.objectId, {
        type: 'text',
        x: 0, // Position will be handled by React Flow
        y: 0,
        content,
        fontSize: data.fontSize,
        color: data.color,
        background: data.background,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setContent(data.content); // Reset to original
      setIsEditing(false);
    }
  };

  const handleColorChange = (color: string) => {
    if (data.onUpdate) {
      data.onUpdate(data.objectId, {
        type: 'text',
        x: 0,
        y: 0,
        content: data.content,
        fontSize: data.fontSize,
        color,
        background: data.background,
      });
    }
  };

  return (
    <>
      <NodeToolbar isVisible={selected} position="top">
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px',
            background: token.colorBgElevated,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadius,
            boxShadow: token.boxShadowSecondary,
          }}
        >
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorChange(color)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: color,
                border:
                  data.color === color
                    ? `2px solid ${token.colorPrimary}`
                    : '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer',
                padding: 0,
              }}
              title={`Change color to ${color}`}
            />
          ))}
        </div>
      </NodeToolbar>
      <div
        style={{
          padding: '8px 12px',
          fontSize: data.fontSize || 16,
          color: data.color || token.colorText,
          background: data.background || token.colorBgElevated,
          border: `1px solid ${token.colorBorder}`,
          borderRadius: token.borderRadius,
          minWidth: '100px',
          maxWidth: '300px',
          cursor: isEditing ? 'text' : 'move',
          boxShadow: token.boxShadowSecondary,
          backdropFilter: 'blur(8px)',
        }}
        onDoubleClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="nodrag" // Prevent node drag when typing
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 'inherit',
              color: 'inherit',
              padding: 0,
            }}
          />
        ) : (
          <span>{content}</span>
        )}
      </div>
    </>
  );
};

/**
 * ZoneNode - Resizable rectangle for organizing sessions visually
 */
interface ZoneNodeData {
  objectId: string;
  label: string;
  width: number;
  height: number;
  color?: string;
  status?: string;
  onUpdate?: (objectId: string, objectData: BoardObject) => void;
}

export const ZoneNode = ({ data, selected }: { data: ZoneNodeData; selected?: boolean }) => {
  const { token } = theme.useToken();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [label, setLabel] = useState(data.label);

  const handleSaveLabel = () => {
    setIsEditingLabel(false);
    if (label !== data.label && data.onUpdate) {
      data.onUpdate(data.objectId, {
        type: 'zone',
        x: 0, // Position will be handled by React Flow
        y: 0,
        width: data.width,
        height: data.height,
        label,
        color: data.color,
        status: data.status,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveLabel();
    } else if (e.key === 'Escape') {
      setLabel(data.label); // Reset to original
      setIsEditingLabel(false);
    }
  };

  const handleColorChange = (color: string) => {
    if (data.onUpdate) {
      data.onUpdate(data.objectId, {
        type: 'zone',
        x: 0, // Position will be handled by React Flow
        y: 0,
        width: data.width,
        height: data.height,
        label: data.label,
        color,
        status: data.status,
      });
    }
  };

  const borderColor = data.color || token.colorBorder;
  const backgroundColor = data.color ? `${data.color}20` : `${token.colorBgContainer}40`; // 40 = 25% opacity in hex

  return (
    <>
      <NodeToolbar isVisible={selected} position="top">
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px',
            background: token.colorBgElevated,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadius,
            boxShadow: token.boxShadowSecondary,
          }}
        >
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorChange(color)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: color,
                border:
                  data.color === color
                    ? `2px solid ${token.colorPrimary}`
                    : '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer',
                padding: 0,
              }}
              title={`Change color to ${color}`}
            />
          ))}
        </div>
      </NodeToolbar>
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={200}
        handleStyle={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: borderColor,
        }}
        lineStyle={{
          borderColor: borderColor,
        }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `2px solid ${borderColor}`,
          borderRadius: token.borderRadiusLG,
          background: backgroundColor,
          padding: token.padding,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'none', // Let sessions behind zone be clickable
          zIndex: -1, // Zones always behind sessions
          backdropFilter: 'blur(4px)',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            cursor: isEditingLabel ? 'text' : 'move',
          }}
          onDoubleClick={() => setIsEditingLabel(true)}
        >
          {isEditingLabel ? (
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={handleSaveLabel}
              onKeyDown={handleKeyDown}
              className="nodrag" // Prevent node drag when typing
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: borderColor,
                padding: 0,
              }}
            />
          ) : (
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: borderColor,
              }}
            >
              {label}
            </h3>
          )}
        </div>
        {data.status && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: borderColor,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {data.status}
          </div>
        )}
      </div>
    </>
  );
};
