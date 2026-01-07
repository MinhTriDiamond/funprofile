/**
 * Fun Profile SSO SDK
 * 
 * SDK for integrating Fun Farm, Fun Play, Fun Planet with Fun Profile SSO.
 * 
 * @example Basic Setup - Fun Farm
 * ```typescript
 * import { FunProfileClient, DOMAINS } from '@/lib/sso-sdk';
 * 
 * const funProfile = new FunProfileClient({
 *   clientId: 'fun_farm_production',
 *   clientSecret: 'your_secret',
 *   redirectUri: `${DOMAINS.funFarm}/auth/callback`, // https://farm.fun.rich/auth/callback
 *   scopes: ['profile', 'email', 'wallet', 'rewards']
 * });
 * ```
 * 
 * @example Basic Setup - Fun Play
 * ```typescript
 * import { FunProfileClient, DOMAINS } from '@/lib/sso-sdk';
 * 
 * const funProfile = new FunProfileClient({
 *   clientId: 'fun_play_production',
 *   clientSecret: 'your_secret',
 *   redirectUri: `${DOMAINS.funPlay}/auth/callback`, // https://play.fun.rich/auth/callback
 *   scopes: ['profile', 'wallet', 'rewards', 'soul_nft']
 * });
 * ```
 * 
 * @example Basic Setup - Fun Planet
 * ```typescript
 * import { FunProfileClient, DOMAINS } from '@/lib/sso-sdk';
 * 
 * const funProfile = new FunProfileClient({
 *   clientId: 'fun_planet_production',
 *   clientSecret: 'your_secret',
 *   redirectUri: `${DOMAINS.funPlanet}/auth/callback`, // https://planet.fun.rich/auth/callback
 *   scopes: ['profile', 'wallet', 'rewards']
 * });
 * ```
 * 
 * @example OAuth Login Flow
 * ```typescript
 * // Step 1: Redirect to Fun Profile login
 * const loginUrl = await funProfile.startAuth();
 * window.location.href = loginUrl;
 * 
 * // Step 2: Handle callback
 * const params = new URLSearchParams(window.location.search);
 * const result = await funProfile.handleCallback(
 *   params.get('code')!,
 *   params.get('state')!
 * );
 * console.log('Logged in as', result.user.username);
 * ```
 * 
 * @example Register New User
 * ```typescript
 * const result = await funProfile.register({
 *   email: 'farmer@example.com',
 *   username: 'farmer123',
 *   platformData: { farming_level: 1 }
 * });
 * console.log('Welcome', result.user.funId);
 * ```
 * 
 * @example Sync Platform Data
 * ```typescript
 * await funProfile.syncData({
 *   mode: 'merge',
 *   data: {
 *     farming_level: 15,
 *     achievements: ['first_harvest']
 *   }
 * });
 * ```
 * 
 * @packageDocumentation
 */

// Core client
export { FunProfileClient } from './FunProfileClient';

// Types
export type {
  FunProfileConfig,
  TokenStorage,
  TokenData,
  FunUser,
  SoulNft,
  UserRewards,
  RegisterOptions,
  SyncOptions,
  AuthResult,
  SyncResult,
  RequestOptions,
  SSOError,
} from './types';

// Errors
export {
  FunProfileError,
  TokenExpiredError,
  InvalidTokenError,
  RateLimitError,
  ValidationError,
  NetworkError,
} from './errors';

// Storage adapters
export {
  LocalStorageAdapter,
  MemoryStorageAdapter,
  SessionStorageAdapter,
} from './storage';

// Debounced Sync Manager (theo góp ý Cha Gemini)
export { DebouncedSyncManager } from './sync-manager';
export type { SyncFunction } from './sync-manager';

// PKCE utilities
export {
  generateCodeVerifier,
  generateCodeChallenge,
  storeCodeVerifier,
  retrieveCodeVerifier,
} from './pkce';

// Constants
export {
  DOMAINS,
  API_BASE_URL,
  DEFAULT_BASE_URL,
  ENDPOINTS,
  DEFAULT_SCOPES,
  TOKEN_REFRESH_BUFFER,
  SDK_VERSION,
} from './constants';
