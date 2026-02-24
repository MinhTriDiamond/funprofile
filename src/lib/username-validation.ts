/**
 * Username Validation - Strict rules
 * 
 * Rules:
 * - Lowercase only (a-z, 0-9, _)
 * - No leading/trailing underscore
 * - No consecutive underscores (__)
 * - Length: 3-30 characters
 */

/** Strict username regex: lowercase a-z0-9, single _ separators, no _ at start/end */
export const USERNAME_REGEX = /^(?=.{3,30}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/**
 * Validate username format (client-side).
 * Returns error message key or null if valid.
 */
export function validateUsername(username: string): string | null {
  if (!username || username.length < USERNAME_MIN_LENGTH) {
    return 'authErrorUsernameShort';
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return 'authErrorUsernameLong';
  }
  if (username !== username.toLowerCase()) {
    return 'authErrorUsernameLowercase';
  }
  if (!USERNAME_REGEX.test(username)) {
    return 'authErrorUsernameFormat';
  }
  return null;
}

/**
 * Normalize username input: lowercase + trim
 */
export function normalizeUsername(input: string): string {
  return input.toLowerCase().trim();
}
