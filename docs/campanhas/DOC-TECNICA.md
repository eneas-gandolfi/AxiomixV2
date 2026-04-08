# AXIOMIX - Documentacao Tecnica Completa

**Plataforma:** Axiomix v2.0
**Stack:** Next.js 16 + TypeScript + Supabase + QStash
**Data:** 2026-03-27

---

## 1. Visao Geral

Axiomix e uma plataforma SaaS B2B de **Marketing Operations & Customer Intelligence** que integra automacao WhatsApp, publicacao em redes sociais, inteligencia competitiva, base de conhecimento com IA e campanhas em massa. A plataforma e multi-tenant com isolamento por empresa via Row Level Security (RLS).

---

## 2. Stack Tecnologico

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Framework | Next.js | 16.1.6 |
| Linguagem | TypeScript | 5.x |
| UI Library | React | 18.x |
| CSS | Tailwind CSS | 3.4.1 |
| Componentes | Ant Design | 6.3.2 |
| Banco de Dados | Supabase (PostgreSQL) | - |
| Autenticacao | Supabase Auth | - |
| Fila de Tarefas | QStash (Upstash) | 2.9.0 |
| IA/LLM | OpenRouter | - |
| Graficos | Recharts + @ant-design/charts | 2.12.7 / 2.6.7 |
| PDF | @react-pdf/renderer + pdfjs-dist | 4.3.2 / 5.4.296 |
| Midia | Cloudinary | 2.9.0 |
| Scraping | Apify | 2.22.2 |
| Validacao | Zod | 4.3.6 |
| Drag & Drop | @dnd-kit | 6.3.1 |
| Deploy | Vercel | - |

---

## 3. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Next.js)              │
│  Dashboard │ WhatsApp Intel │ Social │ Campanhas │ RAG   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  API ROUTES (Next.js)                     │
│  /api/whatsapp │ /api/social │ /api/campaigns │ /api/rag │
└──────┬────────────┬──────────────┬──────────────┬───────┘
       │            │              │              │
┌──────▼──────┐ ┌───▼────┐ ┌──────▼──────┐ ┌────▼─────┐
│  Sofia CRM  │ │Upload  │ │   QStash    │ │OpenRouter│
│  (WhatsApp) │ │ .Post  │ │  (Filas)    │ │  (LLM)   │
└─────────────┘ └────────┘ └─────────────┘ └──────────┘
       │                          │
┌──────▼──────────────────────────▼───────────────────────┐
│              SUPABASE (PostgreSQL + Auth + RLS)           │
│  companies │ conversations │ campaigns │ posts │ docs     │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Estrutura de Arquivos

