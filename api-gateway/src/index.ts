import { Hono } from 'hono';
import type { Bindings, Variables } from './types/env';
import { createCorsMiddleware } from './middlewares/cors.middleware';
import { loggingMiddleware } from './middlewares/logging.middleware';
import authRoutes from './routes/auth.routes';
import contactsRoutes from './routes/contacts.routes';
import { healthRoutes } from './routes/health';
import { formatError, ErrorCode } from './utils/errors';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Global Middlewares
 * Order matters: CORS -> Logging -> Error handling
 */

// CORS Middleware (environment-aware origin whitelist)
app.use('*', (c, next) => {
  const corsMiddleware = createCorsMiddleware(c.env);
  return corsMiddleware(c, next);
});

// Logging Middleware
app.use('*', loggingMiddleware);

/**
 * Global error handler
 * Catch unhandled errors and return formatted response
 */
app.onError((error, c) => {
  console.error('Unhandled error:', error);

  const statusCode = (error as any).statusCode || 500;
  const message = error instanceof Error ? error.message : 'Internal Server Error';

  return c.json(
    formatError(statusCode, ErrorCode.INTERNAL_SERVER_ERROR, message),
    statusCode
  );
});

/**
 * Routes
 */

// Health check routes
app.route('', healthRoutes);

// Auth routes (no authentication required)
app.route('/auth', authRoutes);

// Contacts routes (authentication required - middleware applied in router)
app.route('/contacts', contactsRoutes);

/**
 * 404 Handler
 */
app.notFound((c) => {
  return c.json(
    formatError(
      404,
      ErrorCode.INVALID_URL,
      `Route not found: ${c.req.path}`
    ),
    404
  );
});

export default app;
