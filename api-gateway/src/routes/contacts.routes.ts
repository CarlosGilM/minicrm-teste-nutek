import { Hono } from 'hono';
import { proxy } from 'hono/proxy';
import { authMiddleware } from '../middlewares/auth.middleware';
import type { Bindings, Variables } from '../types/env';

const contacts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All contacts routes require authentication
contacts.use('*', authMiddleware);

// GET /contacts -> n8n webhook
contacts.get('/', async (c) => {
  const targetUrl = `${c.env.N8N_WEBHOOK_URL || 'http://n8n.localhost'}/webhook/contacts`.replace(/(?<!:)\/\//g, '/');

  try {
    const requestHeaders = new Headers(c.req.raw.headers);
    requestHeaders.set('x-user-id', c.get('userId'));
    requestHeaders.set('x-user-email', c.get('userEmail'));
    requestHeaders.set('Content-Type', 'application/json');

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: requestHeaders,
    });

    const responseHeaders = new Headers(response.headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (e: any) {
    return c.json({ error: 'Proxy failed', message: e.message }, 500);
  }
});

// POST /contacts -> n8n webhook
contacts.post('/', async (c) => {
  const basePath = c.env.N8N_WEBHOOK_URL || 'http://n8n.localhost';
  const targetUrl = `${basePath}/webhook/contacts`.replace(/(?<!:)\/\//g, '/');

  let targetHost = 'n8n.localhost';
  try {
    targetHost = new URL(basePath).host;
  } catch(e) {}

  try {
    const requestHeaders = new Headers(c.req.raw.headers);
    requestHeaders.set('x-user-id', c.get('userId'));
    requestHeaders.set('x-user-email', c.get('userEmail'));
    requestHeaders.set('host', targetHost);

    const body = await c.req.blob();

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: body,
      redirect: 'manual'
    });

    const responseHeaders = new Headers(response.headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (e: any) {
    return c.json({ error: 'Proxy failed', message: e.message }, 500);
  }
});

// DELETE /contacts/:id -> n8n webhook (with id as query param)
contacts.delete('/:id', async (c) => {
  const contactId = c.req.param('id');
  const targetUrl = `${c.env.N8N_WEBHOOK_URL || 'http://n8n.localhost'}/webhook/contacts?id=${contactId}`.replace(/(?<!:)\/\//g, '/');

  try {
    const requestHeaders = new Headers(c.req.raw.headers);
    requestHeaders.set('x-user-id', c.get('userId'));
    requestHeaders.set('x-user-email', c.get('userEmail'));
    requestHeaders.set('Content-Type', 'application/json');

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: requestHeaders,
    });

    const responseHeaders = new Headers(response.headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (e: any) {
    return c.json({ error: 'Proxy failed', message: e.message }, 500);
  }
});

export default contacts;
