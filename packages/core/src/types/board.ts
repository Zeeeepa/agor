import type { BoardID, SessionID, WorktreeID } from './id';

/**
 * Board object types for canvas annotations
 */
export type BoardObjectType = 'text' | 'zone';

/**
 * Positioned worktree card on a board
 *
 * Boards display worktrees as primary units. Sessions are accessed
 * through the worktree card's session tree.
 */
export interface BoardEntityObject {
  /** Unique object identifier */
  object_id: string;

  /** Board this entity belongs to */
  board_id: BoardID;

  /** Worktree reference */
  worktree_id: WorktreeID;

  /** Position on canvas */
  position: { x: number; y: number };

  /** When this entity was added to the board */
  created_at: string;
}

/**
 * Text annotation object
 */
export interface TextBoardObject {
  type: 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  fontSize?: number;
  color?: string;
  background?: string;
}

/**
 * Zone trigger types
 */
export type ZoneTriggerType = 'prompt' | 'task' | 'subtask';

/**
 * Zone trigger configuration
 */
export interface ZoneTrigger {
  /** Type of trigger action */
  type: ZoneTriggerType;
  /** The prompt text or task description to execute */
  text: string;
}

/**
 * Zone rectangle object (for organizing sessions visually)
 */
export interface ZoneBoardObject {
  type: 'zone';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color?: string;
  status?: string;
  /** Trigger configuration for sessions dropped into this zone */
  trigger?: ZoneTrigger;
}

/**
 * Union type for all board objects
 */
export type BoardObject = TextBoardObject | ZoneBoardObject;

export interface Board {
  /** Unique board identifier (UUIDv7) */
  board_id: BoardID;

  name: string;

  /**
   * Optional URL-friendly slug for board
   *
   * Examples: "main", "experiments", "bug-fixes"
   *
   * Allows CLI commands like:
   *   agor session list --board experiments
   * instead of:
   *   agor session list --board 01933e4a
   */
  slug?: string;

  description?: string;

  /**
   * DEPRECATED: Sessions and layout are now tracked in board_objects table
   *
   * Query board entities via:
   * - boardObjectsService.find({ query: { board_id } })
   *
   * Old fields removed:
   * - sessions: SessionID[]
   * - layout: { [sessionId: string]: { x, y, parentId? } }
   */

  /**
   * Canvas annotation objects (text labels, zones, etc.)
   *
   * Keys are object IDs (e.g., "text-123", "zone-456")
   * Use atomic backend methods: upsertBoardObject(), removeBoardObject()
   *
   * IMPORTANT: Do NOT directly replace this entire object from client.
   * Use atomic operations to prevent concurrent write conflicts.
   */
  objects?: {
    [objectId: string]: BoardObject;
  };

  created_at: string;
  last_updated: string;

  /** User ID of the user who created this board */
  created_by: string;

  /** Hex color for visual distinction */
  color?: string;

  /** Optional emoji/icon */
  icon?: string;

  /**
   * Custom context for Handlebars templates (board-level)
   * Example: { "team": "Backend", "sprint": 42, "deadline": "2025-03-15" }
   * Access in templates: {{ board.context.team }}
   */
  custom_context?: Record<string, unknown>;
}
