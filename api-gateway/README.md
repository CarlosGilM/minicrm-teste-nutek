# API Gateway - MiniCRM

Cloudflare Workers-based API Gateway for MiniCRM microservice architecture. Routes requests to Auth Service and n8n workflows with JWT authentication and CORS support.

## Table of Contents

- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- Wrangler CLI v4.4.0+

### Installation

```bash
npm install
```

### Local Development

```bash
# Start local Wrangler development server
npm run dev

# Server runs on http://localhost:8787
```

Test the gateway:

```bash
# Health check
curl http://localhost:8787/health

# Auth endpoint (example)
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

## Local Development

### Setup Environment Variables

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
```

Required variables:

- `JWT_SECRET` - JWT signing key (min 32 chars)
- `AUTH_SERVICE_URL` - Auth service endpoint
- `N8N_WEBHOOK_URL` - n8n webhook endpoint
- `FRONTEND_URL` - Frontend application URL

### Running Tests

```bash
# Type checking
npm run type-check

# Run dev server with watch
npm run dev
```

### Debugging

The development server includes:

- Request/response logging (stdout)
- Stack traces for errors
- CORS rejection logging

Check logs in terminal where `npm run dev` is running.

## Deployment

### Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler authenticated:
   ```bash
   wrangler login
   ```

### Deploy to Production

1. **Configure Production Secrets**

   Set the JWT_SECRET as a Cloudflare Secret:

   ```bash
   wrangler secret put JWT_SECRET --env production
   # Paste your JWT_SECRET when prompted
   ```

2. **Update Configuration**

   Edit `wrangler.toml` to set production values:

   ```toml
   [env.production]
   route = "api.yourdomain.com/*"
   zone_id = "your-cloudflare-zone-id"
   vars = {
     FRONTEND_URL = "https://yourdomain.com",
     AUTH_SERVICE_URL = "https://auth.yourdomain.com",
     N8N_WEBHOOK_URL = "https://n8n.yourdomain.com/webhook"
   }
   ```

3. **Deploy**

   ```bash
   npm run deploy -- --env production
   ```

4. **Verify Deployment**

   ```bash
   curl https://api.yourdomain.com/health
   ```

## API Reference

### Health Check

**GET /health**

Simple health check endpoint.

```bash
curl http://localhost:8787/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-17T10:00:00.000Z",
  "uptime": 123456
}
```

### Detailed Health Check

**GET /health/detailed**

Detailed health check including dependency status.

```bash
curl http://localhost:8787/health/detailed
```

### Auth Service Proxy

