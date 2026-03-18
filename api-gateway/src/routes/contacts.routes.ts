import { Hono } from 'hono';
import { proxyRequest, buildProxyUrl, buildUserHeaders } from '../utils/proxy';
import { authMiddleware } from '../middlewares/auth.middleware';
import type { Bindings, Variables } from '../types/env';

const contacts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all contacts routes
contacts.use('*', authMiddleware);

/**
 * GET /contacts
 * List all contacts (requires authentication)
 */
contacts.get('/', async (c) => {
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');

  const targetUrl = buildProxyUrl(c.env.N8N_WEBHOOK_URL, '/contacts');

  // Build user context headers
  const userHeaders = buildUserHeaders(userId, userEmail);

  return proxyRequest(c, targetUrl, 'GET', {
    timeout: 60_000, // 60 seconds for n8n
    injectHeaders: userHeaders,
  });
});

/**
 * POST /contacts
 * Create new contact (requires authentication)
 */
contacts.post('/', async (c) => {
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');

  const targetUrl = buildProxyUrl(c.env.N8N_WEBHOOK_URL, '/contacts');

  const userHeaders = buildUserHeaders(userId, userEmail);

  return proxyRequest(c, targetUrl, 'POST', {
    timeout: 60_000,
    injectHeaders: userHeaders,
  });
});

/**
 * DELETE /contacts/:id
 * Delete contact by ID (requires authentication)
 * Note: n8n expects ID as query parameter
 */
contacts.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');
  const contactId = c.req.param('id');

  // Build URL with ID as query parameter for n8n
  const baseUrl = buildProxyUrl(c.env.N8N_WEBHOOK_URL, '/contacts');
  const targetUrl = `${baseUrl}?id=${encodeURIComponent(contactId)}`;

  const userHeaders = buildUserHeaders(userId, userEmail);

  return proxyRequest(c, targetUrl, 'DELETE', {
    timeout: 60_000,
    injectHeaders: userHeaders,
  });
});

export default contacts;
