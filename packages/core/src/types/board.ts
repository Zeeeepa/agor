import type { BoardID, SessionID } from './id';

/**
 * Board object types for canvas annotations
 */
export type BoardObjectType = 'text' | 'zone';

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

  /** Session IDs in this board */
  sessions: SessionID[];

  /**
   * Session positions on the board canvas
   *
   * Maps session_id -> {x, y} coordinates for React Flow
   * Updated on drag events, isolated from other board operations
   */
  layout?: {
    [sessionId: string]: {
      x: number;
      y: number;
    };
  };

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
}