```
axiomix/
├── middleware.ts                        # Protecao de rotas + auth
├── next.config.mjs                     # Config Next.js (Cloudinary, PDF, body 25MB)
├── tailwind.config.ts                  # Design System v2.0
│
├── src/
│   ├── app/
│   │   ├── (app)/                      # Layout autenticado
│   │   │   ├── layout.tsx              # Shell principal (sidebar + topbar)
│   │   │   ├── dashboard/              # Dashboard geral
│   │   │   ├── whatsapp-intelligence/  # Modulo WhatsApp
│   │   │   │   ├── conversas/          # Listagem + detalhe + analise lote
│   │   │   │   ├── contatos/           # Diretorio de contatos
│   │   │   │   ├── pipeline/           # Kanban de vendas
│   │   │   │   ├── equipe/             # Gestao de equipe
│   │   │   │   └── sessoes/            # Sessoes WhatsApp
│   │   │   ├── intelligence/           # Inteligencia competitiva
│   │   │   ├── social-publisher/       # Publicacao social
│   │   │   │   ├── calendario/         # Calendario editorial
│   │   │   │   ├── demandas/           # Fluxo de demandas
│   │   │   │   ├── biblioteca/         # Biblioteca de midia
│   │   │   │   └── historico/          # Historico de posts
│   │   │   ├── campanhas/              # Campanhas em massa
│   │   │   │   ├── nova/               # Wizard de criacao
│   │   │   │   └── [id]/              # Detalhe + execucao
│   │   │   ├── base-conhecimento/      # Base de conhecimento (RAG)
│   │   │   └── settings/              # Configuracoes
│   │   │
│   │   └── api/                        # ~98 endpoints
│   │       ├── auth/                   # Login, company-id
│   │       ├── campaigns/              # CRUD + execucao + recipients
│   │       ├── whatsapp/               # 30+ endpoints
│   │       ├── social/                 # Scheduling, demands, publishing
│   │       ├── intelligence/           # Competitors, posts
│   │       ├── rag/                    # Documents, query, process
│   │       ├── integrations/           # CRUD + test
│   │       ├── sofia-crm/             # Sync, process, reset
│   │       ├── report/                 # Daily, PDF, send
│   │       ├── settings/              # Stats, alerts, group-agent
│   │       ├── webhooks/              # Evolution API
│   │       ├── cron/                  # Heartbeat, sync, analyze
│   │       └── jobs/                  # Enqueue, process
│   │
│   ├── components/                     # ~120 componentes UI
│   │   ├── layout/                    # Sidebar, Topbar, AppShell
│   │   ├── dashboard/                 # 7 componentes
│   │   ├── whatsapp/                  # 39 componentes
│   │   ├── social/                    # 33 componentes
│   │   ├── campaigns/                 # 5 componentes
│   │   ├── intelligence/              # Radar, competitors
│   │   ├── settings/                  # Integracoes, alertas
│   │   └── ui/                        # Button, Card, Input, etc.
│   │
│   ├── services/                       # Logica de negocio (server-only)
│   │   ├── campaigns/                 # manager, executor, qstash, recipient-generator
│   │   ├── whatsapp/                  # analyzer, batch, auto-assign, response-suggester
│   │   ├── social/                    # publisher, best-times, demands, hashtags, media
│   │   ├── rag/                       # processor, chunker, search, query
│   │   ├── intelligence/              # competitor, radar-enhanced
│   │   ├── sofia-crm/               # client, conversations
│   │   ├── group-agent/              # context, intent, filter, responder, sender
│   │   ├── integrations/             # evolution, upload-post
│   │   └── reports/                  # generator, daily, weekly, whatsapp-sender
│   │
│   ├── lib/                           # Utilitarios compartilhados
│   │   ├── supabase/                 # client, admin, middleware, config
│   │   ├── integrations/             # service, types, crypto (AES)
│   │   ├── ai/                       # openrouter client, embeddings, prompts/
│   │   ├── jobs/                     # queue, processor
│   │   ├── cron/                     # heartbeat
│   │   ├── auth/                     # cookies, cron authorization
│   │   ├── cloudinary/               # upload helpers
│   │   └── scraping/                 # apify client
│   │
│   ├── types/modules/                 # Definicoes de tipo por modulo
│   │   ├── campaigns.types.ts
│   │   ├── social-publisher.types.ts
│   │   ├── group-agent.types.ts
│   │   ├── intelligence.types.ts
│   │   ├── rag.types.ts
│   │   ├── dashboard.types.ts
│   │   └── cloudinary.types.ts
│   │
│   └── database/types/
│       └── database.types.ts          # Tipos gerados do Supabase
│
└── supabase/
    └── migrations/                    # Migracoes SQL
```

---

## 5. Modulos - Detalhamento Tecnico

### 5.1 Dashboard (`/dashboard`)

**Proposito:** Visao consolidada de KPIs de todos os modulos.

**Componentes:**
- MetricCard com variacao temporal (7d vs 14d)
- SentimentOverview (WhatsApp)
- CompetitiveIntelligenceCard (posts virais, engagement)
- ContentPerformanceChart (por plataforma)
- IntegrationsStatus (saude das conexoes)
- RecentReportsCard + NextReportScheduled
- CriticalAlerts summary

**Dados:** Agrega metricas de conversations, posts, competitors, reports.

---

### 5.2 WhatsApp Intelligence (`/whatsapp-intelligence`)

**Proposito:** Analise de conversas WhatsApp com IA, pipeline de vendas, gestao de contatos.

**Sub-rotas:**
| Rota | Funcao |
|------|--------|
| `/` | Dashboard com sentiment/intent |
| `/conversas` | Listagem com filtros |
| `/conversas/[id]` | Chat + insights |
| `/conversas/analise-lote` | Analise em massa |
| `/contatos` | Diretorio 360 |
| `/pipeline` | Kanban de vendas |
| `/equipe` | Membros da equipe |
| `/sessoes` | Status de sessoes WhatsApp |

