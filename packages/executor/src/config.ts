/**
 * Executor Configuration Module
 *
 * Re-exports configuration utilities used by SDK handlers
 */

// Re-export getDaemonUrl from core (respects config.yaml)
export { getDaemonUrl } from '@agor/core';

/**
 * Resolve user environment (cwd, env vars, etc.)
 * In executor mode, environment is inherited from the executor process
 */
export function resolveUserEnvironment() {
  return {
    cwd: process.cwd(),
    env: process.env,
  };
}
