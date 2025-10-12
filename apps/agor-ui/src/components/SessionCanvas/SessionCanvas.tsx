import type { AgorClient } from '@agor/core/api';
import type { MCPServer, User } from '@agor/core/types';
import {
  BorderOutlined,
  DeleteOutlined,
  FontSizeOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  ControlButton,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  type NodeDragHandler,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Board, BoardObject, Session, Task } from '../../types';
import SessionCard from '../SessionCard';
import { TextNode, ZoneNode } from './canvas/BoardObjectNodes';
import { useBoardObjects } from './canvas/useBoardObjects';

interface SessionCanvasProps {
  board: Board | null;
  client: AgorClient | null;
  sessions: Session[];
  tasks: Record<string, Task[]>;
  users: User[];
  currentUserId?: string;
  mcpServers?: MCPServer[];
  sessionMcpServerIds?: Record<string, string[]>; // Map sessionId -> mcpServerIds[]
  onSessionClick?: (sessionId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onSessionUpdate?: (sessionId: string, updates: Partial<Session>) => void;
  onSessionDelete?: (sessionId: string) => void;
  onUpdateSessionMcpServers?: (sessionId: string, mcpServerIds: string[]) => void;
  onOpenSettings?: (sessionId: string) => void;
}

interface SessionNodeData {
  session: Session;
  tasks: Task[];
  users: User[];
  currentUserId?: string;
  mcpServers: MCPServer[];
  sessionMcpServerIds: string[];
  onTaskClick?: (taskId: string) => void;
  onSessionClick?: () => void;
  onUpdate?: (sessionId: string, updates: Partial<Session>) => void;
  onDelete?: (sessionId: string) => void;
  onUpdateSessionMcpServers?: (sessionId: string, mcpServerIds: string[]) => void;
  compact?: boolean;
}

// Custom node component that renders SessionCard
const SessionNode = ({ data }: { data: SessionNodeData }) => {
  return (
    <div className="session-node" style={{ cursor: 'default' }}>
      <SessionCard
        session={data.session}
        tasks={data.tasks}
        users={data.users}
        currentUserId={data.currentUserId}
        mcpServers={data.mcpServers}
        sessionMcpServerIds={data.sessionMcpServerIds}
        onTaskClick={data.onTaskClick}
        onSessionClick={data.onSessionClick}
        onUpdate={data.onUpdate}
        onDelete={data.onDelete}
        onUpdateSessionMcpServers={data.onUpdateSessionMcpServers}
        compact={data.compact}
      />
    </div>
  );
};

// Define nodeTypes outside component to avoid recreation on every render
const nodeTypes = {
  sessionNode: SessionNode,
  text: TextNode,
  zone: ZoneNode,
};

const SessionCanvas = ({
  board,
  client,
  sessions,
  tasks,
  users,
  currentUserId,
  mcpServers = [],
  sessionMcpServerIds = {},
  onSessionClick,
  onTaskClick,
  onSessionUpdate,
  onSessionDelete,
  onUpdateSessionMcpServers,
  onOpenSettings,
}: SessionCanvasProps) => {
  // Tool state for canvas annotations
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'zone' | 'eraser'>('select');

  // Zone drawing state (drag-to-draw)
  const [drawingZone, setDrawingZone] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);

  // Debounce timer ref for position updates
  const layoutUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLayoutUpdatesRef = useRef<Record<string, { x: number; y: number }>>({});
  const isDraggingRef = useRef(false);
  // Track positions we've explicitly set (to avoid being overwritten by other clients)
  const localPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Initialize nodes and edges state BEFORE using them
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Board objects hook
  const {
    getBoardObjectNodes,
    addTextNode,
    addZoneNode,
    deleteObject,
    batchUpdateObjectPositions,
  } = useBoardObjects({ board, client, setNodes });