**Analise com IA (OpenRouter):**
- Sentimento: positivo / neutro / negativo
- Intencao: compra / suporte / reclamacao / duvida / cancelamento / outro
- Estagio de venda: discovery -> qualification -> proposal -> negotiation -> closing -> post_sale
- Urgencia, objecoes, proximos compromissos
- Sugestao de resposta com contexto

**Servicos:**
- `analyzer.ts` — Analise individual com prompt engineering
- `batch-analyzer.ts` — Processamento em lote via QStash
- `auto-analyze.ts` — Analise automatica de novas conversas (cron)
- `auto-assign.ts` — Distribuicao inteligente para agentes
- `response-suggester.ts` — Sugestoes de resposta com IA

**API Endpoints (30+):**
- CRUD de conversations, contacts, messages
- Analise individual e em lote
- Sugestao de resposta
- Atribuicao manual e automatica
- Kanban boards e cards
- Labels, notes, export
- Sessao e status
- Envio de mensagem e template
- Avatar proxy

**Integracao Sofia CRM:**
- Sincronizacao periodica via cron (`/api/cron/whatsapp-sync`)
- HTTP/2 client para listagem de contatos, conversas, mensagens
- Sync bidirecional de labels e kanban

**Componentes (39):** Tabelas, chat, filtros, kanban, graficos de sentimento/intencao, workload, batch analysis, contact 360.

---

### 5.3 Intelligence (`/intelligence`)

**Proposito:** Monitoramento de concorrentes e radar de conteudo.

**Funcionalidades:**
- Cadastro e rastreamento de perfis concorrentes
- Coleta automatica de posts via Apify (Instagram, TikTok)
- Scoring de engajamento por concorrente
- Deteccao de posts virais
- Radar de conteudo v2.0 com insights

**Servicos:**
- `competitor.ts` — CRUD de perfis
- `radar-enhanced.ts` — Radar de conteudo aprimorado

**API Endpoints:**
- `POST /api/intelligence/collect` — Coleta via Apify
- CRUD `/api/intelligence/competitors` e `/api/intelligence/posts`

**Integracao Apify:**
- Actors para Instagram (perfil, posts, reels) e TikTok (perfil, hashtags)
- Configuravel por env vars (actor IDs, timeout, max posts)

---

### 5.4 Social Publisher (`/social-publisher`)

**Proposito:** Gestao editorial, agendamento e publicacao multi-plataforma.

**Sub-rotas:**
| Rota | Funcao |
|------|--------|
| `/` | Dashboard + formulario de agendamento |
| `/calendario` | Calendario editorial (dia/semana/agenda) |
| `/demandas` | Kanban de demandas de conteudo |
| `/demandas/[id]` | Detalhe + fluxo de aprovacao |
| `/biblioteca` | Biblioteca de midia (Cloudinary) |
| `/historico` | Historico de posts publicados |

**Plataformas suportadas:** Instagram, LinkedIn, TikTok, Facebook

**Tipos de post:** Photo, Video, Carousel

**Fluxo de demandas:**
```
criacao -> review -> aprovado -> enviado
```
- Aprovacao via token (link publico assinado)
- Comentarios e historico de transicoes

**Funcionalidades:**
- Heatmap de melhores horarios (dia/hora)
- Grupos de hashtags reutilizaveis
- Biblioteca de midia com Cloudinary
- Preview mockup por plataforma
- Editor de imagem integrado
- Status: scheduled, processing, published, partial, failed, cancelled

**Servicos (8):**
- `publisher.ts` — Publicacao via Upload.Post API
- `best-times.ts` — Analytics de horarios otimos
- `content-demands.ts` — Workflow de demandas
- `hashtag-groups.ts` — Gestao de hashtags
- `media-library.ts` — CRUD Cloudinary
- `cloudinary-upload.ts` — Upload wrapper
- `qstash.ts` — Agendamento assincrono

**API Endpoints:**
- Scheduling, publishing, demands, comments, approval tokens
- Calendar, best-times, hashtag groups, media library
- Connected platforms

