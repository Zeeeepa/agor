/**
 * JWT Authentication for MCP Servers
 *
 * Handles JWT token fetching and caching for MCP servers that require JWT authentication.
 * Tokens are cached for 15 minutes to avoid excessive API calls.
 */

interface JWTConfig {
  api_url: string;
  api_token: string;
  api_secret: string;
  insecure?: boolean;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Cache tokens by api_url to avoid refetching
const tokenCache = new Map<string, CachedToken>();

// Token validity duration: 15 minutes (in milliseconds)
const TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * Fetch a JWT token from the authentication endpoint
 *
 * @param config - JWT configuration containing api_url, api_token, and api_secret
 * @returns The access token string
 * @throws Error if token fetch fails
 */
export async function fetchJWTToken(config: JWTConfig): Promise<string> {
  const { api_url, api_token, api_secret } = config;

  // Check cache first
  const cached = tokenCache.get(api_url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // Fetch new token
  const response = await fetch(api_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: api_token,
      secret: api_secret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `JWT token fetch failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    payload?: { access_token?: string };
  };

  // Handle different response formats
  const token = data.access_token || data.payload?.access_token;
  if (!token) {
    throw new Error('JWT response missing access_token field');
  }

  // Cache the token
  tokenCache.set(api_url, {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return token;
}

/**
 * Clear cached token for a specific API URL
 *
 * @param api_url - The API URL to clear from cache
 */
export function clearJWTToken(api_url: string): void {
  tokenCache.delete(api_url);
}

/**
 * Clear all cached JWT tokens
 */
export function clearAllJWTTokens(): void {
  tokenCache.clear();
}

/**
 * Get MCP server connection args with JWT authentication
 *
 * For MCP servers using JWT auth, this returns the mcp-remote compatible
 * command and args with the Bearer token header.
 *
 * @param serverUrl - The MCP server URL
 * @param jwtConfig - JWT configuration
 * @returns Object with command and args for spawning the MCP connection
 */
export async function getMCPRemoteArgsWithJWT(
  serverUrl: string,
  jwtConfig: JWTConfig
): Promise<{ command: string; args: string[] }> {
  const token = await fetchJWTToken(jwtConfig);

  return {
    command: 'npx',
    args: ['mcp-remote', serverUrl, '--header', `Authorization: Bearer ${token}`],
  };
}
