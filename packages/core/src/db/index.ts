// Schema and types

// bcryptjs re-export (for password hashing in daemon)
export { compare, hash } from 'bcryptjs';
// Drizzle ORM re-exports (so daemon doesn't import drizzle-orm directly)
// Commonly used operators and utilities
export { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';

// ID utilities (re-exported from lib for convenience)
export { formatShortId, generateId, IdResolutionError, resolveShortId } from '../lib/ids';
// Client and database
export * from './client';

// Migrations
export * from './migrate';
// Repositories
export * from './repositories';
export * from './schema';
// User utilities
export * from './user-utils';
