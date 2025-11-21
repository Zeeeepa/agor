/**
 * MCP JWT Authentication Module
 *
 * Handles JWT token fetching for MCP servers that require dynamic authentication.
 * Follows the same pattern as testmcpy's implementation.
 *
 * JWT Auth Flow:
 * 1. POST to api_url with body: {"name": "{api_token}", "secret": "{api_secret}"}
 * 2. Extract access_token from response (supports payload.access_token and access_token formats)
 * 3. Use token in Authorization: Bearer header
 */

import type { MCPAuthConfig, MCPJWTAuthConfig } from '../../types/mcp';

// Default timeout for JWT requests (30 seconds)
const DEFAULT_TIMEOUT_MS = 30000;

// Cache for JWT tokens (keyed by api_url + api_token)
// Format: Map<cacheKey, { token: string, expiresAt: number }>
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// Token cache TTL (15 minutes - conservative to account for clock skew)
const TOKEN_CACHE_TTL_MS = 15 * 60 * 1000;

export class MCPAuthError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'MCPAuthError';
  }
}

/**
 * Generate cache key for JWT token
 */
function getCacheKey(config: MCPJWTAuthConfig): string {
  return `${config.api_url}:${config.api_token}`;
}

/**
 * Fetch JWT token from API endpoint
 *
 * @param config - JWT authentication configuration
 * @param options - Optional settings (timeout, force refresh)
 * @returns JWT access token
 * @throws MCPAuthError if token fetch fails
 */
export async function fetchJWTToken(
  config: MCPJWTAuthConfig,
  options: { timeoutMs?: number; forceRefresh?: boolean } = {}
): Promise<string> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, forceRefresh = false } = options;

  // Check cache first (unless force refresh requested)
  if (!forceRefresh) {
    const cacheKey = getCacheKey(config);
    const cached = tokenCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(
        `🔐 [MCP JWT] Using cached token for ${config.api_url} (expires in ${Math.round((cached.expiresAt - Date.now()) / 1000)}s)`
      );
      return cached.token;
    }
  }

  console.log(`🔐 [MCP JWT] Fetching token from: ${config.api_url}`);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Make POST request to JWT API endpoint
    // Following testmcpy pattern: POST {"name": api_token, "secret": api_secret}
    const response = await fetch(config.api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: config.api_token,
        secret: config.api_secret,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const responseBody = await response.text().catch(() => 'Unable to read response body');
      throw new MCPAuthError(
        `JWT token request failed with status ${response.status}: ${response.statusText}`,
        response.status,
        responseBody
      );
    }

    const data = (await response.json()) as {
      access_token?: string;
      payload?: { access_token?: string };
    };

    // Extract access token from response
    // Supports both {"payload": {"access_token": "..."}} and {"access_token": "..."}
    let token: string | undefined;

    if (data.payload && typeof data.payload.access_token === 'string') {
      token = data.payload.access_token;
    } else if (typeof data.access_token === 'string') {
      token = data.access_token;
    }

    if (!token) {
      throw new MCPAuthError(
        'No access_token found in JWT response. Expected { access_token: "..." } or { payload: { access_token: "..." } }',
        undefined,
        JSON.stringify(data)
      );
    }

    console.log(`🔐 [MCP JWT] Token fetched successfully (length: ${token.length})`);

    // Cache the token
    const cacheKey = getCacheKey(config);
    tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });

    return token;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof MCPAuthError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new MCPAuthError(`JWT token request timed out after ${timeoutMs}ms`);
      }
      throw new MCPAuthError(`JWT token fetch error: ${error.message}`);
    }

    throw new MCPAuthError(`JWT token fetch error: ${String(error)}`);
  }
}

/**
 * Resolve authentication token from MCP auth config
 *
 * @param auth - MCP authentication configuration (none, bearer, or jwt)
 * @returns Bearer token string or undefined if no auth
 */
export async function resolveMCPAuthToken(
  auth: MCPAuthConfig | undefined
): Promise<string | undefined> {
  if (!auth || auth.type === 'none') {
    return undefined;
  }

  if (auth.type === 'bearer') {
    return auth.token;
  }

  if (auth.type === 'jwt') {
    return fetchJWTToken(auth);
  }

  // Type guard - should never reach here if types are correct
  console.warn(`⚠️ [MCP Auth] Unknown auth type: ${(auth as { type: string }).type}`);
  return undefined;
}

/**
 * Clear cached JWT token for a specific config
 */
export function clearJWTTokenCache(config: MCPJWTAuthConfig): void {
  const cacheKey = getCacheKey(config);
  tokenCache.delete(cacheKey);
  console.log(`🔐 [MCP JWT] Cleared cached token for ${config.api_url}`);
}

/**
 * Clear all cached JWT tokens
 */
export function clearAllJWTTokenCache(): void {
  const count = tokenCache.size;
  tokenCache.clear();
  console.log(`🔐 [MCP JWT] Cleared ${count} cached token(s)`);
}
