# MiniCRM — Teste Técnico Nutek Software

Sistema simplificado de gestão de contatos com autenticação, painel web e automações, construído como microserviços.

## Serviços em Produção

| Serviço | URL |
|---------|-----|
| **Frontend** | https://minicrm-teste-nutek.pages.dev |
| **API Gateway (Worker)** | https://minicrm-api-gateway.carlosgilm.workers.dev |
| **Auth Service** | https://minicrm-teste-nutek-production.up.railway.app |
| **n8n** | https://n8n-production-2160.up.railway.app |

---

## Arquitetura

```
┌──────────────────────┐     ┌──────────────────────────┐      ┌──────────────────────┐
│  Frontend (SPA)      │────▶│  API Gateway             │────▶│  Auth Service        │
│  React + Vite        │     │  Cloudflare Worker (Hono)│      │  Node.js + Express   │
│  Cloudflare Pages    │     │                          │      │  Docker / Railway    │
└──────────────────────┘     └────────────┬─────────────┘      └──────────┬───────────┘
                                          │                               │
                             ┌────────────▼─────────────┐      ┌──────────▼───────────┐
                             │  n8n (Automações)        │      │  PostgreSQL + Redis  │
                             │  Docker / Railway        │      │ Docker / Railway     │
                             └──────────────────────────┘      └──────────────────────┘

```

**Fluxo de uma requisição autenticada:**

1. O Frontend faz uma chamada para o API Gateway
2. O Gateway valida o JWT no edge (Cloudflare) via `jose`
3. Se válido, injeta os headers `x-user-id` e `x-user-email` e faz proxy para o serviço correto
4. Rotas `/auth/*` → Auth Service | Rotas `/contacts/*` → n8n webhooks

---

## Stack

| Tecnologia | Uso |
|-----------|-----|
| Node.js 22 + TypeScript 5 | Auth Service |
| Express 5 | Framework HTTP do Auth Service |
| Prisma + PostgreSQL 15 | ORM e banco de dados |
| Redis (Alpine) | Refresh tokens + cache de contatos |
| Hono | Framework do API Gateway (Worker) |
| jose | Verificação de JWT no edge |
| jsonwebtoken + bcryptjs | JWT e hash de senha no Auth Service |
| Zod | Validação de entrada (backend e frontend) |
| n8n | Workflows de CRUD de contatos |
| React 19 + Vite 7 | Frontend SPA |
| React Hook Form | Formulários com validação |
| Tailwind CSS 4 | Estilização |
| Axios | Cliente HTTP com interceptores |
| Docker Compose | Orquestração local |
| Traefik v2.11 | Reverse proxy local |
| Cloudflare Workers | API Gateway em produção |
| Cloudflare Pages | Hospedagem do frontend |
| Railway | Hospedagem do Auth Service e n8n em produção |

---

## Rodando Localmente

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- [Node.js 22+](https://nodejs.org/) instalado
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) instalado globalmente:
  ```bash
  npm install -g wrangler
  ```

### Visão geral do setup local

No ambiente local, o API Gateway roda via `wrangler dev` (não é deployado na Cloudflare). Isso permite que ele acesse os serviços backend rodando em `localhost` via Docker:

```
Frontend (localhost:5173)       ──┐
                                  │  via Docker Compose
wrangler dev (localhost:8787)   ← Worker rodando localmente
      ↓
auth-service (localhost:8082)   ──┐
n8n (localhost:5678)            ──┤  via Docker Compose
PostgreSQL (localhost:5432)     ──┤
Redis (localhost:6379)          ──┘
```

