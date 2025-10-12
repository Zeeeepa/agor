/**
 * MCP Servers Service
 *
 * Provides REST + WebSocket API for MCP server management.
 * Uses DrizzleService adapter with MCPServerRepository.
 */

import { type Database, MCPServerRepository } from '@agor/core/db';
import type {
  CreateMCPServerInput,
  MCPServer,
  MCPServerFilters,
  UpdateMCPServerInput,
} from '@agor/core/types';
import type { Params } from '@feathersjs/feathers';
import { DrizzleService } from '../adapters/drizzle';

/**
 * MCP Server service params
 */
export interface MCPServerParams extends Params {
  paginate?: false | { default: number; max: number };
  query?: {
    scope?: string;
    scopeId?: string;
    transport?: string;
    enabled?: boolean;
    source?: string;
    $limit?: number;
    $skip?: number;
    $sort?: Record<string, 1 | -1>;
    $select?: string[];
  };
}

/**
 * Extended MCP servers service with custom methods
 */
export class MCPServersService extends DrizzleService<
  MCPServer,
  CreateMCPServerInput | UpdateMCPServerInput,
  MCPServerParams
> {
  private mcpServerRepo: MCPServerRepository;

  constructor(db: Database) {
    const mcpServerRepo = new MCPServerRepository(db);
    super(mcpServerRepo, {
      id: 'mcp_server_id',
      paginate: {
        default: 50,
        max: 100,
      },
    });

    this.mcpServerRepo = mcpServerRepo;
  }

  /**
   * Override find to support filter params
   */
  async find(params?: MCPServerParams) {
    const filters: MCPServerFilters = {};

    if (params?.query) {
      // biome-ignore lint/suspicious/noExplicitAny: Query parameter type conversion
      if (params.query.scope) filters.scope = params.query.scope as any;
      if (params.query.scopeId) filters.scopeId = params.query.scopeId;
      // biome-ignore lint/suspicious/noExplicitAny: Query parameter type conversion
      if (params.query.transport) filters.transport = params.query.transport as any;
      if (params.query.enabled !== undefined) filters.enabled = params.query.enabled;
      // biome-ignore lint/suspicious/noExplicitAny: Query parameter type conversion
      if (params.query.source) filters.source = params.query.source as any;
    }

    const servers = await this.mcpServerRepo.findAll(filters);

    // Apply pagination if requested
    const limit = params?.query?.$limit ?? this.paginate?.default ?? 50;
    const skip = params?.query?.$skip ?? 0;

    const total = servers.length;
    const data = servers.slice(skip, skip + limit);

    if (params?.paginate !== false && this.paginate) {
      return {
        total,
        limit,
        skip,
        data,
      };
    }

    // biome-ignore lint/suspicious/noExplicitAny: Return type varies based on pagination
    return data as any;
  }

  /**
   * Custom method: Find by scope
   */
  async findByScope(
    scope: string,
    scopeId?: string,
    _params?: MCPServerParams
  ): Promise<MCPServer[]> {
    return this.mcpServerRepo.findByScope(scope, scopeId);
  }
}

/**
 * Service factory function
 */
export function createMCPServersService(db: Database): MCPServersService {
  return new MCPServersService(db);
}
