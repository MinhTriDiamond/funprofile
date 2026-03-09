/**
 * AppError — Standardized error handling for FUN Profile
 *
 * Usage:
 *   throw new AppError('NOT_FOUND', 'Post not found');
 *   catch (err) { if (err instanceof AppError) ... }
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'DUPLICATE'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'WALLET_ERROR'
  | 'REWARD_LOCKED'
  | 'ACCOUNT_LIMITED'
  | 'BANNED'
  | 'INTERNAL';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly statusCode: number;

  constructor(code: ErrorCode, userMessage: string, options?: { cause?: unknown; statusCode?: number }) {
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.statusCode = options?.statusCode ?? ERROR_STATUS_MAP[code] ?? 500;
  }
}

const ERROR_STATUS_MAP: Partial<Record<ErrorCode, number>> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  DUPLICATE: 409,
  RATE_LIMITED: 429,
  NETWORK: 503,
  TIMEOUT: 408,
  INTERNAL: 500,
};

/**
 * Extract a user-friendly message from any error shape.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.userMessage;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Đã xảy ra lỗi không xác định';
}

/**
 * Standard edge function error response shape.
 */
export interface EdgeErrorResponse {
  error: string;
  code?: ErrorCode;
}

/**
 * Standard edge function success response shape.
 */
export interface EdgeSuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

export type EdgeResponse<T = unknown> = EdgeSuccessResponse<T> | EdgeErrorResponse;