---

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/CarlosGilM/minicrm-teste-nutek.git
cd minicrm-teste-nutek
```

---

### Passo 2 — Configurar variáveis de ambiente do Auth Service

Copie o arquivo de exemplo e ajuste se necessário:

```bash
cp auth-service/.env.example auth-service/.env
```

O conteúdo padrão já está configurado para funcionar com o Docker Compose:

```env
PORT=8082
NODE_ENV=development
DATABASE_URL=postgresql://minicrm:minicrm123@postgres:5432/minicrm?schema=public
REDIS_URL=redis://redis:6379
JWT_SECRET=sua-chave-secreta-aqui-troque-em-producao
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_TTL=604800
```

> **Importante:** O `JWT_SECRET` precisa ser o mesmo valor configurado no API Gateway. Veja o Passo 4.

---

### Passo 3 — Subir os serviços backend com Docker Compose

```bash
docker compose up -d
```

Isso sobe:
- **auth-service** na porta `8082` (com build automático da imagem)
- **postgres** na porta `5432` (com healthcheck)
- **redis** na porta `6379` (com healthcheck)
- **n8n** na porta `5678`
- **traefik** nas portas `80` e `8080`
- **frontend** na porta `5173` (React + Vite dev server)

O auth-service aplica automaticamente o schema do banco via `prisma db push` na inicialização.

**Verifique se os containers estão saudáveis:**

```bash
docker compose ps
```

Aguarde o auth-service ficar com status `running`. Se quiser acompanhar os logs:

```bash
docker compose logs -f auth-service
```

Você deve ver algo como:

```
Server running on port 8082
```

**Serviços acessíveis localmente após subir:**

| Serviço | URL |
|---------|-----|
| Auth Service (direto) | http://localhost:8082 |
| Auth Service (Traefik) | http://auth.localhost |
| n8n (interface web) | http://localhost:5678 ou http://n8n.localhost |
| Traefik Dashboard | http://localhost:8080 |
| Frontend | http://localhost:5173 |

> **Nota:** Para os domínios `.localhost` funcionarem no navegador, seu sistema operacional já os resolve para `127.0.0.1` por padrão na maioria das configurações modernas.

---

### Passo 4 — Configurar e importar o workflow do n8n

1. Acesse o n8n em **http://localhost:5678**
2. Crie uma conta de administrador na primeira vez
3. Clique em **...** (novo workflow) → **Import from file** e importe o arquivo:
   ```
   n8n-flows/Contacts CRUD.json
   ```
4. Clique em qualquer nó **PostgreSQL** do workflow → no campo **Credential to connect with** selecione **Create new credential** e preencha:
   - Host: `postgres`
   - Database: `minicrm`
   - User: `minicrm`
   - Password: `minicrm123`
5. Clique em qualquer nó **Redis** do workflow → crie a credencial com:
   - Host: `redis`
   - Port: `6379`
6. Ative o workflow (toggle no canto superior direito)

Os seguintes webhooks estarão disponíveis após ativar:
- `POST http://localhost:5678/webhook/contacts`
- `GET  http://localhost:5678/webhook/contacts`
- `DELETE http://localhost:5678/webhook/contacts`

---

### Passo 5 — Rodar o API Gateway localmente (wrangler dev)

O `wrangler.toml` já tem as URLs configuradas para os serviços locais. O `JWT_SECRET`, por ser sensível, fica em um arquivo separado que **não vai pro git**:

```bash
cp api-gateway/.dev.vars.example api-gateway/.dev.vars
```
Crie o arquivo `.dev.vars` com base no arquivo `.dev.vars.example`
O conteúdo do `.dev.vars` deve ter o mesmo `JWT_SECRET` do `auth-service/.env`:

```env
JWT_SECRET=sua-chave-secreta-aqui-troque-em-producao
```

> **Importante:** O `.dev.vars` é lido apenas pelo `wrangler dev` (local). Em produção, o segredo é configurado via `wrangler secret put JWT_SECRET`, que o armazena encriptado na Cloudflare.

Rode o Worker localmente:

```bash
cd api-gateway
npm install
npx wrangler dev
```

O Gateway estará disponível em **http://localhost:8787**.

---

### Passo 6 — Frontend

O frontend já sobe automaticamente junto com o `docker compose up -d` (Passo 3). Ele estará disponível em **http://localhost:5173** assim que o container inicializar.

> **Nota:** Na primeira execução o container instala as dependências (`npm install`), o que pode levar alguns segundos a mais. Acompanhe com `docker compose logs -f frontend`.

---

### Testando o fluxo completo

1. Acesse http://localhost:5173
2. Clique em **Registrar** e crie uma conta
3. Faça login — você será redirecionado para `/contacts`
4. Clique em **Novo contato** e preencha o formulário
5. O contato aparece na lista
6. Clique em **Excluir** para removê-lo

---

### Parando os serviços

```bash
docker compose down
```

Para remover também os volumes (apaga dados do banco e n8n):

```bash
docker compose down -v
```

---

## Variáveis de Ambiente

### Auth Service (`auth-service/.env`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor HTTP | `8082` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `DATABASE_URL` | Connection string do PostgreSQL | `postgresql://minicrm:minicrm123@postgres:5432/minicrm?schema=public` |
| `REDIS_URL` | URL de conexão do Redis | `redis://redis:6379` |
| `JWT_SECRET` | Chave secreta para assinar JWTs (HS256) | — |
| `JWT_EXPIRES_IN` | Tempo de expiração do JWT | `15m` |
| `REFRESH_TOKEN_TTL` | TTL do refresh token no Redis (segundos) | `604800` (7 dias) |

### API Gateway

**`api-gateway/wrangler.toml`** — variáveis não-sensíveis:

| Variável | Descrição |
|----------|-----------|
| `AUTH_SERVICE_URL` | URL base do Auth Service |
| `N8N_WEBHOOK_URL` | URL base dos webhooks do n8n |
| `FRONTEND_URL` | URL do frontend (usada no CORS) |

