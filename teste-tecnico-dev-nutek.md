# Teste Técnico — Desenvolvedor(a) Nutek Software

**Tempo estimado:** 3 a 5 dias
**Nível:** Júnior/Pleno (1–2 anos de experiência)
**Formato:** Repositório público no GitHub com README explicando como rodar

---

## Contexto

Você foi contratado(a) para construir o **MiniCRM** — um sistema simplificado de gestão de contatos com autenticação, painel web e automações. O sistema é composto por múltiplos serviços que se comunicam entre si, refletindo uma arquitetura real de microserviços.

A stack e as ferramentas são as mesmas que usamos em produção. O objetivo é avaliar sua capacidade de montar, integrar e entregar um sistema funcional de ponta a ponta.

---

## Arquitetura Esperada

```
┌──────────────────┐     ┌────────────────────┐     ┌──────────────────────┐
│  Frontend (SPA)  │────▶│  API Gateway       │────▶│  Auth Service        │
│  React + Vite    │     │  Cloudflare Worker  │     │  Node.js + Express   │
│  Cloudflare Pages│     │  (Hono)            │     │  Docker              │
└──────────────────┘     └────────┬───────────┘     └──────────┬───────────┘
                                  │                             │
                                  ▼                             ▼
                         ┌────────────────┐           ┌─────────────────┐
                         │  n8n           │           │  PostgreSQL     │
                         │  (Automações)  │           │  + Redis        │
                         └────────────────┘           └─────────────────┘
```

**Todos os serviços backend rodam localmente via Docker Compose com Traefik como reverse proxy.**

---

## Parte 1 — Auth Service (Backend)

### O que construir

Um serviço de autenticação em **Node.js + Express + TypeScript** que roda em Docker.

### Requisitos

1. **Endpoints:**
   - `POST /auth/register` — Criar usuário (email, senha, nome)
   - `POST /auth/login` — Autenticar e retornar JWT + refresh token
   - `POST /auth/refresh` — Renovar JWT usando refresh token
   - `POST /auth/logout` — Invalidar refresh token

2. **Regras de negócio:**
   - Senhas devem ser hasheadas (bcrypt)
   - JWT com expiração de 15 minutos (HS256)
   - Refresh token armazenado no **Redis** com TTL de 7 dias
   - Validação de entrada com **Zod** em todos os endpoints

3. **Banco de dados:**
   - **PostgreSQL** com **Prisma ORM**
   - Schema mínimo: tabelas `User` e `Contact` (veja Parte 4)

4. **Docker:**
   - `Dockerfile` multi-stage (build + produção)
   - O serviço deve rodar via `docker compose up`

### Critérios de avaliação
- Estrutura de pastas organizada (separação de responsabilidades)
- Tipagem estrita com TypeScript (sem `any`)
- Tratamento de erros consistente (status codes corretos, mensagens claras)
- Migrations do Prisma versionadas no repositório

---

## Parte 2 — API Gateway (Cloudflare Worker)

### O que construir

Um Worker na Cloudflare (plano gratuito) usando o framework **Hono** que atua como ponto de entrada único da API.

### Requisitos

1. **Roteamento:**
   - `POST /auth/*` — Proxy para o Auth Service (sem autenticação)
   - `GET /contacts` — Proxy para n8n (com autenticação)
   - `POST /contacts` — Proxy para n8n (com autenticação)
   - `DELETE /contacts/:id` — Proxy para n8n (com autenticação)

2. **Middleware de autenticação:**
   - Validar JWT do header `Authorization: Bearer <token>`
   - Usar a biblioteca `jose` para verificar a assinatura (HS256)
   - Rejeitar requisições inválidas com `401 Unauthorized`
   - Injetar headers `x-user-id` e `x-user-email` nas requisições autenticadas antes de fazer o proxy

3. **CORS:**
   - Permitir origens do frontend (localhost em dev, domínio Cloudflare Pages em produção)

4. **Deploy:**
   - Configurar `wrangler.toml` com environment de produção
   - O Worker deve estar acessível via URL `.workers.dev` (plano gratuito)

### Critérios de avaliação
- Separação clara entre middlewares e rotas
- Validação de JWT funcional no edge
- CORS configurado corretamente
- `wrangler.toml` bem estruturado

---

## Parte 3 — Frontend (React + Vite)

### O que construir