**Componentes (33):** Calendario, kanban de demandas, hashtag picker, media library, mockup previews, post history.

---

### 5.5 Campanhas em Massa (`/campanhas`)

**Proposito:** Envio automatizado de templates WhatsApp para listas segmentadas.

**Ciclo de vida:**
```
draft -> scheduled/running -> paused/completed/failed
```

**Motor de execucao:**
- Lotes de 15 recipients
- Throttling de 3s entre envios
- Re-verificacao de pausa a cada 5 envios
- Continuacao automatica via QStash
- Retries: 3, timeout: 120s

**Filtragem de recipients:**
- Labels do CRM
- Genero
- Data de cadastro
- Deduplicacao automatica (unique phone por campanha)

**Tabelas:** `campaigns`, `campaign_recipients` (com RLS)

**Servicos (4):** manager, executor, recipient-generator, qstash

**Componentes (5):** Wizard multi-step, lista paginada, detalhe com controles, status badge.

---

### 5.6 Base de Conhecimento / RAG (`/base-conhecimento`)

**Proposito:** Upload de documentos PDF, indexacao vetorial e busca semantica para injecao de contexto em conversas WhatsApp.

**Pipeline:**
```
Upload PDF -> Chunking -> Embedding -> Vector Index -> Semantic Search -> Context Injection
```

**Funcionalidades:**
- Upload e gestao de documentos
- Chunking inteligente de texto
- Embeddings vetoriais para busca semantica
- Query com contexto para respostas fundamentadas
- Injecao automatica em conversas WhatsApp (Group Agent)

**Servicos (6):**
- `processor.ts` — Pipeline de ingestao
- `chunker.ts` — Segmentacao de documentos
- `search.ts` — Busca por similaridade vetorial
- `query.ts` — Queries contextuais
- `kb-context.ts` — Recuperacao de contexto
- `qstash.ts` — Processamento assincrono

**API Endpoints:**
- CRUD `/api/rag/documents`
- `POST /api/rag/process` — Processamento assincrono
- `POST /api/rag/query` — Busca semantica

---

### 5.7 Group Agent (IA para Grupos WhatsApp)

**Proposito:** Agente de IA que responde automaticamente em grupos WhatsApp com base na base de conhecimento.

**Pipeline:**
```
Mensagem recebida -> Filtro -> Deteccao de Intencao -> Contexto RAG -> Resposta IA -> Envio
```

**Servicos (7):**
- `context-builder.ts` — Monta contexto para o LLM
- `intent-detector.ts` — Classifica intencao da mensagem
- `message-filter.ts` — Filtra mensagens irrelevantes
- `media-processor.ts` — Extrai texto de midia
- `rag-feeder.ts` — Injeta contexto da base de conhecimento
- `responder.ts` — Gera resposta via OpenRouter
- `sender.ts` — Envia resposta via Sofia CRM

**Webhook:** `/api/webhooks/evolution/group` (Evolution API)

**Configuracao:** Por grupo, via `/settings` (habilitado/desabilitado, tom, restricoes)

---

### 5.8 Reports (Relatorios Automaticos)

**Proposito:** Geracao e envio automatico de relatorios diarios e semanais.

**Funcionalidades:**
- Relatorio diario compilado automaticamente
- Relatorio semanal com PDF
- Envio via WhatsApp
- Templates de relatorio

**Servicos (5):**
- `generator.ts` — Logica de geracao
- `daily-generator.ts` / `daily-job.ts` — Job diario
- `weekly-job.ts` — Job semanal
- `whatsapp-sender.ts` — Envio via WhatsApp

**API:** `/api/report/daily`, `/api/report/pdf`, `/api/report/send`

---

### 5.9 Alertas

**Proposito:** Notificacoes automaticas baseadas em triggers de conversas WhatsApp.

**Triggers:** Sentimento negativo, intencao de cancelamento, urgencia alta.

**Servicos (3):**
- `alert-dispatcher.ts` — Roteamento para destinatarios
- `alert-triggers.ts` — Regras de disparo
- `alert-messages.ts` — Formatacao de notificacoes

**Pagina publica:** `/alertas/whatsapp/[token]` — Visualizacao de alerta via link assinado.

---

### 5.10 Configuracoes (`/settings`)

