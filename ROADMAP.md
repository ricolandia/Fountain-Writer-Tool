# Fountain Writer — Roadmap Colaborativo

Transformar o Fountain Writer de editor local para plataforma colaborativa com **PostgreSQL**, **sincronização automática** e deploy via **Docker**.

---

## Stack

| Componente | Tecnologia |
|------------|-----------|
| **API** | FastAPI (Python) — estende `web/server.py` atual |
| **Banco** | PostgreSQL 16 |
| **Auth** | JWT (`python-jose` + `passlib` bcrypt) |
| **ORM** | SQLAlchemy + asyncpg |
| **Migrations** | Alembic |
| **Container** | Docker Compose (API + Postgres) |
| **Frontend** | `web/js/app.js` — fetch + WebSocket |

---

## Fase 1 — Backend + Autenticação (MVP)

Usuário loga, cria projetos, salva/carrega do servidor com sync automático.

### 1.1 Infraestrutura Docker

- `backend/Dockerfile` — Python slim + dependências
- `backend/docker-compose.yml` — serviços `api` e `db` (PostgreSQL)
- Volume persistente para o banco
- Variáveis de ambiente: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`

### 1.2 Banco de Dados (SQLAlchemy + Alembic)

**Tabelas:**

**`users`** — `id UUID PK`, `email UNIQUE`, `password_hash`, `display_name`, `created_at`, `updated_at`

**`projects`** — `id UUID PK`, `owner_id FK→users`, `title`, `draft`, `beats JSONB`, `title_data JSONB`, `scene_colors JSONB`, `line_marks JSONB`, `char_data JSONB`, `acts JSONB`, `projeto_data JSONB`, `settings JSONB`, `created_at`, `updated_at`

**`project_collaborators`** — `id UUID PK`, `project_id FK→projects`, `user_id FK→users`, `role` (owner/editor/viewer), `created_at`

### 1.3 API Endpoints

**Auth:**
```
POST /api/auth/register   → { email, password, display_name }
POST /api/auth/login       → { email, password } → { token, user }
GET  /api/auth/me          → { user }
```

**Projetos:**
```
GET    /api/projects                → lista do usuário
POST   /api/projects                → criar
GET    /api/projects/{id}           → carregar
PUT    /api/projects/{id}           → salvar (sync)
DELETE /api/projects/{id}           → deletar
```

### 1.4 Sincronização automática

- Módulo `web/js/api.js` com `fetch` + JWT
- `app.syncToServer()` chamado **30s após a última alteração** (debounce)
- Envia `PUT /api/projects/{id}` com draft, beats, acts, etc.
- Conflito (409): avisa usuário para recarregar
- Indicador na toolbar: `☁️ Sincronizado` / `☁️ ⏳`

### 1.5 Tela de login

- Modal login/registro (estrutura de modal já existe)
- Botão "Login" na toolbar (só sem token)
- Avatar/nome quando logado
- Indicador de sync

### 1.6 Variáveis de ambiente

```env
DATABASE_URL=postgresql+asyncpg://fw:senha@db:5432/fountain_writer
SECRET_KEY=super-secret-jwt-key
CORS_ORIGINS=http://localhost:8000,https://meudominio.com
```

---

## Fase 2 — Colaboração

Múltiplos usuários editando o mesmo projeto.

### 2.1 Compartilhar

```
POST   /api/projects/{id}/share → { email, role }
GET    /api/projects/{id}/collaborators
DELETE /api/projects/{id}/collaborators/{user_id}
```

### 2.2 Histórico de versões

Tabela `project_versions` — snapshot completo + diff por save.

```
GET /api/projects/{id}/versions
GET /api/projects/{id}/versions/{vid}  → restaurar
```

### 2.3 Presença via WebSocket

- Socket por projeto: `ws://host/api/projects/{id}/ws`
- Eventos: `user_joined`, `user_left`, `project_updated`
- Indicador na sidebar: 👤 Fulano editando

---

## Fase 3 — Edição em tempo real (CRDT)

Múltiplos usuários editando simultaneamente sem conflitos.

- **Yjs** para sincronização de texto + dados
- Provider WebSocket para broadcast de operações
- Textarea → Y.Text; cores/marcações → Y.Map; beats → Y.Array
- Servidor WebSocket com persistência periódica do Y.Doc

---

## Fase 4 — Polimento e Deploy

| Item | Descrição |
|------|-----------|
| **PWA** | Manifest + service worker; offline com sync ao voltar |
| **Convites por link** | Link mágico: `compartilhar?token=xyz` |
| **Exportação em lote** | ZIP com todos os projetos |
| **Admin** | Painel FastAPI + HTML para gerenciar usuários |
| **Rate limit** | `slowapi` para proteger endpoints |
| **Logs** | Log estruturado + opcional Sentry |
| **CI/CD** | GitHub Actions: testes → build Docker → deploy |

---

## Arquivos previstos

| Arquivo | Tipo |
|---------|------|
| `backend/Dockerfile` | Novo |
| `backend/docker-compose.yml` | Novo |
| `backend/requirements.txt` | Novo |
| `backend/.env.example` | Novo |
| `backend/app/main.py` | Novo |
| `backend/app/config.py` | Novo |
| `backend/app/models.py` | Novo |
| `backend/app/schemas.py` | Novo |
| `backend/app/auth.py` | Novo |
| `backend/app/deps.py` | Novo |
| `backend/app/routes/auth.py` | Novo |
| `backend/app/routes/projects.py` | Novo |
| `backend/alembic/` | Novo |
| `web/js/api.js` | Novo |
| `web/index.html` | Modificado |
| `web/js/app.js` | Modificado |
| `web/css/app.css` | Modificado |
| `ROADMAP.md` | Este arquivo |
| `.gitignore` | Modificado |

---

## Status

- [ ] **Fase 1** — Backend + Auth + Sync
- [ ] **Fase 2** — Colaboração (compartilhar, versões, presença)
- [ ] **Fase 3** — Edição em tempo real (CRDT/Yjs)
- [ ] **Fase 4** — Polimento (PWA, convites, admin, CI/CD)