**`api-gateway/.dev.vars`** — segredos locais (não vai pro git, copie de `.dev.vars.example`):

| Variável | Descrição |
|----------|-----------|
| `JWT_SECRET` | Mesma chave usada no Auth Service (HS256) |

> Em produção, use `wrangler secret put JWT_SECRET` no lugar do `.dev.vars`.

### Frontend (`frontend-web/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL do API Gateway |

---

## Estrutura do Projeto

```
minicrm-teste-nutek/
├── auth-service/          # Auth Service (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── config/        # Banco, Redis, variáveis de ambiente
│   │   ├── modules/auth/  # Controller, Service, Routes, Schemas
│   │   └── utils/         # JWT, Hash, AppError
│   ├── prisma/
│   │   └── schema.prisma
│   ├── Dockerfile         # Multi-stage build
│   └── .env.example
│
├── api-gateway/           # API Gateway (Cloudflare Worker + Hono)
│   ├── src/
│   │   ├── middlewares/   # auth, cors, logging
│   │   ├── routes/        # auth.routes, contacts.routes
│   ├── .dev.vars.example  # Segredos locais (copiar para .dev.vars)
│   │   └── utils/         # proxy, errors, validation
│   └── wrangler.toml
│
├── frontend-web/          # Frontend SPA (React + Vite)
│   └── src/
│       ├── features/
│       │   ├── auth/      # AuthProvider, Login, Register
│       │   └── contacts/  # ContactsList, NewContact, useContacts
│       ├── components/ui/ # Button, FormField, Alert
│       ├── lib/api.ts     # Axios com interceptores
│       ├── routes/        # Definição de rotas e ProtectedRoute
│       └── types/api.ts   # Tipagem das respostas da API
│
├── n8n-flows/
│   └── Contacts CRUD.json # Workflow exportado para importar no n8n
│
└── docker-compose.yml     # Orquestração completa (backend local)
```

---

## Endpoints da API

Todos os endpoints são acessados via o API Gateway.

### Autenticação (sem JWT)

| Método | Endpoint | Descrição | Body |
|--------|----------|-----------|------|
| `POST` | `/auth/register` | Criar conta | `{ name, email, password }` |
| `POST` | `/auth/login` | Login | `{ email, password }` |
| `POST` | `/auth/refresh` | Renovar JWT | `{ refreshToken }` |
| `POST` | `/auth/logout` | Logout | `{ refreshToken }` |

### Contatos (requer `Authorization: Bearer <token>`)

| Método | Endpoint | Descrição | Body |
|--------|----------|-----------|------|
| `GET` | `/contacts` | Listar contatos do usuário | — |
| `POST` | `/contacts` | Criar novo contato | `{ name, email?, phone? }` |
| `DELETE` | `/contacts/:id` | Deletar contato | — |

---

## Decisões Técnicas

### Por que Railway para backend em produção?

O API Gateway roda no edge da Cloudflare (Worker). Workers deployados não conseguem alcançar `localhost` — eles precisam de URLs públicas para se comunicar com outros serviços. Para que o sistema funcione de ponta a ponta em produção (Worker → Auth Service → n8n), os serviços backend precisam estar expostos publicamente. O Railway foi escolhido pela simplicidade de deploy via Docker.

**Em desenvolvimento local**, o problema não existe: o `wrangler dev` roda o Worker no próprio processo Node.js e consegue acessar `localhost:8082` e `localhost:5678` normalmente.

### Por que Traefik?

O Traefik atua como reverse proxy local, permitindo acessar os serviços pelos domínios `auth.localhost` e `n8n.localhost` em vez de portas numéricas. Isso simula um ambiente mais próximo de produção e facilita a configuração do n8n (que usa seu próprio hostname para gerar URLs de webhook).

### Refresh Token em localStorage

O spec permite tanto `cookie httpOnly` quanto `localStorage`. O localStorage foi escolhido para simplificar a implementação no contexto de um SPA, eliminando a necessidade de configuração de cookies cross-origin entre Cloudflare Pages e o Worker.

### n8n como backend de contatos

Os fluxos n8n funcionam como um backend de CRUD leve, expondo webhooks HTTP que o API Gateway roteia. Isso evita a necessidade de um segundo serviço Node.js dedicado para contatos e demonstra o uso prático de automações como serviço.

### Cache Redis nos fluxos n8n

O workflow de listagem de contatos verifica o cache Redis (`contacts:{userId}`) antes de consultar o PostgreSQL. Ao criar ou deletar um contato, o cache do usuário é invalidado. Isso reduz a carga no banco para leituras repetidas.

---

## Schema do Banco de Dados

```prisma
model User {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  password  String
  contacts  Contact[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Contact {
  id        String   @id @default(uuid())
  name      String
  email     String?
  phone     String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
