# PRD — MiniCRM: Análise Técnica e Plano de Correções

> **Escopo:** Revisão da implementação atual versus os requisitos do teste técnico, diagnóstico do problema das rotas Traefik no gateway, e plano de ação para completar o projeto.
>
> **Data:** 2026-03-18 | **Branch:** feat/gateway

---

## 1. Status Atual por Parte

| Parte | Descrição | Status |
|-------|-----------|--------|
| 1 | Auth Service (Node.js + Express + TypeScript) | ✅ Completo |
| 2 | API Gateway (Cloudflare Worker + Hono) | ⚠️ Parcial — bugs críticos |
| 3 | Frontend (React + Vite + Tailwind) | ❌ Não implementado |
| 4 | Automações n8n | ⚠️ Parcial — verificar Redis cache |
| 5 | Infraestrutura (Docker Compose + Traefik) | ⚠️ Parcial — Traefik incompleto |
| 6 | CI/CD (GitHub Actions) | ❌ Não implementado (diferencial) |

---

## 2. Auth Service — Parte 1

### Conformidade com o spec

| Requisito | Implementado | Observação |
|-----------|-------------|------------|
| `POST /auth/register` | ✅ | Zod, bcrypt, Prisma |
| `POST /auth/login` | ✅ | JWT HS256, refresh no Redis |
| `POST /auth/refresh` | ✅ | Rotação de tokens |
| `POST /auth/logout` | ✅ | Invalida no Redis |
| Senhas com bcrypt | ✅ | 10 salt rounds |
| JWT 15min HS256 | ✅ | Via `JWT_EXPIRES_IN=15m` |
| Refresh TTL 7 dias | ✅ | `REFRESH_TOKEN_TTL=604800` |
| Validação Zod | ✅ | Todos os endpoints |
| Prisma + PostgreSQL | ✅ | Migrations versionadas |
| Dockerfile multi-stage | ✅ | Build + produção |
| Schema User + Contact | ✅ | Com `onDelete: Cascade` |

### Issues encontrados

**Issue AS-1 — CORS muito permissivo**

Em [auth-service/src/app.ts](auth-service/src/app.ts), o CORS está configurado com `origin: '*'`. Qualquer origem pode chamar o Auth Service diretamente, bypassando o gateway.

```
// Atual
cors({ origin: '*' })

// Correto
cors({ origin: ['http://localhost:5173', process.env.GATEWAY_URL] })
```

Impacto: baixo em desenvolvimento, alto em produção.

---

## 3. API Gateway — Parte 2 (principal foco)

### 3.1 Conformidade com o spec

| Requisito | Implementado | Observação |
|-----------|-------------|------------|
| `POST /auth/*` proxy sem auth | ✅ | |
| `GET /contacts` com auth | ✅ | |
| `POST /contacts` com auth | ✅ | |
| `DELETE /contacts/:id` com auth | ✅ | ID como query param |
| Validação JWT (jose, HS256) | ✅ | |
| Rejeitar 401 para tokens inválidos | ✅ | |
| Injetar `x-user-id` e `x-user-email` | ✅ | |
| CORS configurado | ✅ | Whitelist com variável de ambiente |
| `wrangler.toml` com env produção | ⚠️ | Placeholders não preenchidos |
| Deploy em `.workers.dev` | ❌ | Não realizado |

### 3.2 Bug Crítico — Rota n8n com caminho incompleto

**Issue GW-1** | Arquivo: [api-gateway/wrangler.toml](api-gateway/wrangler.toml) linha 9

```toml
# Configuração atual (root [vars])
N8N_WEBHOOK_URL = "http://127.0.0.1:5678"
```

O gateway então constrói URLs como: `http://127.0.0.1:5678/contacts`

Porém, webhooks no n8n são sempre servidos no caminho `/webhook/*`. A URL correta seria:
`http://127.0.0.1:5678/webhook/contacts`

**Impacto:** Todas as chamadas para contatos retornam 404 no n8n.

**Correção:**
```toml
[vars]
N8N_WEBHOOK_URL = "http://127.0.0.1:5678/webhook"
```

---

### 3.3 Diagnóstico — Por que as rotas Traefik não funcionam no gateway

**Issue GW-2** | Arquivo: [api-gateway/wrangler.toml](api-gateway/wrangler.toml) linha 12

```toml
[env.development]
vars = { AUTH_SERVICE_URL = "http://127.0.0.1:8082", N8N_WEBHOOK_URL = "http://n8n.localhost/webhook", ... }
```

O `[env.development]` usa `n8n.localhost` para o n8n, mas ainda usa IP direto para o auth. A tentativa de usar o hostname Traefik falha porque:

#### Causa raiz

O `wrangler dev` executa o Worker dentro do **workerd**, o runtime JavaScript proprietário da Cloudflare (baseado em V8 isolates). O workerd possui sua **própria stack de rede**, isolada do sistema operacional do host.

```
Host OS (Windows/Linux/Mac)
├── Browser / curl         → resolve auth.localhost via DNS/mDNS do host ✅
├── Docker containers      → resolvem via DNS interno do Docker bridge ✅
└── workerd (wrangler dev) → usa resolver DNS próprio, não herda o do host ❌
```

