/**
 * Board Objects Repository
 *
 * Manages positioned entities (sessions and worktrees) on boards.
 * Phase 1: Hybrid support for both session cards and worktree cards.
 */

import type { BoardEntityObject, BoardID, WorktreeID } from '@agor/core/types';
import { eq } from 'drizzle-orm';
import { generateId } from '../../lib/ids';
import type { Database } from '../client';
import { type BoardObjectInsert, type BoardObjectRow, boardObjects } from '../schema';
import { EntityNotFoundError, RepositoryError } from './base';

/**
 * Board object repository implementation
 */
export class BoardObjectRepository {
  constructor(private db: Database) {}

  /**
   * Find all board objects for a board
   */
  async findByBoardId(boardId: BoardID): Promise<BoardEntityObject[]> {
    try {
      const rows = await this.db
        .select()
        .from(boardObjects)
        .where(eq(boardObjects.board_id, boardId))
        .all();

      return rows.map(this.rowToEntity);
    } catch (error) {
      throw new RepositoryError(
        `Failed to find board objects: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Find board object by worktree ID
   */
  async findByWorktreeId(worktreeId: WorktreeID): Promise<BoardEntityObject | null> {
    try {
      const row = await this.db
        .select()
        .from(boardObjects)
        .where(eq(boardObjects.worktree_id, worktreeId))
        .get();

      return row ? this.rowToEntity(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find board object by worktree: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Create a board object (add worktree to board)
   */
  async create(data: {
    board_id: BoardID;
    worktree_id: WorktreeID;
    position: { x: number; y: number };
  }): Promise<BoardEntityObject> {
    try {
      // Check if worktree already on a board
      const existing = await this.db
        .select()
        .from(boardObjects)
        .where(eq(boardObjects.worktree_id, data.worktree_id))
        .get();

      if (existing) {
        throw new RepositoryError(`Worktree already on a board (object_id: ${existing.object_id})`);
      }

      const insert: BoardObjectInsert = {
        object_id: generateId(),
        board_id: data.board_id,
        worktree_id: data.worktree_id,
        created_at: new Date(),
        data: {
          position: data.position,
        },
      };

      await this.db.insert(boardObjects).values(insert);

      // Fetch and return created object
      const row = await this.db
        .select()
        .from(boardObjects)
        .where(eq(boardObjects.object_id, insert.object_id))
        .get();

      if (!row) {
        throw new RepositoryError('Failed to retrieve created board object');
      }

      return this.rowToEntity(row);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        `Failed to create board object: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Update position of board object
   */
  async updatePosition(
    objectId: string,
    position: { x: number; y: number }
  ): Promise<BoardEntityObject> {
    try {
      const existing = await this.db
        .select()
        .from(boardObjects)
        .where(eq(boardObjects.object_id, objectId))
        .get();

      if (!existing) {
        throw new EntityNotFoundError('BoardObject', objectId);
      }

      await this.db
        .update(boardObjects)
        .set({
          data: {
            position,
          },
        })
        .where(eq(boardObjects.object_id, objectId));

      const row = await this.db
        .select()
        .from(boardObjects)
        .where(eq(boardObjects.object_id, objectId))
        .get();

      if (!row) {
        throw new RepositoryError('Failed to retrieve updated board object');
      }

      return this.rowToEntity(row);
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new RepositoryError(
        `Failed to update board object position: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Remove board object (remove entity from board)
   */
  async remove(objectId: string): Promise<void> {
    try {
      const result = await this.db
        .delete(boardObjects)
        .where(eq(boardObjects.object_id, objectId))
        .run();

      if (result.rowsAffected === 0) {
        throw new EntityNotFoundError('BoardObject', objectId);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new RepositoryError(
        `Failed to remove board object: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Remove all board objects for a worktree
   */
  async removeByWorktreeId(worktreeId: WorktreeID): Promise<void> {
    try {
      await this.db.delete(boardObjects).where(eq(boardObjects.worktree_id, worktreeId));
    } catch (error) {
      throw new RepositoryError(
        `Failed to remove board objects by worktree: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Convert database row to entity
   */
  private rowToEntity(row: BoardObjectRow): BoardEntityObject {
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;

    return {
      object_id: row.object_id,
      board_id: row.board_id as BoardID,
      worktree_id: row.worktree_id as WorktreeID,
      position: data.position,
      created_at: new Date(row.created_at).toISOString(),
    };
  }
}