Uma SPA em **React + Vite + TypeScript** hospedada no **Cloudflare Pages** (plano gratuito).

### Requisitos

1. **Páginas:**
   - `/login` — Formulário de login (email + senha)
   - `/register` — Formulário de cadastro (nome + email + senha)
   - `/contacts` — Lista de contatos do usuário logado (tabela simples)
   - `/contacts/new` — Formulário para criar novo contato

2. **Autenticação no frontend:**
   - Armazenar JWT em memória (variável/estado) e refresh token em cookie httpOnly ou localStorage
   - Interceptor no Axios para injetar token automaticamente
   - Redirecionar para `/login` quando o token expirar e o refresh falhar
   - Rota protegida: `/contacts` e `/contacts/new` só acessíveis com token válido

3. **Formulários:**
   - Usar **React Hook Form** + **Zod** para validação
   - Campos obrigatórios devem exibir mensagem de erro inline

4. **Estilo:**
   - **Tailwind CSS**
   - Layout responsivo (mobile-first não é obrigatório, mas a UI deve ser usável)
   - Pode usar componentes de bibliotecas como shadcn/ui, Radix ou similares

5. **Deploy:**
   - Build com `vite build` e deploy no Cloudflare Pages
   - O frontend deve apontar para o API Gateway (Worker)

### Critérios de avaliação
- Organização por features (não por tipo de arquivo)
- Hooks customizados para chamadas de API (padrão useContacts, useAuth)
- Tipagem das respostas da API
- Fluxo de autenticação completo e funcional
- UI limpa e funcional (não precisa ser bonita, precisa funcionar)

---

## Parte 4 — Automações com n8n

### O que construir

Fluxos no **n8n** (rodando via Docker Compose) que funcionam como backend de CRUD de contatos.

### Requisitos

1. **Fluxo: Criar Contato** (`POST /webhook/contacts`)
   - Receber `name`, `email`, `phone` via webhook
   - Validar que os campos obrigatórios existem
   - Inserir no PostgreSQL na tabela `Contact` (com `userId` vindo do header `x-user-id`)
   - Retornar o contato criado com status `201`

2. **Fluxo: Listar Contatos** (`GET /webhook/contacts`)
   - Receber `userId` do header `x-user-id`
   - Buscar todos os contatos do usuário no PostgreSQL
   - Retornar array de contatos com status `200`

3. **Fluxo: Deletar Contato** (`DELETE /webhook/contacts/:id`)
   - Receber `contactId` via path param e `userId` via header
   - Verificar se o contato pertence ao usuário
   - Deletar do PostgreSQL
   - Retornar `204 No Content`

4. **Cache com Redis (diferencial):**
   - Ao listar contatos, verificar cache no Redis antes de consultar o banco
   - Ao criar/deletar, invalidar o cache do usuário
   - Chave sugerida: `contacts:${userId}`

### Schema PostgreSQL (Prisma)

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
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Critérios de avaliação
- Fluxos organizados e funcionais
- Uso correto de nós do n8n (Webhook, Postgres, IF, Respond to Webhook)
- Tratamento de erro nos fluxos (ex: contato não encontrado)
- Cache com Redis é diferencial, não obrigatório

---

## Parte 5 — Infraestrutura (Docker Compose + Traefik)

### O que construir

Um `docker-compose.yml` que suba todo o ambiente local com um único comando.

### Serviços obrigatórios

| Serviço | Imagem | Porta |
|---------|--------|-------|
| **auth-service** | Build local (Dockerfile) | 8082 |
| **n8n** | `n8nio/n8n:latest` | 5678 |
| **postgres** | `postgres:15-alpine` | 5432 |
| **redis** | `redis:alpine` | 6379 |
| **traefik** | `traefik:v2.11` | 80, 8080 (dashboard) |

### Requisitos Traefik

- Auth Service acessível via `auth.localhost`
- n8n acessível via `n8n.localhost`
- Dashboard do Traefik em `traefik.localhost:8080`
- Roteamento via labels nos containers Docker

### Exemplo de labels Traefik

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.auth.rule=Host(`auth.localhost`)"
  - "traefik.http.services.auth.loadbalancer.server.port=8082"
