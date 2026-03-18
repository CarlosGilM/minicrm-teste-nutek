import { Hono } from 'hono';
import type { Bindings, Variables } from '../types/env';
import { formatError, ErrorCode } from '../utils/errors';

export const healthRoutes = new Hono<{
    Bindings: Bindings;
    Variables: Variables;
}>();

export interface HealthResponse {
    status: 'ok' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version?: string;
}

export interface DetailedHealthResponse extends HealthResponse {
    services: {
        authService: {
            status: 'ok' | 'error';
            responseTime?: number;
            error?: string;
        };
        n8nService: {
            status: 'ok' | 'error';
            responseTime?: number;
            error?: string;
        };
    };
}

const START_TIME = Date.now();

/**
 * GET /health
 * Simple health check
 */
healthRoutes.get('/health', (c) => {
    const response: HealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - START_TIME,
    };

    return c.json(response, 200);
});

/**
 * GET /health/detailed
 * Detailed health check with dependency status
 */
healthRoutes.get('/health/detailed', async (c) => {
    const startTime = Date.now();

    const services = {
        authService: await checkService(c.env.AUTH_SERVICE_URL),
        n8nService: await checkService(c.env.N8N_WEBHOOK_URL),
    };

    // Determine overall status
    const allOk = Object.values(services).every(s => s.status === 'ok');
    const anyError = Object.values(services).some(s => s.status === 'error');

    const response: DetailedHealthResponse = {
        status: allOk ? 'ok' : anyError ? 'unhealthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - START_TIME,
        services,
    };

    return c.json(response, allOk ? 200 : 503);
});

/**
 * Check if a service is reachable with a simple GET request
 */
async function checkService(
    url: string
): Promise<{
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
}> {
    try {
        const startTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        // Try /health endpoint first, then fall back to base URL
        let checkUrl = url;
        if (!url.endsWith('/health')) {
            checkUrl = url.endsWith('/') ? `${url}health` : `${url}/health`;
        }

        const response = await fetch(checkUrl, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (response.ok) {
            return { status: 'ok', responseTime };
        } else {
            return {
                status: 'error',
                error: `Service returned status ${response.status}`,
                responseTime,
            };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            status: 'error',
            error: message,
        };
    }
}
