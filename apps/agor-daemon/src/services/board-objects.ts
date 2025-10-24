/**
 * Board Objects Service
 *
 * Provides REST + WebSocket API for managing positioned entities on boards.
 * Supports both session cards and worktree cards (Phase 1: Hybrid support).
 */

import { BoardObjectRepository, type Database } from '@agor/core/db';
import type {
  BoardEntityObject,
  BoardID,
  QueryParams,
  SessionID,
  WorktreeID,
} from '@agor/core/types';

/**
 * Board object service params
 */
export type BoardObjectParams = QueryParams<{
  board_id?: BoardID;
  session_id?: SessionID;
  worktree_id?: WorktreeID;
  object_type?: 'session' | 'worktree';
}>;

/**
 * Board objects service implementation
 */
export class BoardObjectsService {
  private boardObjectRepo: BoardObjectRepository;
  public emit?: (event: string, data: BoardEntityObject, params?: BoardObjectParams) => void;

  constructor(db: Database) {
    this.boardObjectRepo = new BoardObjectRepository(db);
  }

  /**
   * Override create to validate entity references
   */
  async create(
    data: Partial<BoardEntityObject>,
    params?: BoardObjectParams
  ): Promise<BoardEntityObject> {
    // Validate: exactly one of session_id or worktree_id must be set
    if (!data.session_id && !data.worktree_id) {
      throw new Error('Must specify session_id or worktree_id');
    }
    if (data.session_id && data.worktree_id) {
      throw new Error('Cannot specify both session_id and worktree_id');
    }

    // Validate: object_type matches the provided ID
    if (data.session_id && data.object_type !== 'session') {
      throw new Error('object_type must be "session" when session_id is provided');
    }
    if (data.worktree_id && data.object_type !== 'worktree') {
      throw new Error('object_type must be "worktree" when worktree_id is provided');
    }

    // Validate: position is provided
    if (!data.position) {
      throw new Error('position is required');
    }

    // Validate: board_id is provided
    if (!data.board_id) {
      throw new Error('board_id is required');
    }

    // Use repository to create
    const boardObject = await this.boardObjectRepo.create({
      board_id: data.board_id,
      object_type: data.object_type!,
      session_id: data.session_id,
      worktree_id: data.worktree_id,
      position: data.position,
    });

    // Emit WebSocket event
    this.emit?.('created', boardObject, params);

    return boardObject;
  }

  /**
   * Find board objects
   */
  async find(params?: BoardObjectParams) {
    const { board_id } = params?.query || {};

    // If board_id filter is provided, use repository method
    if (board_id) {
      const objects = await this.boardObjectRepo.findByBoardId(board_id);

      return {
        total: objects.length,
        limit: params?.query?.$limit || 100,
        skip: params?.query?.$skip || 0,
        data: objects,
      };
    }

    // No board_id - return empty
    return {
      total: 0,
      limit: 100,
      skip: 0,
      data: [],
    };
  }

  /**
   * Get single board object
   */
  async get(id: string, _params?: BoardObjectParams): Promise<BoardEntityObject> {
    const objects = await this.boardObjectRepo.findByBoardId(id as BoardID);
    const object = objects.find(o => o.object_id === id);
    if (!object) {
      throw new Error(`Board object ${id} not found`);
    }
    return object;
  }

  /**
   * Patch (update) board object
   */
  async patch(
    id: string,
    data: Partial<BoardEntityObject>,
    params?: BoardObjectParams
  ): Promise<BoardEntityObject> {
    if (data.position) {
      return this.updatePosition(id, data.position, params);
    }
    throw new Error('Only position updates are supported via patch');
  }

  /**
   * Remove board object
   */
  async remove(id: string, params?: BoardObjectParams): Promise<BoardEntityObject> {
    const object = await this.get(id, params);
    await this.boardObjectRepo.remove(id);

    // Emit WebSocket event
    this.emit?.('removed', object, params);

    return object;
  }

  /**
   * Custom method: Update position
   */
  async updatePosition(
    objectId: string,
    position: { x: number; y: number },
    params?: BoardObjectParams
  ): Promise<BoardEntityObject> {
    const boardObject = await this.boardObjectRepo.updatePosition(objectId, position);

    // Emit WebSocket event
    this.emit?.('patched', boardObject, params);

    return boardObject;
  }

  /**
   * Custom method: Find by session ID
   */
  async findBySessionId(
    sessionId: SessionID,
    _params?: BoardObjectParams
  ): Promise<BoardEntityObject | null> {
    return this.boardObjectRepo.findBySessionId(sessionId);
  }

  /**
   * Custom method: Find by worktree ID
   */
  async findByWorktreeId(
    worktreeId: WorktreeID,
    _params?: BoardObjectParams
  ): Promise<BoardEntityObject | null> {
    return this.boardObjectRepo.findByWorktreeId(worktreeId);
  }
}

/**
 * Service factory function
 */
export function createBoardObjectsService(db: Database): BoardObjectsService {
  return new BoardObjectsService(db);
}
