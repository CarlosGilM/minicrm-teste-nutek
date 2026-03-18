/**
 * Application constants
 */

export const TIMEOUTS = {
    AUTH_SERVICE: 30_000, // 30 seconds
    N8N_SERVICE: 60_000, // 60 seconds
    DEFAULT: 30_000,
} as const;

export const HTTP_HEADERS = {
    REQUEST_ID: 'x-request-id',
    USER_ID: 'x-user-id',
    USER_EMAIL: 'x-user-email',
    AUTHORIZATION: 'authorization',
    CONTENT_TYPE: 'content-type',
} as const;

export const API_ROUTES = {
    HEALTH: '/health',
    HEALTH_DETAILED: '/health/detailed',
    AUTH: '/auth',
    CONTACTS: '/contacts',
} as const;

export const CORS_DEFAULTS = {
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    HEADERS: ['Content-Type', 'Authorization'],
    EXPOSE_HEADERS: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
    MAX_AGE: 3600, // 1 hour
} as const;

export const STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
} as const;

export const LOCAL_DEV_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
] as const;

export const HOP_BY_HOP_HEADERS = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'content-length',
] as const;
