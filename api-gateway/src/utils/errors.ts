/**
 * Error codes for API responses
 */
export enum ErrorCode {
    // Authentication errors (4xx)
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_MALFORMED = 'TOKEN_MALFORMED',
    MISSING_AUTH_HEADER = 'MISSING_AUTH_HEADER',

    // Validation errors (4xx)
    INVALID_URL = 'INVALID_URL',
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

    // Server errors (5xx)
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

    // Configuration errors (5xx)
    MISSING_CONFIGURATION = 'MISSING_CONFIGURATION',
    INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
}

/**
 * Standard API error response format
 */
export interface ApiError {
    error: ErrorCode;
    message: string;
    statusCode: number;
    timestamp: string;
    requestId?: string;
    details?: Record<string, unknown>;
}

/**
 * Format standardized error response
 */
export function formatError(
    statusCode: number,
    errorCode: ErrorCode,
    message: string,
    details?: Record<string, unknown>
): ApiError {
    return {
        error: errorCode,
        message,
        statusCode,
        timestamp: new Date().toISOString(),
        details,
    };
}

/**
 * Check if error is JWT-related
 */
export function isJWTError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return ['JWTExpired', 'JWTInvalid', 'JWTClaimValidationFailed'].some(
        type => error.constructor.name === type
    );
}

/**
 * Extract JWT error type
 */
export function getJWTErrorCode(error: unknown): ErrorCode {
    if (!(error instanceof Error)) return ErrorCode.INVALID_TOKEN;

    const errorName = error.constructor.name;

    if (errorName === 'JWTExpired') return ErrorCode.TOKEN_EXPIRED;
    if (errorName === 'JWTInvalid') return ErrorCode.INVALID_TOKEN;
    if (errorName === 'JWTClaimValidationFailed') return ErrorCode.INVALID_TOKEN;

    return ErrorCode.INVALID_TOKEN;
}
