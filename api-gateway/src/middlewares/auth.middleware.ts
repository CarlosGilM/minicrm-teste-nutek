import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { Bindings, Variables } from '../types/env';

export const authMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });

      // Inject headers for downstream services
      c.set('userId', payload.userId as string);
      c.set('userEmail', payload.email as string);

      await next();
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
  }
);