Os hostnames `auth.localhost` e `n8n.localhost` funcionam no browser/curl porque:
1. O Traefik escuta na porta 80 do host
2. O browser envia `Host: auth.localhost` para `127.0.0.1:80`
3. O Traefik roteia pelo header `Host` para o container correto

O workerd **não faz resolução DNS pelo host**. Quando tenta conectar em `http://n8n.localhost`, não consegue resolver o hostname e a requisição falha.

#### Por que `127.0.0.1:PORT` funciona

```
workerd → fetch("http://127.0.0.1:8082") → TCP direto para porta exposta do Docker ✅
workerd → fetch("http://auth.localhost")  → DNS lookup falha no workerd ❌
```

Os serviços Docker expõem suas portas diretamente para o host (`ports: "8082:8082"`), então `127.0.0.1:8082` é acessível via TCP sem depender de DNS.

#### Solução correta no wrangler.toml

```toml
# Remover [env.development] ou alinhar com os valores da seção raiz
[vars]
FRONTEND_URL = "http://localhost:5173"
AUTH_SERVICE_URL = "http://127.0.0.1:8082"
N8N_WEBHOOK_URL = "http://127.0.0.1:5678/webhook"  # corrigido: adicionar /webhook

# [env.development] pode ser removido — os vars raiz já funcionam para dev
```

> **Nota:** As rotas Traefik (`auth.localhost`, `n8n.localhost`) continuam úteis para acesso humano (browser, Postman, n8n UI), mas o gateway deve sempre usar IP:porta diretamente.

---

### 3.4 Issue adicional — JWT payload não segue RFC 7519

**Issue GW-3** | Arquivo: [auth-service/src/utils/jwt.ts](auth-service/src/utils/jwt.ts)

O auth-service assina o token com o campo `userId` (não-padrão):
```typescript
jwt.sign({ userId, email }, secret, { algorithm: 'HS256' })
```

O gateway mitiga isso verificando `payload.sub || payload.userId`, mas o padrão JWT define `sub` para o subject. Tokens gerados desta forma são menos interoperáveis.

**Correção sugerida no auth-service:**
```typescript
jwt.sign({ sub: userId, email }, secret, { algorithm: 'HS256', expiresIn })
```

---

## 4. Infraestrutura — Parte 5

### Conformidade com o spec

| Requisito | Implementado | Observação |
|-----------|-------------|------------|
| auth-service via Docker build | ✅ | |
| n8n | ✅ | |
| postgres:15-alpine | ✅ | Healthcheck configurado |
| redis:alpine | ✅ | Healthcheck configurado |
| traefik:v2.11 | ✅ | |
| `auth.localhost` via Traefik | ✅ | Labels corretos |
| `n8n.localhost` via Traefik | ✅ | Labels corretos |
| `traefik.localhost:8080` (dashboard) | ⚠️ | Parcialmente — ver abaixo |
| Volumes persistentes | ⚠️ | Redis sem volume |
| `.env.example` | ✅ | |

### Issues encontrados

**Issue INF-1 — Dashboard Traefik**

O spec pede dashboard em `traefik.localhost:8080`. O dashboard está acessível via `localhost:8080` (porta exposta), mas não via hostname `traefik.localhost` pois não há label de roteamento para o próprio container do Traefik.

Isso é cosmético para o teste local, mas é um desvio do spec.

**Issue INF-2 — Redis sem volume persistente**

O serviço `redis` no [docker-compose.yml](docker-compose.yml) não declara volume. Tokens de refresh são perdidos se o container for removido. Para desenvolvimento é aceitável; em produção seria um problema.

```yaml
# Adicionar:
redis:
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
```

**Issue INF-3 — Migrations no entrypoint**

O `Dockerfile` do auth-service executa `npx prisma migrate deploy` no CMD. Isso é correto para produção, mas em caso de falha na migration o container não sobe. Considerar health check com retry ou script de entrypoint separado.

---

## 5. n8n Workflows — Parte 4

### Verificação do JSON exportado

O arquivo [n8n-flows/Contacts CRUD.json](n8n-flows/Contacts CRUD.json) está presente no repositório (requisito obrigatório atendido).

### Issues encontrados

**Issue N8N-1 — Webhook URL alinhamento**

Com a correção do `N8N_WEBHOOK_URL` para incluir `/webhook` (issue GW-1), verificar que os webhooks no n8n foram criados com o caminho correto:
- `POST /webhook/contacts`
- `GET /webhook/contacts`
- `DELETE /webhook/contacts/:id`

**Issue N8N-2 — Cache Redis (diferencial)**

Verificar no workflow JSON se o cache Redis está implementado. O spec lista como diferencial:
- Listar contatos: verificar chave `contacts:${userId}` antes de consultar banco
- Criar/deletar: invalidar cache do usuário

Se não estiver implementado, é uma oportunidade de pontuação extra.

---

## 6. Partes Faltantes

### Parte 3 — Frontend (React + Vite)

**Status: Não implementado — obrigatório**

