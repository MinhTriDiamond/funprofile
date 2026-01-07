/**
 * Fun Profile SSO SDK - Core Client
 * 
 * @example Fun Farm Integration
 * ```typescript
 * import { DOMAINS } from './constants';
 * 
 * const client = new FunProfileClient({
 *   clientId: 'fun_farm_production',
 *   clientSecret: 'your_secret',
 *   redirectUri: `${DOMAINS.funFarm}/auth/callback`, // https://farm.fun.rich/auth/callback
 *   scopes: ['profile', 'email', 'wallet']
 * });
 * 
 * // Start OAuth flow
 * const loginUrl = await client.startAuth();
 * window.location.href = loginUrl;
 * ```
 * 
 * @example Fun Play Integration
 * ```typescript
 * import { DOMAINS } from './constants';
 * 
 * const client = new FunProfileClient({
 *   clientId: 'fun_play_production',
 *   clientSecret: 'your_secret',
 *   redirectUri: `${DOMAINS.funPlay}/auth/callback`, // https://play.fun.rich/auth/callback
 *   scopes: ['profile', 'wallet', 'rewards', 'soul_nft']
 * });
 * ```
 * 
 * @example Fun Planet Integration
 * ```typescript
 * import { DOMAINS } from './constants';
 * 
 * const client = new FunProfileClient({
 *   clientId: 'fun_planet_production',
 *   clientSecret: 'your_secret',
 *   redirectUri: `${DOMAINS.funPlanet}/auth/callback`, // https://planet.fun.rich/auth/callback
 *   scopes: ['profile', 'wallet', 'rewards']
 * });
 * ```
 */

import type {
  FunProfileConfig,
  TokenStorage,
  TokenData,
  FunUser,
  AuthResult,
  SyncResult,
  RegisterOptions,
  SyncOptions,
  RequestOptions,
} from './types';
import {
  FunProfileError,
  InvalidTokenError,
  RateLimitError,
  ValidationError,
  NetworkError,
} from './errors';
import { LocalStorageAdapter } from './storage';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  storeCodeVerifier,
  retrieveCodeVerifier,
} from './pkce';
import {
  DEFAULT_BASE_URL,
  ENDPOINTS,
  DEFAULT_SCOPES,
  TOKEN_REFRESH_BUFFER,
} from './constants';
import { DebouncedSyncManager } from './sync-manager';

export class FunProfileClient {
  private config: Required<Omit<FunProfileConfig, 'clientSecret'>> & { clientSecret?: string };
  private storage: TokenStorage;
  private currentUser: FunUser | null = null;
  private refreshPromise: Promise<TokenData> | null = null;
  private syncManager: DebouncedSyncManager | null = null;

  constructor(config: FunProfileConfig) {
    this.config = {
      baseUrl: DEFAULT_BASE_URL,
      scopes: DEFAULT_SCOPES,
      autoRefresh: true,
      storage: new LocalStorageAdapter(config.clientId),
      ...config,
    };
    this.storage = this.config.storage;
  }

  // =====================
  // Authentication Methods
  // =====================