```

### Requisitos gerais

- Healthchecks no PostgreSQL e Redis
- Volumes persistentes para dados do Postgres e n8n
- Arquivo `.env.example` documentando todas as variáveis de ambiente
- O comando `docker compose up` deve subir tudo funcional (incluindo migrations)

### Critérios de avaliação
- Docker Compose funcional e bem organizado
- Traefik roteando corretamente
- Healthchecks configurados
- Variáveis de ambiente documentadas

---

## Parte 6 — CI/CD com GitHub Actions (Diferencial)

### O que construir

Um workflow de GitHub Actions que faça deploy automático do Worker e do Frontend na Cloudflare.

### Requisitos

1. **Workflow do Worker (`.github/workflows/deploy-worker.yml`):**
   - Trigger: push na branch `main`
   - Steps: checkout → install deps → lint → deploy com Wrangler
   - Secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`

2. **Workflow do Frontend (`.github/workflows/deploy-frontend.yml`):**
   - Trigger: push na branch `main`
   - Steps: checkout → install deps → build → deploy com Wrangler Pages
   - Secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`

### Critérios de avaliação
- Workflows funcionais e com steps claros
- Uso correto de GitHub Secrets
- Separação entre deploy do Worker e do Frontend

---

## Entregáveis

| # | Item | Obrigatório |
|---|------|-------------|
| 1 | Repositório público no GitHub | Sim |
| 2 | README.md com instruções de setup local | Sim |
| 3 | Auth Service funcionando em Docker | Sim |
| 4 | API Gateway (Worker) deployado no Cloudflare | Sim |
| 5 | Frontend deployado no Cloudflare Pages | Sim |
| 6 | Fluxos n8n exportados (JSON) no repositório | Sim |
| 7 | `docker-compose.yml` com todos os serviços | Sim |
| 8 | `.env.example` completo | Sim |
| 9 | GitHub Actions de deploy | Diferencial |
| 10 | Cache Redis nos fluxos n8n | Diferencial |

---

## Critérios Gerais de Avaliação

### O que mais importa

1. **Funciona de ponta a ponta** — O sistema sobe, autentica, lista/cria/deleta contatos
2. **Código limpo** — TypeScript estrito, sem `any`, pastas organizadas
3. **Integração real** — Os serviços se comunicam de verdade (não mocks)
4. **Docker funcional** — `docker compose up` sobe tudo

### O que não estamos avaliando

- Design visual elaborado (UI funcional é suficiente)
- Cobertura de testes (se tiver testes, ótimo — mas não é obrigatório)
- Performance ou otimização prematura

### Diferenciais que destacam

- Cache Redis nos fluxos n8n
- CI/CD com GitHub Actions
- Commits organizados com conventional commits (`feat:`, `fix:`, `chore:`)
- README bem escrito e detalhado
- Tratamento de edge cases (token expirado, usuário duplicado, contato não encontrado)

---

## Stack de Referência

| Tecnologia | Uso |
|-----------|-----|
| **Node.js 22** | Runtime do Auth Service |
| **TypeScript 5+** | Toda a codebase |
| **Express** | Framework HTTP do Auth Service |
| **Hono** | Framework do Worker (Cloudflare) |
| **React 19** | Frontend |
| **Vite 6** | Build tool do Frontend |
| **Tailwind CSS 4** | Estilização |
| **React Hook Form** | Formulários |
| **Zod** | Validação (backend e frontend) |
| **Prisma** | ORM (PostgreSQL) |
| **jose** | JWT no Worker |
| **jsonwebtoken** | JWT no Auth Service |
| **Redis** | Refresh tokens + cache |
| **n8n** | Automações / workflows |
| **Traefik** | Reverse proxy local |
| **Docker Compose** | Orquestração local |
| **Cloudflare Workers** | API Gateway (edge) |
| **Cloudflare Pages** | Hospedagem do frontend |
| **GitHub Actions** | CI/CD (diferencial) |

---

## Como Enviar

1. Crie um repositório **público** no GitHub com o nome `minicrm-teste-nutek`
2. Inclua um `README.md` com:
   - Instruções de como rodar localmente (`docker compose up`)
   - URL do Worker deployado na Cloudflare
   - URL do Frontend deployado no Cloudflare Pages
   - Qualquer decisão técnica relevante que você tomou
3. Envie o link do repositório por e-mail ou pela plataforma onde se candidatou

---

**Boa sorte! Estamos buscando alguém que consiga conectar as peças e entregar software funcionando. Não precisa ser perfeito — precisa funcionar.**