**POST /auth/***

Proxy all auth requests. No authentication required.

```bash
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Routes:

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token

### Contacts CRUD

All contacts endpoints require JWT authentication via Authorization header.

**GET /contacts**

List all contacts (requires JWT).

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8787/contacts
```

**POST /contacts**

Create new contact (requires JWT).

```bash
curl -X POST http://localhost:8787/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'
```

**DELETE /contacts/:id**

Delete contact by ID (requires JWT).

```bash
curl -X DELETE http://localhost:8787/contacts/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Configuration

### Environment Variables

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `JWT_SECRET` | JWT signing key | `your-secret-key` | Yes |
| `AUTH_SERVICE_URL` | Auth service URL | `http://localhost:3001` | Yes |
| `N8N_WEBHOOK_URL` | n8n webhook URL | `http://localhost:5678/webhook` | Yes |
| `FRONTEND_URL` | Frontend URL (CORS) | `http://localhost:5173` | Yes |

### CORS Configuration

The gateway automatically whitelists:

- `FRONTEND_URL` (from environment)
- `http://localhost:3000` (dev)
- `http://localhost:5173` (Vite dev)
- `http://localhost:8080` (dev)

To add more origins, modify `src/middlewares/cors.middleware.ts`.

### Request Timeouts

Default timeouts:

- Auth service: 30 seconds
- n8n service: 60 seconds

To change, modify `src/config/constants.ts`.

## Troubleshooting

### JWT_SECRET is undefined

**Problem:** `Error: JWT_SECRET is not configured`

**Solution:**

```bash
# For local development
echo "JWT_SECRET=your-secret-key" >> .env.local

# For production
wrangler secret put JWT_SECRET --env production
```

### CORS Error

**Problem:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**

1. Verify `FRONTEND_URL` environment variable is correct
2. Check that your origin is in the whitelist (add to `cors.middleware.ts` if needed)
3. Test with curl:
   ```bash
   curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:8787/contacts -v
   ```

### Service Unavailable (502/503)

**Problem:** `Service Unavailable` response

**Causes:**

1. Auth Service or n8n not running
2. URLs incorrect in environment variables
3. Network connectivity issue

**Debug:**

```bash
# Check detailed health
curl http://localhost:8787/health/detailed

# Test service connectivity
curl http://localhost:3001/health
curl http://localhost:5678/webhook/health
```

### Request Timeout

**Problem:** `Gateway Timeout` (504)

**Possible causes:**

1. Backend service is slow
2. Network latency issue
3. Request timeout too short

**Solution:**

1. Check backend service performance
2. Increase timeout in `src/config/constants.ts` if needed
3. Check network connectivity

### Invalid Token (401)

**Problem:** `UNAUTHORIZED - Invalid or expired token`

**Solutions:**

1. Verify token is sent in Authorization header:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8787/contacts
   ```

2. Check token expiration:
   ```bash
   # Decode JWT at jwt.io
   ```

3. Regenerate token via auth service:
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'
   ```

## Architecture

```
Client Request
    ↓
CORS Middleware (origin validation)
    ↓
Logging Middleware (request logging)
    ↓
Route Matching
    ├── /auth/* → Auth Routes (no auth required)
    │   └── Proxy to Auth Service
    │
    └── /contacts/* → Auth Middleware (JWT verify)
         └── Contacts Routes
             └── Proxy to n8n
              
Proxy Response
    ↓
Response Headers (add X-Request-ID, etc)
    ↓
Error Handler (if error)
    ↓
Client Response
```

## Development Tips

### Enable Debug Logging

Currently logs are sent to stdout. For more detailed logging, check terminal where `npm run dev` runs.

### Testing with Postman/Insomnia

1. Get valid JWT token:
   ```
   POST http://localhost:8787/auth/login
   ```

2. Copy token from response

3. Use token in subsequent requests:
   ```
   GET http://localhost:8787/contacts
   Header: Authorization: Bearer <token>
   ```

## Security Notes

- JWT tokens should be sent only over HTTPS in production
- CORS is restricted to whitelisted origins only
- Hop-by-hop headers are filtered from proxied requests
- URL validation prevents SSRF attacks
- Secrets stored in Cloudflare Secrets manager (not .toml files)

## Performance

- Gateway runs on Cloudflare edge globally (~200ms worldwide)
- Zero cold starts with Workers
- Request correlation via X-Request-ID for tracing
- Structured logging for analysis

## File Structure

```
src/
├── index.ts                          # Main app
├── config/constants.ts               # Constants
├── middlewares/
│   ├── auth.middleware.ts            # JWT verification
│   ├── cors.middleware.ts            # CORS handling
│   └── logging.middleware.ts         # Request logging
├── routes/
│   ├── auth.routes.ts                # Auth proxy
│   ├── contacts.routes.ts            # Contacts proxy
│   └── health.ts                     # Health checks
├── types/
│   └── env.ts                        # Type definitions
└── utils/
    ├── errors.ts                     # Error handling
    ├── validation.ts                 # Input validation
    └── proxy.ts                      # Generic proxy logic
```

## Support

For issues:

1. Check troubleshooting section above
2. Review logs in terminal/DevTools
3. Check Cloudflare Workers dashboard for deployed version
4. Verify environment variables are set correctly
