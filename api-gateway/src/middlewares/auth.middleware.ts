import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { Bindings, Variables } from '../types/env';
import {
  ErrorCode,
  formatError,
  getJWTErrorCode,
  isJWTError,
} from '../utils/errors';
import { validateJWTFormat } from '../utils/validation';

export const authMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    try {
      // Validate configuration
      if (!c.env.JWT_SECRET) {
        return c.json(
          formatError(
            500,
            ErrorCode.MISSING_CONFIGURATION,
            'JWT_SECRET is not configured'
          ),
          500
        );
      }

      // Extract token from Authorization header
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json(
          formatError(
            401,
            ErrorCode.MISSING_AUTH_HEADER,
            'Authorization header is required'
          ),
          401
        );
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');

      if (!token) {
        return c.json(
          formatError(
            401,
            ErrorCode.MISSING_AUTH_HEADER,
            'Bearer token is required'
          ),
          401
        );
      }

      // Validate JWT format
      const formatValidation = validateJWTFormat(token);
      if (!formatValidation.valid) {
        return c.json(
          formatError(
            401,
            ErrorCode.TOKEN_MALFORMED,
            formatValidation.error || 'Token format is invalid'
          ),
          401
        );
      }

      // Verify JWT
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });

      // Extract and validate payload
      const userId = payload.sub || (payload.userId as string);
      const userEmail = payload.email as string | undefined;

      if (!userId) {
        return c.json(
          formatError(
            401,
            ErrorCode.INVALID_TOKEN,
            'Token does not contain required user ID'
          ),
          401
        );
      }

      // Inject into context
      c.set('userId', userId);
      if (userEmail) {
        c.set('userEmail', userEmail);
      }

      await next();
    } catch (error) {
      // Handle JWT-specific errors
      if (isJWTError(error)) {
        const errorCode = getJWTErrorCode(error);
        return c.json(
          formatError(
            401,
            errorCode,
            error instanceof Error ? error.message : 'Token verification failed'
          ),
          401
        );
      }

      // Handle unexpected errors
      console.error('Auth middleware error:', error);
      return c.json(
        formatError(
          500,
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Authentication failed'
        ),
        500
      );
    }
  }
);