  // Convert sessions to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    // Simple layout algorithm: place nodes vertically with offset for children
    const nodeMap = new Map<string, { x: number; y: number; level: number }>();
    let currentY = 0;
    const VERTICAL_SPACING = 450;
    const HORIZONTAL_SPACING = 500;

    // First pass: identify root sessions (no parent, no forked_from)
    const rootSessions = sessions.filter(
      s => !s.genealogy.parent_session_id && !s.genealogy.forked_from_session_id
    );

    // Recursive function to layout session and its children
    const layoutSession = (session: Session, level: number, offsetX: number) => {
      nodeMap.set(session.session_id, { x: offsetX, y: currentY, level });
      currentY += VERTICAL_SPACING;

      // Layout children (both spawned and forked)
      const children = sessions.filter(
        s =>
          s.genealogy.parent_session_id === session.session_id ||
          s.genealogy.forked_from_session_id === session.session_id
      );

      children.forEach((child, index) => {
        layoutSession(child, level + 1, offsetX + index * HORIZONTAL_SPACING);
      });
    };

    // Layout all root sessions
    rootSessions.forEach((root, index) => {
      layoutSession(root, 0, index * HORIZONTAL_SPACING * 2);
    });

    // Convert to React Flow nodes
    return sessions.map(session => {
      // Use stored position from board layout if available, otherwise use auto-layout
      const storedPosition = board?.layout?.[session.session_id];
      const autoPosition = nodeMap.get(session.session_id) || { x: 0, y: 0 };
      const position = storedPosition || autoPosition;

      return {
        id: session.session_id,
        type: 'sessionNode',
        position,
        draggable: true,
        data: {
          session,
          tasks: tasks[session.session_id] || [],
          users,
          currentUserId,
          mcpServers,
          sessionMcpServerIds: sessionMcpServerIds[session.session_id] || [],
          onTaskClick,
          onSessionClick: () => onSessionClick?.(session.session_id),
          onUpdate: onSessionUpdate,
          onDelete: onSessionDelete,
          onUpdateSessionMcpServers,
          compact: false,
        },
      };
    });
  }, [
    board?.layout,
    sessions,
    tasks,
    users,
    currentUserId,
    mcpServers,
    sessionMcpServerIds,
    onSessionClick,
    onTaskClick,
    onSessionUpdate,
    onSessionDelete,
    onUpdateSessionMcpServers,
  ]);

  // Convert session relationships to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    sessions.forEach(session => {
      // Fork relationship (dashed line)
      if (session.genealogy.forked_from_session_id) {
        edges.push({
          id: `fork-${session.genealogy.forked_from_session_id}-${session.session_id}`,
          source: session.genealogy.forked_from_session_id,
          target: session.session_id,
          type: 'default',
          animated: false,
          style: { strokeDasharray: '5,5', stroke: '#00b4d8' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#00b4d8',
          },
          label: 'fork',
          labelStyle: { fill: '#00b4d8', fontWeight: 500 },
        });
      }

      // Spawn relationship (solid line)
      if (session.genealogy.parent_session_id) {
        edges.push({
          id: `spawn-${session.genealogy.parent_session_id}-${session.session_id}`,
          source: session.genealogy.parent_session_id,
          target: session.session_id,
          type: 'default',
          animated: true,
          style: { stroke: '#9333ea' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#9333ea',
          },
          label: 'spawn',
          labelStyle: { fill: '#9333ea', fontWeight: 500 },
        });
      }
    });

    return edges;
  }, [sessions]);

  // Sync nodes when sessions/tasks/board objects change
  useEffect(() => {
    if (isDraggingRef.current) return; // Skip during drag

    // Merge session nodes + board object nodes
    const boardObjectNodes = getBoardObjectNodes();
    const allNodes = [...initialNodes, ...boardObjectNodes];

    setNodes(currentNodes => {
      return allNodes.map(newNode => {
        // Find existing node to preserve selection state
        const existingNode = currentNodes.find(n => n.id === newNode.id);

        const localPosition = localPositionsRef.current[newNode.id];
        const incomingPosition = newNode.position;
        const positionChanged =
          localPosition &&
          (Math.abs(localPosition.x - incomingPosition.x) > 1 ||
            Math.abs(localPosition.y - incomingPosition.y) > 1);

        if (positionChanged) {
          delete localPositionsRef.current[newNode.id];
          return { ...newNode, selected: existingNode?.selected };
        }

        if (localPosition) {
          return { ...newNode, position: localPosition, selected: existingNode?.selected };
        }

        // Preserve selected state from existing node
        return { ...newNode, selected: existingNode?.selected };
      });
    });
  }, [initialNodes, getBoardObjectNodes, setNodes]);

  // Sync edges
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle node drag start
  const handleNodeDragStart: NodeDragHandler = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // Handle node drag - track local position changes
  const handleNodeDrag: NodeDragHandler = useCallback((_event, node) => {
    // Track this position locally so we don't get overwritten by WebSocket updates
    localPositionsRef.current[node.id] = {
      x: node.position.x,
      y: node.position.y,
    };
  }, []);

  // Handle node drag end - persist layout to board (debounced)
  const handleNodeDragStop: NodeDragHandler = useCallback(
    (_event, node) => {
      if (!board || !client) return;

      // Track final position locally
      localPositionsRef.current[node.id] = {
        x: node.position.x,
        y: node.position.y,
      };

      // Accumulate position updates
      pendingLayoutUpdatesRef.current[node.id] = {
        x: node.position.x,
        y: node.position.y,
      };

      // Clear existing timer
      if (layoutUpdateTimerRef.current) {
        clearTimeout(layoutUpdateTimerRef.current);
      }

      // Debounce: wait 500ms after last drag before persisting
      layoutUpdateTimerRef.current = setTimeout(async () => {
        const updates = pendingLayoutUpdatesRef.current;
        pendingLayoutUpdatesRef.current = {};
        isDraggingRef.current = false;

        try {
          // Separate updates for sessions vs board objects
          const sessionUpdates: Record<string, { x: number; y: number }> = {};
          const objectUpdates: Record<string, { x: number; y: number }> = {};

          // Find all current nodes to check types
          const currentNodes = nodes;

          for (const [nodeId, position] of Object.entries(updates)) {
            const node = currentNodes.find(n => n.id === nodeId);
            if (node?.type === 'text' || node?.type === 'zone') {
              objectUpdates[nodeId] = position;
            } else {
              sessionUpdates[nodeId] = position;
            }
          }

          // Update session positions in layout
          if (Object.keys(sessionUpdates).length > 0) {
            const newLayout = {
              ...board.layout,
              ...sessionUpdates,
            };

            await client.service('boards').patch(board.board_id, {
              layout: newLayout,
            });

            console.log('✓ Layout persisted:', Object.keys(sessionUpdates).length, 'sessions');
          }

          // Update board object positions
          if (Object.keys(objectUpdates).length > 0) {
            await batchUpdateObjectPositions(objectUpdates);
          }
        } catch (error) {
          console.error('Failed to persist layout:', error);
        }
      }, 500);
    },
    [board, client, nodes, batchUpdateObjectPositions]
  );

  // Handle node resize - update zone dimensions
  const handleNodeResize = useCallback(
    (_event: unknown, node: Node) => {
      if (!board || !client) return;
      if (node.type !== 'zone') return;

      const { width, height } = node.style || {};
      if (!width || !height) return;

      const objectData = board.objects?.[node.id];
      if (!objectData || objectData.type !== 'zone') return;

      // Update the zone object with new dimensions
      const updatedObject: BoardObject = {
        ...objectData,
        width: Number(width),
        height: Number(height),
      };

      // Persist the resize
      client
        .service('boards')
        .patch(board.board_id, {
          _action: 'upsertObject',
          objectId: node.id,
          objectData: updatedObject,
        })
        .catch((error: unknown) => {
          console.error('Failed to persist zone resize:', error);
        });
    },
    [board, client]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (layoutUpdateTimerRef.current) {
        clearTimeout(layoutUpdateTimerRef.current);
      }
    };
  }, []);

  // Store ReactFlow instance ref
  const reactFlowInstanceRef = useRef<{
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    getViewport: () => { zoom: number; x: number; y: number };
  } | null>(null);

  // Canvas pointer handlers for drag-to-draw zones
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!reactFlowInstanceRef.current) return;

      // Text tool: click to place
      if (activeTool === 'text') {
        const bounds = event.currentTarget.getBoundingClientRect();
        const position = reactFlowInstanceRef.current.screenToFlowPosition({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });
        addTextNode(position.x, position.y);
        setActiveTool('select');
        return;
      }

      // Zone tool: start drag-to-draw
      if (activeTool === 'zone') {
        setDrawingZone({
          start: { x: event.pageX, y: event.pageY },
          end: { x: event.pageX, y: event.pageY },
        });
      }
    },
    [activeTool, addTextNode]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (activeTool === 'zone' && drawingZone && event.buttons === 1) {
        setDrawingZone({
          start: drawingZone.start,
          end: { x: event.pageX, y: event.pageY },
        });
      }
    },
    [activeTool, drawingZone]
  );

  const handlePointerUp = useCallback(() => {
    if (activeTool === 'zone' && drawingZone && reactFlowInstanceRef.current) {
      const { start, end } = drawingZone;

      // Calculate position and dimensions in screen space
      const minX = Math.min(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const screenWidth = Math.abs(end.x - start.x);
      const screenHeight = Math.abs(end.y - start.y);

      // Only create zone if dragged (not just clicked)
      if (screenWidth > 50 && screenHeight > 50) {
        const position = reactFlowInstanceRef.current.screenToFlowPosition({
          x: minX,
          y: minY,
        });

        // Convert dimensions to flow space (account for zoom)
        const viewport = reactFlowInstanceRef.current.getViewport();
        const width = screenWidth / viewport.zoom;
        const height = screenHeight / viewport.zoom;

        // Create zone with drawn dimensions
        const objectId = `zone-${Date.now()}`;

        // Optimistic update
        setNodes(nodes => [
          ...nodes,
          {
            id: objectId,
            type: 'zone',
            position,
            draggable: true,
            style: { width, height, zIndex: -1 },
            data: {
              objectId,
              label: 'New Zone',
              width,
              height,
              color: '#d9d9d9',
              onUpdate: (id: string, data: BoardObject) => {
                if (board && client) {
                  client
                    .service('boards')
                    .patch(board.board_id, {
                      _action: 'upsertObject',
                      objectId: id,
                      objectData: data,
                    })
                    .catch(console.error);
                }
              },
            },
          },
        ]);

        // Persist to backend
        if (board && client) {
          client
            .service('boards')
            .patch(board.board_id, {
              _action: 'upsertObject',
              objectId,
              objectData: {
                type: 'zone',
                x: position.x,
                y: position.y,
                width,
                height,
                label: 'New Zone',
                color: '#d9d9d9',
              },
            })
            .catch((error: unknown) => {
              console.error('Failed to add zone:', error);
              setNodes(nodes => nodes.filter(n => n.id !== objectId));
            });
        }
      }

      setDrawingZone(null);
      setActiveTool('select');
    }
  }, [activeTool, drawingZone, board, client, setNodes]);

  // Node click handler for eraser mode
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (activeTool === 'eraser') {
        // Only delete board objects (text/zone), not sessions
        if (node.type === 'text' || node.type === 'zone') {
          deleteObject(node.id);
        }
        return;
      }

      // Normal session click
      if (node.type === 'sessionNode') {
        onSessionClick?.(node.id);
      }
    },
    [activeTool, deleteObject, onSessionClick]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 't') setActiveTool('text');
      if (e.key === 'z') setActiveTool('zone');
      if (e.key === 'e') setActiveTool('eraser');
      if (e.key === 'Escape') setActiveTool('select');
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected nodes
        const selectedNodes = nodes.filter(n => n.selected);
        selectedNodes.forEach(n => {
          if (n.type === 'text' || n.type === 'zone') {
            deleteObject(n.id);
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, deleteObject]);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        cursor:
          activeTool === 'text'
            ? 'text'
            : activeTool === 'zone'
              ? 'crosshair'
              : activeTool === 'eraser'
                ? 'not-allowed'
                : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Drawing preview for zone */}
      {drawingZone && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(drawingZone.start.x, drawingZone.end.x),
            top: Math.min(drawingZone.start.y, drawingZone.end.y),
            width: Math.abs(drawingZone.end.x - drawingZone.start.x),
            height: Math.abs(drawingZone.end.y - drawingZone.start.y),
            border: '2px dashed #1677ff',
            background: 'rgba(22, 119, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onNodeResizeStop={handleNodeResize}
        onInit={instance => {
          reactFlowInstanceRef.current = instance;
        }}
        nodeTypes={nodeTypes}
        snapToGrid={true}
        snapGrid={[20, 20]}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={activeTool === 'select'}
        colorMode="dark"
        className="dark"
        style={{
          cursor:
            activeTool === 'text'
              ? 'text'
              : activeTool === 'zone'
                ? 'crosshair'
                : activeTool === 'eraser'
                  ? 'not-allowed'
                  : 'default',
        }}
      >
        <Background />
        <Controls position="top-left">
          {/* Custom toolbox buttons */}
          <ControlButton
            onClick={e => {
              e.stopPropagation();
              setActiveTool('select');
            }}
            title="Select (Esc)"
            style={{
              borderLeft: activeTool === 'select' ? '3px solid #1677ff' : 'none',
            }}
          >
            <SelectOutlined style={{ fontSize: '16px' }} />
          </ControlButton>
          <ControlButton
            onClick={e => {
              e.stopPropagation();
              setActiveTool('text');
            }}
            title="Add Text (T)"
            style={{
              borderLeft: activeTool === 'text' ? '3px solid #1677ff' : 'none',
            }}
          >
            <FontSizeOutlined style={{ fontSize: '16px' }} />
          </ControlButton>
          <ControlButton
            onClick={e => {
              e.stopPropagation();
              setActiveTool('zone');
            }}
            title="Add Zone (Z)"
            style={{
              borderLeft: activeTool === 'zone' ? '3px solid #1677ff' : 'none',
            }}
          >
            <BorderOutlined style={{ fontSize: '16px' }} />
          </ControlButton>
          <ControlButton
            onClick={e => {
              e.stopPropagation();
              setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser');
            }}
            title="Eraser (E) - Click to toggle"
            style={{
              borderLeft: activeTool === 'eraser' ? '3px solid #ff4d4f' : 'none',
              color: activeTool === 'eraser' ? '#ff4d4f' : 'inherit',
              backgroundColor: activeTool === 'eraser' ? '#fff1f0' : 'transparent',
            }}
          >
            <DeleteOutlined style={{ fontSize: '16px' }} />
          </ControlButton>
        </Controls>
        <MiniMap
          nodeColor={node => {
            // Handle board objects (text/zone)
            if (node.type === 'text') return '#ffa940';
            if (node.type === 'zone') return '#d9d9d9';

            // Handle session nodes
            const session = node.data.session as Session;
            if (!session) return '#d9d9d9';

            switch (session.status) {
              case 'running':
                return '#1890ff';
              case 'completed':
                return '#52c41a';
              case 'failed':
                return '#ff4d4f';
              default:
                return '#d9d9d9';
            }
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
};

export default SessionCanvas;
