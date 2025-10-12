/**
 * Boards Service
 *
 * Provides REST + WebSocket API for board management.
 * Uses DrizzleService adapter with BoardRepository.
 */

import { BoardRepository, type Database } from '@agor/core/db';
import type { Board, BoardObject } from '@agor/core/types';
import type { Params } from '@feathersjs/feathers';
import { DrizzleService } from '../adapters/drizzle';

/**
 * Board service params
 */
export interface BoardParams extends Params {
  query?: {
    slug?: string;
    name?: string;
    $limit?: number;
    $skip?: number;
    $sort?: Record<string, 1 | -1>;
    $select?: string[];
  };
}

/**
 * Extended boards service with custom methods
 */
export class BoardsService extends DrizzleService<Board, Partial<Board>, BoardParams> {
  private boardRepo: BoardRepository;

  constructor(db: Database) {
    const boardRepo = new BoardRepository(db);
    super(boardRepo, {
      id: 'board_id',
      paginate: {
        default: 50,
        max: 100,
      },
    });

    this.boardRepo = boardRepo;
  }

  /**
   * Custom method: Find board by slug
   */
  async findBySlug(slug: string, _params?: BoardParams): Promise<Board | null> {
    return this.boardRepo.findBySlug(slug);
  }

  /**
   * Custom method: Add session to board
   */
  async addSession(id: string, sessionId: string, params?: BoardParams): Promise<Board> {
    const board = await this.get(id, params);
    const sessions = board.sessions || [];

    // Avoid duplicates
    // biome-ignore lint/suspicious/noExplicitAny: SessionID is branded UUID string
    if (sessions.includes(sessionId as any)) {
      return board;
    }

    return this.patch(
      id,
      {
        // biome-ignore lint/suspicious/noExplicitAny: SessionID is branded UUID string
        sessions: [...sessions, sessionId as any],
      },
      params
    ) as Promise<Board>;
  }

  /**
   * Custom method: Remove session from board
   */
  async removeSession(id: string, sessionId: string, params?: BoardParams): Promise<Board> {
    const board = await this.get(id, params);
    const sessions = board.sessions || [];

    return this.patch(
      id,
      {
        sessions: sessions.filter(sid => sid !== sessionId),
      },
      params
    ) as Promise<Board>;
  }

  /**
   * Custom method: Atomically add or update a board object
   */
  async upsertBoardObject(
    boardId: string,
    objectId: string,
    objectData: BoardObject,
    _params?: BoardParams
  ): Promise<Board> {
    return this.boardRepo.upsertBoardObject(boardId, objectId, objectData);
  }

  /**
   * Custom method: Atomically remove a board object
   */
  async removeBoardObject(
    boardId: string,
    objectId: string,
    _params?: BoardParams
  ): Promise<Board> {
    return this.boardRepo.removeBoardObject(boardId, objectId);
  }

  /**
   * Custom method: Batch upsert board objects
   */
  async batchUpsertBoardObjects(
    boardId: string,
    objects: Record<string, BoardObject>,
    _params?: BoardParams
  ): Promise<Board> {
    return this.boardRepo.batchUpsertBoardObjects(boardId, objects);
  }
}

/**
 * Service factory function
 */
export function createBoardsService(db: Database): BoardsService {
  return new BoardsService(db);
}
