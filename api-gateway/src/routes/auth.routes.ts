import { Hono } from 'hono';
import { proxy } from 'hono/proxy';
import type { Bindings, Variables } from '../types/env';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.post('/:path{.*}', async (c) => {
  const path = c.req.param('path');
  const basePath = c.env.AUTH_SERVICE_URL || 'http://auth.localhost';
  const targetUrl = `${basePath}/auth/${path}`.replace(/(?<!:)\/\//g, '/');
  
  console.log(`[auth proxy] Target URL: ${targetUrl}`);
  console.log(`[auth proxy] AUTH_SERVICE_URL: ${c.env.AUTH_SERVICE_URL}`);

  let targetHost = 'auth.localhost';
  try {
    targetHost = new URL(basePath).host;
  } catch (e) {
    console.error('Failed to parse AUTH_SERVICE_URL host:', e);
  }

  try {
    const upstream = new Request(targetUrl, {
      method: c.req.method,
      body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
      headers: c.req.raw.headers,
      redirect: 'manual'
    });
    
    // Override the host to point to Traefik appropriately (needed for our setup and cloudflare local routing constraints)
    upstream.headers.set('host', targetHost);
    
    const response = await fetch(upstream);
    
    // We must clone the response to safely manipulate and return headers through Hono Response format
    const proxyBody = response.body;
    return new Response(proxyBody, {
      status: response.status,
      headers: response.headers
    });
  } catch (e: any) {
    console.error('Proxy routing failed:', e);
    return c.json({ error: 'Proxy implementation failed', message: e.message, stack: e.stack }, 500);
  }
});

export default auth;
