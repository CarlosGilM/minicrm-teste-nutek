import { Hono } from 'hono';
import { proxyRequest, buildProxyUrl } from '../utils/proxy';
import type { Bindings, Variables } from '../types/env';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /auth/*
 * Proxy all auth requests to Auth Service (no authentication required)
 */
auth.post('/:path{.*}', async (c) => {
  const path = `/${c.req.param('path') || ''}`;

  // Build target URL - add /auth prefix since this router is mounted at /auth
  const targetUrl = buildProxyUrl(c.env.AUTH_SERVICE_URL, `/auth${path}`);

  // Proxy to auth service
  return proxyRequest(c, targetUrl, 'POST', {
    timeout: 30_000, // 30 seconds for auth operations
  });
});

/**
 * GET /auth/*
 * Proxy all GET auth requests to Auth Service (no authentication required)
 */
auth.get('/:path{.*}', async (c) => {
  const path = `/${c.req.param('path') || ''}`;

  // Build target URL - add /auth prefix since this router is mounted at /auth
  const targetUrl = buildProxyUrl(c.env.AUTH_SERVICE_URL, `/auth${path}`);

  // Proxy to auth service
  return proxyRequest(c, targetUrl, 'GET', {
    timeout: 30_000,
  });
});

export default auth;
