# SPEC — API Gateway: Correções e Ajustes

> **Escopo:** Exclusivamente o módulo `api-gateway/`. Nenhuma mudança em outros módulos.
> **Branch:** feat/gateway | **Data:** 2026-03-18

---

## Resumo das mudanças

| ID | Arquivo | Tipo | Prioridade |
|----|---------|------|------------|
| GW-1 | `wrangler.toml` | Modificar | Crítica |
| GW-2 | `wrangler.toml` | Modificar | Crítica |
| GW-3 | `wrangler.toml` | Modificar | Alta |
| GW-4 | `wrangler.toml` | Modificar | Alta |

Nenhum arquivo novo precisa ser criado — todas as mudanças são em `wrangler.toml`.

---

## Arquivos a modificar

### `api-gateway/wrangler.toml`

Este é o único arquivo que precisa de mudança. O código-fonte TypeScript do gateway está correto.

---

#### GW-1 — `N8N_WEBHOOK_URL` na seção `[vars]` está sem o prefixo `/webhook`

**Linha 9 — estado atual:**
```toml
N8N_WEBHOOK_URL = "http://127.0.0.1:5678"
```

**Por que é crítico:**

O gateway constrói as URLs para o n8n usando `buildProxyUrl(c.env.N8N_WEBHOOK_URL, '/contacts')`, que concatena base + path:

```
http://127.0.0.1:5678 + /contacts  →  http://127.0.0.1:5678/contacts
```

Webhooks do n8n são sempre servidos sob `/webhook/*`. A URL correta é:

```
http://127.0.0.1:5678/webhook/contacts
```

Sem isso, 100% das chamadas de contatos retornam `404` no n8n.

**Correção:**
```toml
N8N_WEBHOOK_URL = "http://127.0.0.1:5678/webhook"
```

---

#### GW-2 — `[env.development]` usa hostname Traefik que não resolve no workerd

**Linhas 11–12 — estado atual:**
```toml
[env.development]
vars = { AUTH_SERVICE_URL = "http://127.0.0.1:8082", N8N_WEBHOOK_URL = "http://n8n.localhost/webhook", FRONTEND_URL = "http://localhost:5173" }
```

**Por que é crítico:**

O `wrangler dev` executa o Worker dentro do **workerd** (runtime V8 isolate da Cloudflare), que possui sua própria stack de rede e **não herda o DNS do sistema operacional do host**.

```
Host OS
├── Browser / curl         → resolve n8n.localhost via DNS/mDNS do SO ✅
├── Docker containers      → resolvem via DNS interno do bridge ✅
└── workerd (wrangler dev) → DNS próprio, n8n.localhost não resolve ❌
```

Ao rodar `wrangler dev --env development`, o `N8N_WEBHOOK_URL` vira `http://n8n.localhost/webhook`. O workerd tenta resolver `n8n.localhost`, falha, e a requisição retorna erro de conexão.

Além disso, quando se roda `wrangler dev` sem `--env`, o `[env.development]` é ignorado e a seção raiz `[vars]` é usada — criando dois comportamentos diferentes e difíceis de depurar.

**Solução:** remover completamente o `[env.development]`. A seção raiz `[vars]` (com os IPs diretos) funciona corretamente para desenvolvimento local porque os containers Docker expõem suas portas para o host (`127.0.0.1:PORT` é acessível via TCP sem DNS).

---

#### GW-3 — `[env.production]` tem placeholders sem valor real

**Linhas 14–18 — estado atual:**
```toml
[env.production]
name = "minicrm-api-gateway"
route = "api.yourdomain.com/*"
zone_id = "YOUR_PRODUCTION_ZONE_ID"
vars = { FRONTEND_URL = "https://yourdomain.com", AUTH_SERVICE_URL = "https://auth.yourdomain.com", N8N_WEBHOOK_URL = "https://n8n.yourdomain.com/webhook" }
```

**Problema:** `route` e `zone_id` são placeholders. Se alguém tentar `wrangler deploy --env production`, o deploy vai falhar ou usar valores inválidos.

**Solução recomendada:** remover `route` e `zone_id` da seção de produção e deixar o deploy acontecer no subdomínio padrão `*.workers.dev` (que já está habilitado via `workers_dev = true` na raiz). Preencher as `vars` de produção com os valores reais após o primeiro deploy.

---

#### GW-4 — `JWT_SECRET` não deve estar em `vars` — deve ser um secret do Wrangler

**Problema:** `JWT_SECRET` está declarado como tipo `Bindings` em `src/types/env.ts`, mas não aparece em nenhuma seção `[vars]` do `wrangler.toml`. Isso é correto — secrets não devem estar no `wrangler.toml`. Porém, sem configurar o secret explicitamente, `c.env.JWT_SECRET` será `undefined` em desenvolvimento, e o auth middleware retornará `500 MISSING_CONFIGURATION` em todas as requisições autenticadas.

**O que fazer:**

Para desenvolvimento local, criar o arquivo `.dev.vars` na raiz do `api-gateway/` (já está no `.gitignore` do Wrangler por padrão):

