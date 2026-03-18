import { Context } from 'hono';
import { validateProxyUrl, sanitizeHeaders } from './validation';
import { formatError, ErrorCode } from './errors';
import { TIMEOUTS, HTTP_HEADERS } from '../config/constants';
import type { Bindings, Variables } from '../types/env';

export interface ProxyOptions {
    timeout?: number;
    preserveHeaders?: string[];
    injectHeaders?: Record<string, string>;
    removeHeaders?: string[];
}

export interface ProxyResponse {
    status: number;
    headers: Record<string, string>;
    body: unknown;
}

/**
 * Generic proxy request handler
 * Forwards request to target service with proper validation and headers management
 */
export async function proxyRequest(
    c: Context<{ Bindings: Bindings; Variables: Variables }>,
    targetUrl: string,
    method: string = c.req.method,
    options: ProxyOptions = {}
): Promise<Response> {
    try {
        // Validate target URL
        const validation = validateProxyUrl(targetUrl);
        if (!validation.valid) {
            console.error(`Invalid proxy URL: ${validation.error}`, validation.details);
            return c.json(
                formatError(
                    400,
                    ErrorCode.INVALID_URL,
                    validation.error || 'Invalid proxy URL'
                ),
                400
            );
        }

        // Get request headers and sanitize them
        const requestHeaders: Record<string, string> = {};
        const request = c.req.raw;

        // Copy headers from the request
        if (request.headers) {
            request.headers.forEach((value, name) => {
                requestHeaders[name] = value;
            });
        }

        const sanitized = sanitizeHeaders(requestHeaders);

        // Remove specific headers if requested
        if (options.removeHeaders) {
            for (const header of options.removeHeaders) {
                delete sanitized[header.toLowerCase()];
            }
        }

        // Inject custom headers (user context, etc)
        if (options.injectHeaders) {
            Object.assign(sanitized, options.injectHeaders);
        }

        // Prepare request body
        let body: BodyInit | undefined;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
                // For better performance in Workers, use the original request body stream if possible
                // Note: Consumption here will make it unavailable for later use in this context
                body = (c.req.raw.body as any) ?? undefined;
            } catch (e) {
                console.warn('Could not access request body stream:', e);
                body = undefined;
            }
        }

        // Setup timeout
        const controller = new AbortController();
        const timeout = options.timeout || TIMEOUTS.DEFAULT;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // Diagnostic logs
            console.log(`[Proxy] Forwarding ${method} to ${targetUrl}`);
            console.log(`[Proxy] Sanitized Headers:`, JSON.stringify(sanitized));

            // Make proxy request
            const response = await fetch(targetUrl, {
                method,
                headers: sanitized,
                body,
                signal: controller.signal,
                // @ts-ignore - duplex is required when sending a body in some runtimes
                duplex: 'half',
            });

            clearTimeout(timeoutId);

            // Get response headers
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            // Get response body
            const contentType = response.headers.get('content-type');
            let finalBody: unknown;

            if (contentType?.includes('application/json')) {
                finalBody = await response.json();
            } else {
                finalBody = await response.text();
            }

            return c.json(finalBody, response.status as any, responseHeaders);
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                return c.json(
                    formatError(
                        504,
                        ErrorCode.GATEWAY_TIMEOUT,
                        `Request timeout after ${timeout}ms`
                    ),
                    504
                );
            }

            throw error;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Proxy request failed: ${message}`, error);

        return c.json(
            formatError(
                502,
                ErrorCode.SERVICE_UNAVAILABLE,
                `Failed to proxy request: ${message}`
            ),
            502
        );
    }
}

/**
 * Build proxy URL from base URL and path
 */
export function buildProxyUrl(baseUrl: string, path: string): string {
    // Remove trailing slash from base
    const cleanBase = baseUrl.replace(/\/$/, '');

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Handle double slashes (in case of malformed paths)
    return `${cleanBase}${cleanPath}`.replace(/(?<!:)\/\//g, '/');
}

/**
 * Build user context headers to inject into proxy requests
 */
export function buildUserHeaders(
    userId?: string,
    userEmail?: string
): Record<string, string> {
    const headers: Record<string, string> = {};

    if (userId) {
        headers[HTTP_HEADERS.USER_ID] = userId;
    }

    if (userEmail) {
        headers[HTTP_HEADERS.USER_EMAIL] = userEmail;
    }

    return headers;
}

/**
 * Build request ID header for correlation
 */
export function buildRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
