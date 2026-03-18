import { Context, Next } from 'hono';
import { cors as honoCors } from 'hono/cors';
import type { Bindings, Variables } from '../types/env';
import { LOCAL_DEV_ORIGINS } from '../config/constants';

/**
 * Get CORS middleware with environment-aware origin whitelist
 */
export function createCorsMiddleware(env: Bindings) {
    // Build allowed origins from environment
    const allowedOrigins = [
        env.FRONTEND_URL,
        // Add local development origins
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
    ].filter(Boolean); // Remove undefined/empty values

    return honoCors({
        origin: (origin: string) => {
            // If no origin header, we can't validate (e.g., curl requests)
            if (!origin) {
                return '*';
            }

            // Check if origin is in whitelist
            if (allowedOrigins.includes(origin)) {
                return origin;
            }

            // Reject non-whitelisted origins
            console.warn(`CORS rejected origin: ${origin}`);
            return '';
        },
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        exposeHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
        maxAge: 3600, // 1 hour
    });
}

/**
 * Validate origin against whitelist (for non-CORS requests)
 */
export function validateCorsOrigin(
    origin: string | undefined,
    allowedOrigins: string[]
): boolean {
    if (!origin) return true; // Allow requests without origin (server-to-server)
    return allowedOrigins.includes(origin);
}
