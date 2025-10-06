/**
 * Agor Daemon
 *
 * FeathersJS backend providing REST + WebSocket API for session management.
 * Auto-started by CLI, provides unified interface for GUI and CLI clients.
 */

import { createDatabase } from '@agor/core/db';
import express, { rest } from '@feathersjs/express';
import type { Params } from '@feathersjs/feathers';
import { feathers } from '@feathersjs/feathers';
import socketio from '@feathersjs/socketio';
import type { CorsOptions } from 'cors';
import { createBoardsService } from './services/boards';
import { createMessagesService } from './services/messages';
import { createReposService } from './services/repos';
import { createSessionsService } from './services/sessions';
import { createTasksService } from './services/tasks';

/**
 * Extended Params with route ID parameter
 */
interface RouteParams extends Params {
  route?: {
    id?: string;
  };
}

const PORT = process.env.PORT || 3030;
const DB_PATH = process.env.AGOR_DB_PATH || 'file:~/.agor/agor.db';

// Create Feathers app
const app = express(feathers());

// Parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure REST and Socket.io with CORS
app.configure(rest());
app.configure(
  socketio({
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
  })
);

// Initialize database
console.log(`📦 Connecting to database: ${DB_PATH}`);
const db = createDatabase({ url: DB_PATH });

// Register services
app.use('/sessions', createSessionsService(db));
app.use('/tasks', createTasksService(db));
const messagesService = createMessagesService(db);
app.use('/messages', messagesService);
app.use('/boards', createBoardsService(db));
app.use('/repos', createReposService(db));

// Configure custom route for bulk message creation
app.use('/messages/bulk', {
  async create(data: unknown[]) {
    return messagesService.createMany(data);
  },
});

// Configure custom methods for sessions service
const sessionsService = app.service('sessions');
app.use('/sessions/:id/fork', {
  async create(data: { prompt: string; task_id?: string }, params: RouteParams) {
    const id = params.route?.id;
    if (!id) throw new Error('Session ID required');
    return sessionsService.fork(id, data, params);
  },
});

app.use('/sessions/:id/spawn', {
  async create(data: { prompt: string; agent?: string; task_id?: string }, params: RouteParams) {
    const id = params.route?.id;
    if (!id) throw new Error('Session ID required');
    return sessionsService.spawn(id, data, params);
  },
});

app.use('/sessions/:id/genealogy', {
  async find(_data: undefined, params: RouteParams) {
    const id = params.route?.id;
    if (!id) throw new Error('Session ID required');
    return sessionsService.getGenealogy(id, params);
  },
});

// Configure custom methods for tasks service
const tasksService = app.service('tasks');

// Configure custom route for bulk task creation
app.use('/tasks/bulk', {
  async create(data: unknown[]) {
    return tasksService.createMany(data);
  },
});

app.use('/tasks/:id/complete', {
  async create(
    data: { git_state?: { sha_at_end?: string; commit_message?: string } },
    params: RouteParams
  ) {
    const id = params.route?.id;
    if (!id) throw new Error('Task ID required');
    return tasksService.complete(id, data, params);
  },
});

app.use('/tasks/:id/fail', {
  async create(data: { error?: string }, params: RouteParams) {
    const id = params.route?.id;
    if (!id) throw new Error('Task ID required');
    return tasksService.fail(id, data, params);
  },
});

// Configure custom methods for repos service
const reposService = app.service('repos');
app.use('/repos/clone', {
  async create(data: { url: string; name?: string; destination?: string }, params: RouteParams) {
    return reposService.cloneRepository(data, params);
  },
});

app.use('/repos/:id/worktrees', {
  async create(data: { name: string; ref: string; createBranch?: boolean }, params: RouteParams) {
    const id = params.route?.id;
    if (!id) throw new Error('Repo ID required');
    return reposService.createWorktree(id, data, params);
  },
});

app.use('/repos/:id/worktrees/:name', {
  async remove(_id: unknown, params: RouteParams & { route?: { name?: string } }) {
    const id = params.route?.id;
    const name = params.route?.name;
    if (!id) throw new Error('Repo ID required');
    if (!name) throw new Error('Worktree name required');
    return reposService.removeWorktree(id, name, params);
  },
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '0.1.0',
    database: DB_PATH,
  });
});

// Error handling
app.use(express.errorHandler());

// Start server
app.listen(PORT).then(() => {
  console.log(`🚀 Agor daemon running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Services:`);
  console.log(`     - /sessions`);
  console.log(`     - /tasks`);
  console.log(`     - /messages`);
  console.log(`     - /boards`);
  console.log(`     - /repos`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏳ Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏳ Shutting down gracefully...');
  process.exit(0);
});