**Funcionalidades:**
- Gestao de integracoes (Sofia CRM, Evolution API, Upload.Post, OpenRouter)
- Teste de conexao por integracao
- Status de plataformas sociais conectadas
- Configuracao do Group Agent por grupo
- Configuracao de alertas
- Dashboard de estatisticas
- Monitoramento de jobs assincronos

---

## 6. Modelo de Dados (Supabase)

### Tabelas Principais

| Tabela | Modulo | Descricao |
|--------|--------|-----------|
| companies | Core | Empresa (name, niche, logo_url) |
| users | Core | Usuarios (email, full_name, avatar_url) |
| memberships | Core | Relacao user <-> company (role: owner/admin/member) |
| integrations | Core | Credenciais de servicos externos (encriptadas com AES) |
| async_jobs | Core | Fila de jobs assincronos |
| conversations | WhatsApp | Conversas sincronizadas |
| messages | WhatsApp | Mensagens individuais |
| contacts | WhatsApp | Perfis de contatos |
| conversation_insights | WhatsApp | Resultados de analise IA |
| labels | WhatsApp | Etiquetas de conversas |
| kanban_boards | WhatsApp | Boards do pipeline |
| kanban_cards | WhatsApp | Cards do pipeline |
| group_messages | WhatsApp | Mensagens de grupos |
| group_agent_configs | WhatsApp | Config do agente IA por grupo |
| group_agent_responses | WhatsApp | Historico de respostas IA |
| campaigns | Campanhas | Definicoes de campanhas |
| campaign_recipients | Campanhas | Destinatarios individuais |
| social_scheduled_posts | Social | Posts agendados |
| social_published_posts | Social | Posts publicados |
| social_demands | Social | Demandas de conteudo |
| social_approval_tokens | Social | Tokens de aprovacao |
| hashtag_groups | Social | Grupos de hashtags |
| media_library_files | Social | Arquivos Cloudinary |
| competitor_profiles | Intelligence | Perfis de concorrentes |
| competitor_metrics | Intelligence | Metricas de engajamento |
| collected_posts | Intelligence | Posts coletados |
| knowledge_base_documents | RAG | Documentos uploadados |
| knowledge_base_chunks | RAG | Chunks com embeddings |
| reports | Reports | Relatorios gerados |

### Seguranca de Dados

- **RLS (Row Level Security):** Todas as tabelas filtradas por `company_id` via `memberships`
- **Encriptacao:** Credenciais de integracoes encriptadas com AES (`crypto.ts`)
- **Server-only:** Services marcados com diretiva para execucao exclusiva no servidor
- **Zod:** Validacao de schema em todas as API routes

---

## 7. Autenticacao e Autorizacao

| Aspecto | Implementacao |
|---------|---------------|
| Auth Provider | Supabase Auth (JWT) |
| Metodos de Login | Magic Link + Password |
| Persistencia | Cookie "Remember Me" |
| Middleware | `middleware.ts` protege todas as rotas exceto auth, onboarding, links publicos |
| Multi-tenancy | Via `memberships` (user_id, company_id, role) |
| Roles | owner, admin, member |
| RLS | Policies em todas as tabelas vinculadas a company_id |
| Rotas Publicas | `/login`, `/register`, `/auth/*`, `/onboarding`, `/alertas/*`, `/aprovacao/*` |

---

## 8. Integracao com Servicos Externos

### 8.1 Sofia CRM (WhatsApp Business)
- **Funcao:** Sync de conversas, contatos, mensagens; envio de templates; kanban; labels
- **Protocolo:** HTTP/2 REST API
- **Auth:** API Token
- **Env:** `SOFIA_CRM_BASE_URL`, `SOFIA_CRM_API_TOKEN`

### 8.2 Evolution API (WhatsApp Multi-Device)
- **Funcao:** Conexao WhatsApp via QR Code; gestao de grupos; webhook de mensagens
- **Webhook:** `/api/webhooks/evolution/group`
- **Env:** `EVOLUTION_API_BASE_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`

### 8.3 Upload.Post (Social Media)
- **Funcao:** Publicacao em Instagram, LinkedIn, TikTok, Facebook
- **Funcionalidades:** OAuth, scheduling, status tracking
- **Env:** `UPLOAD_POST_API_KEY`, `UPLOAD_POST_API_BASE_URL`

