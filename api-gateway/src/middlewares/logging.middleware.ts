import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types/env';
import { buildRequestId } from '../utils/proxy';

export interface RequestLog {
    timestamp: string;
    requestId: string;
    method: string;
    path: string;
    status: number;
    duration: number;
    userId?: string;
    userEmail?: string;
    error?: string;
}

/**
 * Create structured logging middleware
 * Logs all requests with correlations IDs
 */
export const loggingMiddleware = createMiddleware<{
    Bindings: Bindings;
    Variables: Variables;
}>(async (c, next) => {
    const startTime = Date.now();
    const requestId = buildRequestId();
    const method = c.req.method;
    const path = c.req.path;
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    // Set request ID in variables for downstream use
    c.set('requestId', requestId);

    // Add request ID to response headers
    c.header('X-Request-ID', requestId);

    try {
        // Log incoming request
        const incomingLog: RequestLog = {
            timestamp: new Date().toISOString(),
            requestId,
            method,
            path,
            status: 0,
            duration: 0,
            ...(userId && { userId }),
            ...(userEmail && { userEmail }),
        };

        console.log(
            JSON.stringify({
                level: 'info',
                type: 'request',
                ...incomingLog,
            })
        );

        // Process request
        await next();

        // Get response status
        const status = c.res.status;
        const duration = Date.now() - startTime;

        // Log outgoing response
        const outgoingLog: RequestLog = {
            timestamp: new Date().toISOString(),
            requestId,
            method,
            path,
            status,
            duration,
            ...(userId && { userId }),
            ...(userEmail && { userEmail }),
        };

        console.log(
            JSON.stringify({
                level: status >= 400 ? 'warn' : 'info',
                type: 'response',
                ...outgoingLog,
            })
        );
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorLog: RequestLog = {
            timestamp: new Date().toISOString(),
            requestId,
            method,
            path,
            status: 500,
            duration,
            ...(userId && { userId }),
            ...(userEmail && { userEmail }),
            error: error instanceof Error ? error.message : 'Unknown error',
        };

        console.log(
            JSON.stringify({
                level: 'error',
                type: 'error',
                ...errorLog,
            })
        );

        throw error;
    }
});

/**
 * Format logs in JSON for easy parsing
 */
export function formatRequestLog(log: RequestLog): string {
    return JSON.stringify(log);
}
