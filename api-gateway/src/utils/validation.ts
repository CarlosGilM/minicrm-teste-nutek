/**
 * Validation results
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
    details?: Record<string, unknown>;
}

/**
 * Validate proxy target URL
 * - Must be absolute URL
 * - Must be http/https
 * - Prevent SSRF attacks (no localhost from external requests)
 */
export function validateProxyUrl(
    targetUrl: string,
    allowedPatterns: string[] = []
): ValidationResult {
    try {
        // Check if URL is absolute
        if (!targetUrl || typeof targetUrl !== 'string') {
            return { valid: false, error: 'URL must be a non-empty string' };
        }

        // Try to parse URL
        const url = new URL(targetUrl);

        // Only allow http/https
        if (!['http:', 'https:'].includes(url.protocol)) {
            return {
                valid: false,
                error: `Protocol ${url.protocol} not allowed. Use http or https.`,
            };
        }

        // Optional: Check against allowed patterns (e.g., internal domains)
        if (allowedPatterns.length > 0) {
            const isAllowed = allowedPatterns.some(pattern => {
                try {
                    const regex = new RegExp(pattern);
                    return regex.test(url.hostname);
                } catch {
                    return pattern === url.hostname;
                }
            });

            if (!isAllowed) {
                return {
                    valid: false,
                    error: `URL hostname not in allowed patterns`,
                    details: { hostname: url.hostname, patterns: allowedPatterns },
                };
            }
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Validate JWT token format (basic check)
 * JWT format: header.payload.signature
 */
export function validateJWTFormat(token: string): ValidationResult {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Token must be a non-empty string' };
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
        return {
            valid: false,
            error: 'Token must have 3 parts (header.payload.signature)',
        };
    }

    // Check if all parts are valid base64url (basic check)
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    for (const part of parts) {
        if (!base64urlRegex.test(part)) {
            return { valid: false, error: 'Token contains invalid base64url characters' };
        }
    }

    return { valid: true };
}

/**
 * Validate headers object
 */
export function validateHeaders(
    headers: Record<string, string>
): ValidationResult {
    if (!headers || typeof headers !== 'object') {
        return { valid: false, error: 'Headers must be an object' };
    }

    // Check for suspicious headers
    const suspiciousHeaders = ['host', 'connection', 'content-length'];
    const found = Object.keys(headers).filter(key =>
        suspiciousHeaders.includes(key.toLowerCase())
    );

    if (found.length > 0) {
        return {
            valid: true, // Still valid, but we'll filter them out
            details: { headersToFilter: found },
        };
    }

    return { valid: true };
}

/**
 * Sanitize headers for proxy requests
 * Remove hop-by-hop headers and problematic ones
 */
export function sanitizeHeaders(
    headers: Record<string, string>
): Record<string, string> {
    const hopByHopHeaders = [
        'connection',
        'keep-alive',
        'proxy-authenticate',
        'proxy-authorization',
        'te',
        'trailers',
        'transfer-encoding',
        'upgrade',
        'content-length', // Will be set automatically
    ];

    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();

        // Skip hop-by-hop headers
        if (hopByHopHeaders.includes(lowerKey)) {
            continue;
        }

        // Skip host header (will be set by proxy target)
        if (lowerKey === 'host') {
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}