### 8.4 OpenRouter (LLM/IA)
- **Funcao:** Analise de conversas, sugestao de respostas, relatorios, RAG queries
- **Modelos:** Default: minimax/minimax-m2.5 | Light: openai/gpt-5-nano
- **Fallback:** Llama 3.3, Qwen, Mistral, Gemma (modelos gratuitos)
- **Env:** `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_MODEL_LIGHT`

### 8.5 Cloudinary (Midia)
- **Funcao:** Storage, CDN, transformacao de imagens/videos
- **Env:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### 8.6 Apify (Web Scraping)
- **Funcao:** Coleta de dados de concorrentes (Instagram, TikTok)
- **Env:** `APIFY_API_TOKEN`, actor IDs para cada plataforma

### 8.7 QStash / Upstash (Fila)
- **Funcao:** Jobs assincronos, agendamento, retry automatico
- **Uso:** Campanhas, publicacao social, RAG processing
- **Seguranca:** Assinatura criptografica em callbacks
- **Env:** `QSTASH_TOKEN`, `QSTASH_URL`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`

---

## 9. Jobs Assincronos e Cron

### Cron Endpoints

| Endpoint | Funcao | Frequencia Sugerida |
|----------|--------|-------------------|
| `/api/cron/heartbeat` | Orquestrador: recupera jobs travados, enfileira syncs e analises | 1 min |
| `/api/cron/process-jobs` | Processa fila de async_jobs | 1 min |
| `/api/cron/whatsapp-sync` | Sincroniza conversas do Sofia CRM | 15 min |
| `/api/cron/whatsapp-analyze` | Auto-analisa novas conversas | 5 min |
| `/api/cron/whatsapp-batch` | Processamento em lote | 5 min |
| `/api/cron/group-rag-batch` | Batch do Group Agent com RAG | 5 min |

### Sistema de Jobs

- **Fila:** Tabela `async_jobs` no Supabase
- **Tipos:** `sofia_crm_sync`, `weekly_report`, `whatsapp_analyze`, etc.
- **Retry:** Backoff exponencial (2-30 min)
- **Recovery:** Heartbeat recupera jobs stuck (>5 min running, >10 min pending)
- **Processamento:** Via `lib/jobs/queue.ts` e `lib/jobs/processor.ts`

---

## 10. Design System

### Cores por Modulo

| Modulo | Cor | Hex |
|--------|-----|-----|
| Primaria (Axiomix) | Laranja | #FA5E24 |
| Dashboard | Cinza | #8A8A8A |
| WhatsApp Intelligence | Teal | #2EC4B6 |
| Intelligence | Dourado | #D4A853 |
| Social Publisher | Laranja | #FA5E24 |
| Campanhas | Verde | #25D366 |
| Base de Conhecimento | Roxo | #7C3AED |

### Tipografia
- Display: Bricolage Grotesque
- Body: Instrument Sans
- Mono: Geist Mono

### Padroes UI
- Componentes Ant Design dentro de `.antd-scope`
- Tema Warm Neutral customizado via `AntProvider`
- Tabelas: `axiomixTableProps`, paginacao de 20 itens
- CSS vars para cores: `--color-primary`, backgrounds warm neutral
- Dark mode via class strategy (Tailwind)

---

## 11. Variaveis de Ambiente

```env
# === App ===
NEXT_PUBLIC_APP_URL=

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# === Seguranca ===
INTEGRATIONS_ENCRYPTION_KEY=
CRON_SECRET=

# === QStash (Upstash) ===
QSTASH_TOKEN=
QSTASH_URL=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# === OpenRouter (IA) ===
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
OPENROUTER_MODEL_LIGHT=

# === Sofia CRM ===
SOFIA_CRM_BASE_URL=
SOFIA_CRM_API_TOKEN=
SOFIA_CRM_WEBHOOK_TOKEN=

# === Evolution API ===
EVOLUTION_API_BASE_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=
EVOLUTION_WEBHOOK_URL=
EVOLUTION_WEBHOOK_API_KEY=
NEXT_PUBLIC_EVOLUTION_WEBHOOK_TOKEN=