```
# api-gateway/.dev.vars  ← NÃO commitar
JWT_SECRET=seu_segredo_aqui_minimo_32_caracteres
```

Para produção, configurar via CLI:

```bash
wrangler secret put JWT_SECRET
```

> **Nota:** `.dev.vars` é lido automaticamente pelo `wrangler dev` como substituto de secrets locais. Confirmar que está no `.gitignore`.

---

## Estado final do `wrangler.toml`

```toml
name = "minicrm-api-gateway"
main = "src/index.ts"
workers_dev = true
compatibility_date = "2025-01-01"

[vars]
FRONTEND_URL = "http://localhost:5173"
AUTH_SERVICE_URL = "http://127.0.0.1:8082"
N8N_WEBHOOK_URL = "http://127.0.0.1:5678/webhook"

# [env.development] removido — vars raiz já usam IPs diretos, compatíveis com workerd

[env.production]
name = "minicrm-api-gateway"
vars = { FRONTEND_URL = "https://YOUR_PAGES_URL.pages.dev", AUTH_SERVICE_URL = "https://YOUR_AUTH_SERVICE_URL", N8N_WEBHOOK_URL = "https://YOUR_N8N_URL/webhook" }

[observability]
enabled = true
```

> `JWT_SECRET` **não** entra em `[vars]`. Usar `.dev.vars` localmente e `wrangler secret put` em produção.

---

## Arquivo a criar (opcional, recomendado)

### `api-gateway/.dev.vars`

Arquivo criado localmente — **nunca commitar**. O Wrangler lê este arquivo automaticamente durante `wrangler dev` para injetar secrets sem expô-los no repositório.

```bash
# api-gateway/.dev.vars
JWT_SECRET=dev_secret_minimo_32_caracteres_aqui
```

Verificar que `.dev.vars` está no `.gitignore`:

```gitignore
# no api-gateway/.gitignore, adicionar se não existir:
.dev.vars
```

---

## Diagnóstico: por que o código TypeScript está correto

Para referência, o código do gateway **não precisa de mudança**. As funções críticas já estão implementadas corretamente:

**`src/utils/proxy.ts:156` — `buildProxyUrl`**
```typescript
export function buildProxyUrl(baseUrl: string, path: string): string {
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`.replace(/(?<!:)\/\//g, '/');
}
```

Após a correção do `wrangler.toml`, `buildProxyUrl("http://127.0.0.1:5678/webhook", "/contacts")` produzirá `http://127.0.0.1:5678/webhook/contacts` — correto.

**`src/middlewares/auth.middleware.ts:73` — extração do userId**
```typescript
const userId = payload.sub || (payload.userId as string);
```

Já suporta ambos os formatos de JWT (com `sub` e com `userId` não-padrão). Nenhuma mudança necessária.

**`src/routes/contacts.routes.ts:59–60` — DELETE com id como query param**
```typescript
const baseUrl = buildProxyUrl(c.env.N8N_WEBHOOK_URL, '/contacts');
const targetUrl = `${baseUrl}?id=${encodeURIComponent(contactId)}`;
```

Após a correção, gera: `http://127.0.0.1:5678/webhook/contacts?id=<id>` — alinhado com o que o n8n espera.

---

## Checklist de execução

```
[ ] 1. Editar api-gateway/wrangler.toml:
        - Linha 9: adicionar /webhook ao N8N_WEBHOOK_URL
        - Linhas 11-12: remover bloco [env.development]
        - Linhas 14-18: remover route e zone_id do [env.production], preencher vars reais

[ ] 2. Criar api-gateway/.dev.vars com JWT_SECRET

[ ] 3. Verificar que .dev.vars está no .gitignore

[ ] 4. Testar localmente:
        wrangler dev
        curl -X POST http://localhost:8787/auth/login ...
        curl -H "Authorization: Bearer <token>" http://localhost:8787/contacts

[ ] 5. Para produção: wrangler secret put JWT_SECRET
```

---

## Fluxo de rede após as correções

```
Browser / Postman
  │
  ├── http://auth.localhost      → Traefik:80 → auth-service:8082  ✅ (acesso humano)
  ├── http://n8n.localhost       → Traefik:80 → n8n:5678           ✅ (acesso humano)
  └── http://localhost:8787      → wrangler dev (gateway)          ✅

Wrangler (workerd) — localhost:8787
  │
  ├── POST /auth/*  →  fetch("http://127.0.0.1:8082/auth/*")   →  auth-service  ✅
  ├── GET  /contacts  →  fetch("http://127.0.0.1:5678/webhook/contacts")  →  n8n  ✅
  ├── POST /contacts  →  fetch("http://127.0.0.1:5678/webhook/contacts")  →  n8n  ✅
  └── DELETE /contacts/:id  →  fetch("http://127.0.0.1:5678/webhook/contacts?id=...")  →  n8n  ✅

  ✗  fetch("http://n8n.localhost")   → DNS não resolvido pelo workerd  ❌ (removido)
  ✗  fetch("http://auth.localhost")  → DNS não resolvido pelo workerd  ❌ (nunca foi usado)
```
