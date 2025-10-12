/**
 * Hook for managing board objects (text labels, zones, etc.)
 */

import type { AgorClient } from '@agor/core/api';
import { useCallback } from 'react';
import type { Node } from 'reactflow';
import type { Board, BoardObject } from '../../../types';

interface UseBoardObjectsProps {
  board: Board | null;
  client: AgorClient | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export const useBoardObjects = ({ board, client, setNodes }: UseBoardObjectsProps) => {
  /**
   * Update an existing board object
   */
  const handleUpdateObject = useCallback(
    async (objectId: string, objectData: BoardObject) => {
      if (!board || !client) return;

      try {
        await client.service('boards').patch(board.board_id, {
          _action: 'upsertObject',
          objectId,
          objectData,
        });
      } catch (error) {
        console.error('Failed to update object:', error);
      }
    },
    [board, client]
  );

  /**
   * Convert board.objects to React Flow nodes
   */
  const getBoardObjectNodes = useCallback((): Node[] => {
    if (!board?.objects) return [];

    return Object.entries(board.objects).map(([objectId, objectData]) => {
      if (objectData.type === 'text') {
        return {
          id: objectId,
          type: 'text',
          position: { x: objectData.x, y: objectData.y },
          draggable: true,
          data: {
            objectId,
            content: objectData.content,
            fontSize: objectData.fontSize,
            color: objectData.color,
            background: objectData.background,
            onUpdate: handleUpdateObject,
          },
        };
      }

      // Zone node
      return {
        id: objectId,
        type: 'zone',
        position: { x: objectData.x, y: objectData.y },
        draggable: true,
        style: {
          width: objectData.width,
          height: objectData.height,
          zIndex: -1, // Zones behind everything
        },
        data: {
          objectId,
          label: objectData.label,
          width: objectData.width,
          height: objectData.height,
          color: objectData.color,
          status: objectData.status,
          onUpdate: handleUpdateObject,
        },
      };
    });
  }, [board?.objects, handleUpdateObject]);

  /**
   * Add a text node at the specified position
   */
  const addTextNode = useCallback(
    async (x: number, y: number) => {
      if (!board || !client) return;

      const objectId = `text-${Date.now()}`;

      // Optimistic update
      setNodes(nodes => [
        ...nodes,
        {
          id: objectId,
          type: 'text',
          position: { x, y },
          draggable: true,
          data: {
            objectId,
            content: 'New text...',
            fontSize: 16,
            onUpdate: handleUpdateObject,
          },
        },
      ]);

      // Persist atomically
      try {
        await client.service('boards').patch(board.board_id, {
          _action: 'upsertObject',
          objectId,
          objectData: {
            type: 'text',
            x,
            y,
            content: 'New text...',
            fontSize: 16,
          },
        });
      } catch (error) {
        console.error('Failed to add text node:', error);
        // Rollback
        setNodes(nodes => nodes.filter(n => n.id !== objectId));
      }
    },
    [board, client, setNodes, handleUpdateObject]
  );

  /**
   * Add a zone node at the specified position
   */
  const addZoneNode = useCallback(
    async (x: number, y: number) => {
      if (!board || !client) return;

      const objectId = `zone-${Date.now()}`;
      const width = 400;
      const height = 600;

      // Optimistic update
      setNodes(nodes => [
        ...nodes,
        {
          id: objectId,
          type: 'zone',
          position: { x, y },
          draggable: true,
          style: {
            width,
            height,
            zIndex: -1,
          },
          data: {
            objectId,
            label: 'New Zone',
            width,
            height,
            color: '#d9d9d9',
            onUpdate: handleUpdateObject,
          },
        },
      ]);

      // Persist atomically
      try {
        await client.service('boards').patch(board.board_id, {
          _action: 'upsertObject',
          objectId,
          objectData: {
            type: 'zone',
            x,
            y,
            width,
            height,
            label: 'New Zone',
            color: '#d9d9d9',
          },
        });
      } catch (error) {
        console.error('Failed to add zone node:', error);
        // Rollback
        setNodes(nodes => nodes.filter(n => n.id !== objectId));
      }
    },
    [board, client, setNodes, handleUpdateObject]
  );

  /**
   * Delete a board object
   */
  const deleteObject = useCallback(
    async (objectId: string) => {
      if (!board || !client) return;

      // Optimistic removal
      setNodes(nodes => nodes.filter(n => n.id !== objectId));

      try {
        await client.service('boards').patch(board.board_id, {
          _action: 'removeObject',
          objectId,
        });
      } catch (error) {
        console.error('Failed to delete object:', error);
        // TODO: Rollback or show error
      }
    },
    [board, client, setNodes]
  );

  /**
   * Batch update positions for board objects after drag
   */
  const batchUpdateObjectPositions = useCallback(
    async (updates: Record<string, { x: number; y: number }>) => {
      if (!board || !client || Object.keys(updates).length === 0) return;

      try {
        // Build objects payload with full object data + new positions
        const objects: Record<string, BoardObject> = {};

        for (const [objectId, position] of Object.entries(updates)) {
          const existingObject = board.objects?.[objectId];
          if (!existingObject) continue;

          objects[objectId] = {
            ...existingObject,
            x: position.x,
            y: position.y,
          };
        }

        await client.service('boards').patch(board.board_id, {
          _action: 'batchUpsertObjects',
          objects,
        });

        console.log('✓ Object positions persisted:', Object.keys(updates).length, 'objects');
      } catch (error) {
        console.error('Failed to persist object positions:', error);
      }
    },
    [board, client]
  );

  return {
    getBoardObjectNodes,
    addTextNode,
    addZoneNode,
    deleteObject,
    batchUpdateObjectPositions,
  };
};