# === Upload.Post ===
UPLOAD_POST_API_KEY=
UPLOAD_POST_API_BASE_URL=

# === Cloudinary ===
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# === Apify ===
APIFY_API_TOKEN=
APIFY_API_BASE_URL=
# + actor IDs por plataforma

# === Social Intelligence ===
SOCIAL_INTELLIGENCE_PROVIDER_INSTAGRAM=apify
SOCIAL_INTELLIGENCE_PROVIDER_TIKTOK=apify
SOCIAL_PROVIDER_TIMEOUT_MS=
SOCIAL_PROVIDER_MAX_POSTS=
```

---

## 12. Referencia de API Routes (~98 endpoints)

### Auth
| Metodo | Rota | Funcao |
|--------|------|--------|
| POST | `/api/auth/login` | Login (password/magic link) |
| GET | `/api/auth/company-id` | Company do usuario autenticado |

### WhatsApp (~30 endpoints)
| Metodo | Rota | Funcao |
|--------|------|--------|
| GET/POST | `/api/whatsapp/conversations` | Listar/filtrar conversas |
| GET/PUT | `/api/whatsapp/conversations/[id]` | Detalhe/atualizar |
| POST | `/api/whatsapp/analyze` | Analise IA individual |
| POST | `/api/whatsapp/bulk-analyze` | Analise em lote |
| POST | `/api/whatsapp/suggest-response` | Sugestao de resposta |
| POST | `/api/whatsapp/assign` | Atribuir conversa |
| POST | `/api/whatsapp/auto-assign` | Auto-atribuicao |
| POST | `/api/whatsapp/send-message` | Enviar mensagem |
| POST | `/api/whatsapp/send-template` | Enviar template |
| GET/POST | `/api/whatsapp/contacts` | Listagem de contatos |
| POST | `/api/whatsapp/labels` | Gestao de labels |
| POST | `/api/whatsapp/kanban/boards` | Gestao de boards |
| POST | `/api/whatsapp/kanban/cards` | Gestao de cards |
| POST | `/api/whatsapp/export` | Exportar conversas |
| POST | `/api/whatsapp/sessions` | Gestao de sessoes |
| POST | `/api/whatsapp/start-conversation` | Iniciar conversa |
| ... | ... | + ~15 endpoints adicionais |

### Social Media (~20 endpoints)
| Metodo | Rota | Funcao |
|--------|------|--------|
| GET/POST | `/api/social/schedule` | Agendar posts |
| POST | `/api/social/publish` | Publicar (QStash) |
| GET/POST | `/api/social/demands` | CRUD demandas |
| POST | `/api/social/demands/[id]/transition` | Transicao de status |
| POST | `/api/social/demands/[id]/approval-link` | Gerar link de aprovacao |
| GET | `/api/social/best-times` | Melhores horarios |
| GET | `/api/social/calendar` | Dados do calendario |
| POST | `/api/social/hashtag-groups` | Grupos de hashtags |
| GET/POST | `/api/social/media-library` | Biblioteca de midia |
| POST | `/api/social/connected-platforms` | Plataformas conectadas |

### Campaigns (~10 endpoints)
| Metodo | Rota | Funcao |
|--------|------|--------|
| POST | `/api/campaigns` | Listar/criar |
| POST | `/api/campaigns/[id]` | Obter/atualizar/deletar |
| POST | `/api/campaigns/[id]/start` | Iniciar |
| POST | `/api/campaigns/[id]/pause` | Pausar/retomar |
| POST | `/api/campaigns/[id]/recipients` | Listar recipients |
| POST | `/api/campaigns/[id]/recipients/generate` | Gerar lista |
| POST | `/api/campaigns/[id]/preview` | Preview template |
| POST | `/api/campaigns/process` | Callback QStash |

### Intelligence, RAG, Reports, Settings, Integrations
_(Detalhados nas secoes anteriores)_

---

## 13. Estatisticas do Projeto

| Metrica | Valor |
|---------|-------|
| Componentes UI | ~120 |
| API Endpoints | ~98 |
| Service Files | ~44 |
| Tabelas no Banco | ~30 |
| Tipos/Interfaces | ~50 |
| Arquivos TypeScript | ~250+ |
| Integracoes Externas | 7 |
| Modulos Funcionais | 7 |