Requere:
- Páginas: `/login`, `/register`, `/contacts`, `/contacts/new`
- React Hook Form + Zod para formulários
- Tailwind CSS
- JWT em memória, refresh token em localStorage/cookie
- Interceptor Axios com refresh automático
- Deploy no Cloudflare Pages

### Parte 6 — CI/CD GitHub Actions (diferencial)

**Status: Não implementado**

Dois workflows requeridos:
- `.github/workflows/deploy-worker.yml` — deploy do gateway
- `.github/workflows/deploy-frontend.yml` — deploy do frontend

---

## 7. Resumo de Issues por Prioridade

### Crítico (quebra funcionalidade)

| ID | Descrição | Arquivo | Correção |
|----|-----------|---------|----------|
| GW-1 | N8N_WEBHOOK_URL sem `/webhook` | `wrangler.toml:9` | Adicionar `/webhook` ao valor |
| GW-2 | `n8n.localhost` não resolve no workerd | `wrangler.toml:12` | Remover `[env.development]` ou usar IPs diretos |

### Alto (desvio do spec)

| ID | Descrição | Arquivo | Correção |
|----|-----------|---------|----------|
| — | Frontend não implementado | — | Criar projeto React em `frontend/` |
| INF-1 | Dashboard Traefik não em `traefik.localhost` | `docker-compose.yml` | Adicionar label de roteamento no container Traefik |

### Médio (qualidade e boas práticas)

| ID | Descrição | Arquivo | Correção |
|----|-----------|---------|----------|
| GW-3 | JWT usa `userId` em vez de `sub` | `auth-service/src/utils/jwt.ts` | Substituir por `sub: userId` |
| AS-1 | CORS `origin: '*'` no auth-service | `auth-service/src/app.ts` | Restringir origens |
| INF-2 | Redis sem volume persistente | `docker-compose.yml` | Adicionar volume + appendonly |

### Baixo (diferencial)

| ID | Descrição |
|----|-----------|
| N8N-2 | Implementar cache Redis nos fluxos n8n |
| — | GitHub Actions workflows |
| — | Conventional commits para histórico de commits |

---

## 8. Plano de Ação

### Fase 1 — Correções no gateway (1–2h)

1. Corrigir `N8N_WEBHOOK_URL` no `wrangler.toml` para incluir `/webhook`
2. Remover ou corrigir `[env.development]` para usar IPs diretos
3. Preencher placeholders da seção `[env.production]` com URLs reais pós-deploy
4. Configurar `JWT_SECRET` via `wrangler secret put JWT_SECRET`

### Fase 2 — Correções na infra (30min)

5. Adicionar label de roteamento `traefik.localhost` no container Traefik
6. Adicionar volume Redis com persistência
7. (Opcional) Corrigir JWT payload para usar `sub`

### Fase 3 — Frontend (2–3 dias)

8. Criar projeto Vite + React + TypeScript em `frontend/`
9. Configurar Tailwind CSS v4 e React Router
10. Implementar páginas: login, register, contacts list, new contact
11. Hooks customizados: `useAuth`, `useContacts`
12. Interceptor Axios com refresh automático
13. Deploy no Cloudflare Pages

### Fase 4 — Diferenciais (1 dia)

14. Adicionar cache Redis no workflow n8n (listar, criar, deletar)
15. Criar `.github/workflows/deploy-worker.yml`
16. Criar `.github/workflows/deploy-frontend.yml`
17. Atualizar README com URLs de deploy

---

## 9. Variáveis de Ambiente Necessárias para Produção

### Gateway (wrangler secrets)

```
JWT_SECRET            → wrangler secret put JWT_SECRET
AUTH_SERVICE_URL      → URL pública do auth-service (se exposto) ou via tunnel
N8N_WEBHOOK_URL       → URL pública do n8n + /webhook
FRONTEND_URL          → URL do Cloudflare Pages (*.pages.dev)
```

### Auth Service (.env produção)

```
DATABASE_URL          → PostgreSQL connection string
REDIS_URL             → Redis connection string
JWT_SECRET            → Mesmo valor do gateway
PORT=8082
NODE_ENV=production
```

---

## 10. Arquitetura de Rede — Visão Correta para Desenvolvimento Local

```
Browser / Postman
  │
  ├── http://auth.localhost     → Traefik:80 → auth-service:8082  (host → Docker)
  ├── http://n8n.localhost      → Traefik:80 → n8n:5678           (host → Docker)
  └── http://localhost:8080     → Traefik dashboard               (host → Docker)

Wrangler (workerd runtime) — porta 8787
  │
  ├── fetch("http://127.0.0.1:8082")  → auth-service (porta exposta pelo Docker) ✅
  └── fetch("http://127.0.0.1:5678/webhook")  → n8n (porta exposta pelo Docker) ✅

  ✗  fetch("http://auth.localhost")   → DNS não resolvido pelo workerd ❌
  ✗  fetch("http://n8n.localhost")    → DNS não resolvido pelo workerd ❌
```

O Traefik é o reverse proxy **para acesso humano externo** (browser, ferramentas). O gateway **deve sempre usar IP:porta diretamente** para comunicação interna durante o desenvolvimento.
