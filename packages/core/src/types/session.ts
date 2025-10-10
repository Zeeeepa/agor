// src/types/session.ts

import type { ConceptPath } from './concept';
import type { SessionID, TaskID } from './id';
import type { SessionRepoContext } from './repo';

export type SessionStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface Session {
  /** Unique session identifier (UUIDv7) */
  session_id: SessionID;

  agent: 'claude-code' | 'cursor' | 'codex' | 'gemini';
  agent_version?: string;
  /** Agent SDK session ID for maintaining conversation history (Claude Agent SDK only) */
  agent_session_id?: string;
  status: SessionStatus;
  created_at: string;
  last_updated: string;

  // Repository context (required)
  repo: SessionRepoContext;

  // Git state
  git_state: {
    ref: string;
    base_sha: string;
    current_sha: string;
  };

  // Context (concept file paths relative to context/concepts/)
  concepts: ConceptPath[];

  // Genealogy
  genealogy: {
    /** Session this was forked from (sibling relationship) */
    forked_from_session_id?: SessionID;
    /** Task where fork occurred */
    fork_point_task_id?: TaskID;
    /** Parent session that spawned this one (child relationship) */
    parent_session_id?: SessionID;
    /** Task where spawn occurred */
    spawn_point_task_id?: TaskID;
    /** Child sessions spawned from this session */
    children: SessionID[];
  };

  // Tasks
  /** Task IDs in this session */
  tasks: TaskID[];
  message_count: number;
  tool_use_count: number;

  // UI metadata
  description?: string;
}
