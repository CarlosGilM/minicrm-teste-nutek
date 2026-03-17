import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Variables } from './types/env';
import authRoutes from './routes/auth.routes';
import contactsRoutes from './routes/contacts.routes';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Enable CORS for all routes
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', service: 'api-gateway' }));

// Register routes
app.route('/auth', authRoutes);
app.route('/contacts', contactsRoutes);

export default app;