  /**
   * Start OAuth authorization flow
   * Returns URL to redirect user to Fun Profile login
   * 
   * @param options - Optional state parameter for CSRF protection
   * @returns Authorization URL to redirect user to
   */
  async startAuth(options?: { state?: string }): Promise<string> {
    const state = options?.state || this.generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store verifier for later exchange
    storeCodeVerifier(codeVerifier, state);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.config.baseUrl}${ENDPOINTS.authorize}?${params}`;
  }

  /**
   * Handle OAuth callback and exchange authorization code for tokens
   * 
   * @param code - Authorization code from callback
   * @param state - State parameter from callback
   * @returns Authentication result with tokens and user info
   */
  async handleCallback(code: string, state: string): Promise<AuthResult> {
    const codeVerifier = retrieveCodeVerifier(state);
    if (!codeVerifier) {
      throw new ValidationError('PKCE verifier not found. Invalid or expired state.');
    }

    const body: Record<string, unknown> = {
      grant_type: 'authorization_code',
      code,
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    };

    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret;
    }

    const response = await this.request(ENDPOINTS.token, {
      method: 'POST',
      body,
    });

    await this.handleTokenResponse(response);
    return this.transformAuthResult(response);
  }

  /**
   * Register a new user from the platform
   * Creates a Fun Profile account and returns tokens
   * 
   * @param options - Registration options (email, username, etc.)
   * @returns Authentication result with tokens and user info
   */
  async register(options: RegisterOptions): Promise<AuthResult> {
    const body: Record<string, unknown> = {
      client_id: this.config.clientId,
      scope: this.config.scopes.join(' '),
    };

    if (this.config.clientSecret) {
      body.client_secret = this.config.clientSecret;
    }

    if (options.email) body.email = options.email;
    if (options.phone) body.phone = options.phone;
    if (options.username) body.username = options.username;
    if (options.fullName) body.full_name = options.fullName;
    if (options.avatarUrl) body.avatar_url = options.avatarUrl;
    if (options.platformData) body.platform_data = options.platformData;

    const response = await this.request(ENDPOINTS.register, {
      method: 'POST',
      body,
    });

    await this.handleTokenResponse(response);
    return this.transformAuthResult(response);
  }

  /**
   * Logout user and revoke all tokens
   * Sẽ tự động flush pending sync data trước khi logout
   */
  async logout(): Promise<void> {
    // Flush pending sync data trước khi logout (theo góp ý Cha Gemini)
    if (this.syncManager) {
      try {
        await this.syncManager.flush();
      } catch {
        // Ignore sync errors during logout
      }
      this.syncManager = null;
    }

    const tokens = await this.storage.getTokens();
    if (tokens) {
      try {
        await this.request(ENDPOINTS.revoke, {
          method: 'POST',
          body: {
            token: tokens.accessToken,
            token_type_hint: 'access_token',
            client_id: this.config.clientId,
          },
        });
      } catch {
        // Ignore revoke errors, clear local tokens anyway
      }
    }
    await this.storage.clearTokens();
    this.currentUser = null;
  }

  // =====================
  // Debounced Sync Manager
  // =====================

  /**
   * Lấy Debounced Sync Manager
   * Dùng để tích lũy nhiều thay đổi trước khi sync
   * 
   * @param debounceMs - Thời gian chờ (mặc định 3000ms)
   * @returns DebouncedSyncManager instance
   * 
   * @example
   * ```typescript
   * const syncManager = funProfile.getSyncManager(3000);
   * 
   * // Trong game loop - chỉ queue, không gọi API
   * syncManager.queue('farm_stats', { harvested: 100 });
   * syncManager.queue('farm_stats', { harvested: 200 });
   * // Sau 3 giây không có action mới → tự động sync { harvested: 200 }
   * 
   * // Force sync khi cần (logout, close tab)
   * await syncManager.flush();
   * ```
   */
  getSyncManager(debounceMs = 3000): DebouncedSyncManager {
    if (!this.syncManager) {
      this.syncManager = new DebouncedSyncManager(
        async (data) => {
          await this.syncData({
            mode: 'merge',
            data,
            clientTimestamp: new Date().toISOString(),
          });
        },
        debounceMs
      );
    }
    return this.syncManager;
  }

  // =====================
  // User Data Methods
  // =====================

  /**
   * Get current authenticated user's profile
   * 
   * @returns User profile data
   */
  async getUser(): Promise<FunUser> {
    const response = await this.authenticatedRequest(ENDPOINTS.verify);
    this.currentUser = this.transformUser(response);
    return this.currentUser;
  }

  /**
   * Get cached user (without API call)
   */
  getCachedUser(): FunUser | null {
    return this.currentUser;
  }

  /**
   * Sync platform data to Fun Profile
   * 
   * @param options - Sync options (mode, data, categories)
   * @returns Sync result with details
   */
  async syncData(options: SyncOptions): Promise<SyncResult> {
    const body: Record<string, unknown> = {
      sync_mode: options.mode,
      data: options.data,
    };

    if (options.categories) body.categories = options.categories;
    if (options.clientTimestamp) body.client_timestamp = options.clientTimestamp;

    const response = await this.authenticatedRequest(ENDPOINTS.syncData, {
      method: 'POST',
      body,
    });

    return {
      success: Boolean(response.success),
      syncedAt: String(response.synced_at || ''),
      syncMode: String(response.sync_mode || ''),
      syncCount: Number(response.sync_count) || 0,
      categoriesUpdated: (response.categories_updated as string[]) || [],
      dataSize: Number(response.data_size) || 0,
    };
  }

  // =====================
  // Token Management
  // =====================

  /**
   * Check if user is currently authenticated
   * Will attempt to refresh token if expired and autoRefresh is enabled
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.storage.getTokens();
    if (!tokens) return false;

    // Check if access token is expired
    if (Date.now() >= tokens.expiresAt) {
      if (this.config.autoRefresh) {
        try {
          await this.refreshTokens();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    return true;
  }

  /**
   * Get current access token
   * Will auto-refresh if needed and autoRefresh is enabled
   */
  async getAccessToken(): Promise<string | null> {
    let tokens = await this.storage.getTokens();
    if (!tokens) return null;

    // Check if refresh is needed (before expiry buffer)
    const needsRefresh = Date.now() >= tokens.expiresAt - TOKEN_REFRESH_BUFFER;

    if (needsRefresh && this.config.autoRefresh) {
      try {
        tokens = await this.refreshTokens();
      } catch {
        return null;
      }
    }

    return tokens.accessToken;
  }

  /**
   * Get current tokens (for debugging or manual management)
   */
  async getTokens(): Promise<TokenData | null> {
    return this.storage.getTokens();
  }

  /**
   * Manually refresh access token using refresh token
   */
  async refreshTokens(): Promise<TokenData> {
    // Prevent concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<TokenData> {
    const tokens = await this.storage.getTokens();
    if (!tokens) {
      throw new InvalidTokenError('No refresh token available');
    }

    const response = await this.request(ENDPOINTS.refresh, {
      method: 'POST',
      body: {
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: this.config.clientId,
      },
    });

    return await this.handleTokenResponse(response);
  }

  // =====================
  // Helper Methods
  // =====================

  private async handleTokenResponse(response: Record<string, unknown>): Promise<TokenData> {
    const tokens: TokenData = {
      accessToken: response.access_token as string,
      refreshToken: response.refresh_token as string,
      expiresAt: Date.now() + (response.expires_in as number) * 1000,
      scope: ((response.scope as string) || '').split(' '),
    };

    await this.storage.setTokens(tokens);

    if (response.user) {
      this.currentUser = this.transformUser(response.user as Record<string, unknown>);
    }

    return tokens;
  }

  private transformAuthResult(response: Record<string, unknown>): AuthResult {
    return {
      accessToken: String(response.access_token || ''),
      refreshToken: String(response.refresh_token || ''),
      expiresIn: Number(response.expires_in) || 0,
      scope: String(response.scope || ''),
      user: this.transformUser((response.user || response) as Record<string, unknown>),
      isNewUser: Boolean(response.is_new_user),
    };
  }

  private transformUser(data: Record<string, unknown>): FunUser {
    return {
      id: (data.sub || data.id) as string,
      funId: data.fun_id as string,
      username: data.username as string,
      fullName: data.full_name as string | undefined,
      avatarUrl: data.avatar_url as string | undefined,
      email: data.email as string | undefined,
      walletAddress: data.wallet_address as string | undefined,
      externalWalletAddress: data.external_wallet_address as string | undefined,
      soul: data.soul_nft || data.soul
        ? {
            element: ((data.soul_nft || data.soul) as Record<string, unknown>).element as string,
            level: ((data.soul_nft || data.soul) as Record<string, unknown>).level as number,
            tokenId: ((data.soul_nft || data.soul) as Record<string, unknown>).token_id as string | undefined,
            mintedAt: ((data.soul_nft || data.soul) as Record<string, unknown>).minted_at as string | undefined,
          }
        : undefined,
      rewards: data.rewards
        ? {
            pending: (data.rewards as Record<string, unknown>).pending as number,
            approved: (data.rewards as Record<string, unknown>).approved as number,
            claimed: (data.rewards as Record<string, unknown>).claimed as number,
            status: (data.rewards as Record<string, unknown>).status as string,
          }
        : undefined,
    };
  }

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (x) => x.toString(16).padStart(2, '0')).join('');
  }

  private async request(endpoint: string, options: RequestOptions = {}): Promise<Record<string, unknown>> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleError(response.status, data);
      }

      return data;
    } catch (error) {
      if (error instanceof FunProfileError) {
        throw error;
      }
      throw new NetworkError((error as Error).message);
    }
  }

  private async authenticatedRequest(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<Record<string, unknown>> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new InvalidTokenError('Not authenticated');
    }

    return this.request(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  private handleError(status: number, data: Record<string, unknown>): never {
    const errorDescription = (data.error_description || data.message || 'Unknown error') as string;
    const errorCode = (data.error || 'unknown') as string;

    switch (status) {
      case 401:
        throw new InvalidTokenError(errorDescription);
      case 429:
        throw new RateLimitError(parseInt(data.retry_after as string) || 60);
      case 413:
        throw new ValidationError('Payload too large', data.details as Record<string, unknown>);
      case 422:
        throw new ValidationError(errorDescription, data.details as Record<string, unknown>);
      default:
        throw new FunProfileError(errorCode, errorDescription, data.details as Record<string, unknown>);
    }
  }
}
