# Reestruturacão WhatsApp Intelligence — Plano Definitivo

> Documento gerado em 2026-04-29 a partir de discussão colaborativa (Party Mode: John, Winston, Sally, Amelia, Mary, Victor, Murat).

---

## 1. Premissas Confirmadas

| Fato | Detalhe |
|---|---|
| Multi-tenancy | Axiomix é multi-tenant (Supabase RLS por `company_id`) |
| Evo CRM por cliente | Cada cliente tem sua própria stack Evo CRM (criada manualmente pelo Eneas) |
| Evo CRM invisível | 100% backend — cliente nunca vê URL, credencial ou interface do Evo CRM |
| Axiomix = interface completa | Cliente opera tudo pelo Axiomix: conversas, pipeline, contatos, ajustes de agentes |
| Roles distintos | **Eneas (admin):** cria agentes, KB, configura stacks. **Cliente:** opera dia a dia + ajusta parâmetros limitados |
| Agentes IA | Eneas cria, cliente só ajusta (tom, horário, boas-vindas, escalação) |

---

## 2. Arquitetura Final

### Fluxo de Dados

```
[WhatsApp] <-> [Evo CRM Stack/Cliente] <-> [Axiomix Backend] <-> [Browser]
                 webhook + API REST        Supabase Realtime
```

### Princípios Arquiteturais

- **Evo CRM = fonte de verdade operacional** (conversas, contatos, pipelines, agentes)
- **Supabase = cache local + warehouse analítico + estado de UI**
- **Factory pattern:** `getEvoCrmClient(companyId)` — credenciais isoladas por tenant
- **Proxy bidirecional:** envio: Axiomix -> Evo CRM -> WhatsApp | recebimento: WhatsApp -> Evo CRM -> webhook -> Supabase -> Realtime -> Browser
- **Cron 15min rebaixado** para safety net de reconciliação (não mais fonte primária)
- **Desired/actual state** com `sync_status` para config de agentes e KB

### Camadas

1. **Config Layer** — Eneas cria agentes, define parâmetros base, monta stack. Escreve no Evo CRM via API e salva snapshot de intenção no Supabase.
2. **Adjustment Layer** — Cliente ajusta dentro de limites definidos pelo Eneas. Escrita também vai para o Evo CRM.
3. **Observation Layer** — Webhooks do Evo CRM chegam, Axiomix compara com snapshot de intenção. Divergência = drift detectado.
4. **Intelligence Layer** — Analytics cross-client, benchmarks, anomalias — dados agregados no Supabase.

---

## 3. Estrutura de Produto

### Visão Cliente (Operação Diária)

| Seção | Rota | Descrição |
|---|---|---|
| Dashboard | `/dashboard` | Visão geral de performance |
| Conversas | `/conversas` | Lista unificada, filtros por canal/agente/status |
| Chat | `/conversas/[id]` | Histórico humano+IA, campo de resposta real, painel lateral (contato, pipeline), botão assumir/devolver IA |
| Pipeline | `/pipeline` | Kanban com drag-and-drop real (proxy para Evo CRM) |
| Contatos | `/contatos` | CRUD via Evo CRM API |
| Meus Agentes | `/inteligencia/agentes/[id]/ajuste` | Painel de ajuste limitado (tom, horário, boas-vindas, escalação) |
| Meu Desempenho | `/performance/meu-desempenho` | Métricas pessoais |

### Visão Eneas (Admin)

| Seção | Rota | Descrição |
|---|---|---|
| Painel Admin | `/admin` | Visão consolidada de todos os clientes |
| Agentes IA | `/inteligencia/agentes` | Lista + wizard de criação (5 passos) |
| Agente Detalhe | `/inteligencia/agentes/[id]` | Edição completa (prompt, tipo, KB, tools, MCP) |
| Knowledge Base | `/inteligencia/bases-conhecimento` | CRUD de documentos por cliente + "Testar Busca" |
| Sessões | `/inteligencia/sessoes` | Canais conectados |
| Análise | `/performance/analise` | Relatórios, análise em lote |
| Benchmarks | `/performance/benchmarks` | Cross-client, ROI, comparativos |
| Equipe | `/equipe` | Membros, papéis, permissões |
| Configurações | `/configuracoes` | Integrações, webhook, billing |

### Wizard de Criação de Agente (Eneas — 5 passos)

1. **Identidade** — nome, descrição, cliente
2. **Tipo e Papel** — LLM / Task / Sequential / Parallel / Loop + Role + Goal
3. **Comportamento** — instruções, modelo IA, regras de inatividade
4. **Conhecimento e Memória** — KBs vinculadas + memória curto/médio/longo prazo
5. **Ferramentas e Sub-agentes** — tools HTTP + MCP Servers + composição

### Renomeação do Módulo

"WhatsApp Inteligente" -> **"Inteligência"** (módulo evoluiu além do WhatsApp)

---

## 4. Navegação Final (Sidebar)

### Eneas (Admin)

```
AXIOMIX
  Dashboard

OPERAÇÕES
  Conversas
  Contatos
  Pipeline

INTELIGÊNCIA
  Agentes
  Bases de Conhecimento
  Sessões

PERFORMANCE
  Análise
  Benchmarks

SISTEMA
  Equipe
  Configurações
```

### Cliente

```
AXIOMIX
  Dashboard

OPERAÇÕES
  Conversas
  Contatos
  Pipeline

INTELIGÊNCIA
  Meus Agentes (ajuste limitado)

PERFORMANCE
  Meu Desempenho
  Análise da Equipe (visão limitada)
```

---

## 5. Roadmap de Implementação (6 Fases)

### Diagrama de Dependências

```
F0 (factory)           -> pré-requisito de tudo
  |
F1 (webhooks+realtime) -> pré-requisito de F2, F3, F6
  |
F2 (chat bidirecional) --\
F3 (delegação IA)      ---+-- paralelo
  |                       |
F4 (agentes UI)        --+
F5 (knowledge base)    --+-- paralelo
F6 (kanban real)       --/
```

### F0 — Factory Pattern (Fundação Multi-Tenant)

**Objetivo:** Eliminar singleton do client.ts, estabelecer factory por empresa.

**Muda:**
- `src/services/evo-crm/client.ts` -> factory function `getEvoCrmClient(companyId)`

**Novo:**
- `src/services/evo-crm/factory.ts` — factory com cache TTL 5min
- `src/services/evo-crm/types.ts` — tipos extraídos do monolito
- `src/lib/errors/evo-crm-errors.ts` — erros tipados
- Migration: tabela `company_evo_credentials` (base_url, api_key encrypted, status)

**AC:** `getEvoCrmClient('a')` e `getEvoCrmClient('b')` retornam instâncias isoladas. Typecheck green.

### F1 — Webhook-Driven Sync

**Objetivo:** Dados em tempo real via webhook, não polling de 15 minutos.

**Muda:**
- Cron de 15min -> rebaixado para safety net de reconciliação

**Novo:**
- `src/app/api/webhooks/evo-crm/route.ts` — handler com HMAC validation por company
- `src/services/webhooks/evo-crm-processor.ts` — processamento de eventos (Zod validation)
- `src/hooks/useRealtimeMessages.ts` — Supabase Realtime subscription
- `src/hooks/useRealtimePipeline.ts` — idem para pipeline
- Migration: `webhook_events_log`, colunas `evo_message_id UNIQUE`, `evo_contact_id UNIQUE`

**AC:** Mensagem no WhatsApp aparece no chat do Axiomix em < 3 segundos.

### F2 — Chat Bidirecional

**Objetivo:** Cliente responde mensagens pelo Axiomix.

**Muda:**
- `src/components/whatsapp/conversation-chat.tsx` — adiciona envio real + optimistic update

**Novo:**
- `src/app/api/whatsapp/messages/send/route.ts` — proxy para Evo CRM
- `src/services/evo-crm/messaging.ts` — sendText/sendMedia com retry

**AC:** Usuário envia mensagem -> aparece no WhatsApp do contato. Resposta aparece sem reload.

### F3 — Delegação de IA para Evo CRM

**Objetivo:** Remover análise local, usar AI do Evo CRM.

**Muda:**
- `src/services/whatsapp/analyzer.ts` -> delega para Evo CRM AI Assistance
- `src/services/whatsapp/response-suggester.ts` -> delega para Evo CRM
- `src/services/whatsapp/auto-assign.ts` -> delega para assignment nativo

**Deleta (após 2 semanas de validação):**
- `src/services/whatsapp/auto-analyze.ts`
- `src/services/whatsapp/batch-analyzer.ts`

**Mantém:**
- `src/services/whatsapp/conversation-exclusions.ts` (lógica de negócio local)

**AC:** Zero chamadas a APIs de LLM externas. Sugestões funcionam via Evo CRM.

### F4 — Gestão de Agentes IA (Nova Feature)

**Objetivo:** Eneas cria agentes via Axiomix admin; cliente ajusta parâmetros limitados.

**Novo:**
- `src/services/evo-crm/agents.ts` — CRUD via Evo CRM Core API
- `src/app/api/whatsapp/agents/route.ts` + `[agentId]/route.ts`
- `src/app/(app)/whatsapp-intelligence/agents/page.tsx` + `[agentId]/page.tsx`
- `src/components/whatsapp/agents/` — AgentCard, AgentForm, AgentTypeSelector, AgentStatusBadge

**AC:** Admin cria agente -> aparece no Evo CRM. Credenciais Evo nunca expostas ao frontend.

### F5 — Knowledge Base (Nova Feature)

**Objetivo:** Gerenciar bases de conhecimento dos agentes via Axiomix.

**Novo:**
- `src/services/evo-crm/knowledge-base.ts` — CRUD + search via Evo CRM Knowledge API
- `src/app/api/whatsapp/knowledge-base/` — routes
- `src/app/(app)/whatsapp-intelligence/knowledge-base/` — pages
- `src/components/whatsapp/knowledge-base/` — KnowledgeBaseList, DocumentUpload, DocumentCard, KbStatusIndicator

**AC:** Upload de PDF -> indexado no Evo CRM em < 60 segundos.

### F6 — Pipeline Kanban Real

**Objetivo:** Drag-and-drop proxy para Evo CRM pipeline API.

**Muda:**
- `src/components/whatsapp/kanban-board.tsx` — onCardMove proxy para Evo CRM

**Novo:**
- `src/app/api/whatsapp/pipeline/move/route.ts` — proxy com optimistic update

**AC:** Drag card -> move no Evo CRM. Falha -> card volta com toast de erro.

---

## 6. Inventário de Componentes

### Ficam Sem Mudança (maioria dos 39)
- Componentes UI puros: MessageBubble, ConversationHeader, ConversationList, ContactAvatar, MetricCard, etc.

### Mudam (data source)
- `conversation-chat.tsx` -> bidirecional
- `kanban-board.tsx` -> move real
- `contacts-table.tsx` -> CRUD via Evo CRM
- `conversations-table.tsx` -> dados via webhook/Realtime

### Deletar (após validação)
- `auto-analyze.ts`, `batch-analyzer.ts`
- Cron routes (rebaixar, depois remover)

### Novos
- Factory, types, errors (evo-crm/)
- Messaging, agents, knowledge-base (evo-crm/)
- Webhook processor (webhooks/)
- Realtime hooks (hooks/)
- Agent/KB pages e componentes
- API routes para agents, KB, pipeline/move, messages/send

---

## 7. Plano de Testes (Murat)

### Riscos Existenciais (60% do esforço de teste)

1. **Isolamento de tenant** — company A NUNCA acessa dados de company B
2. **Mensagens** — nunca perdidas, nunca duplicadas
3. **Contrato da API Evo CRM** — detectar mudanças antes de quebrar produção

### Metas de Cobertura

| Fase | Meta | Justificativa |
|---|---|---|
| F0 | 95%+ | Alicerce — falha aqui é catastrófica |
| F1 | 90%+ | Webhook é o coração |
| F2 | 85%+ | Chat é user-facing |
| F3 | 80%+ | Risco de regressão |
| F4 | 80%+ | CRUD + permissões |
| F5 | 75%+ | Funcionalidade nova |
| F6 | 70%+ | Mais visual, E2E compensa |

### Tipos de Teste por Fase

**F0:** Unitários (factory, cache, isolamento), integração (RLS), security (credential leak scan)
**F1:** Unitários (HMAC, idempotência, parsing), integração (webhook->Supabase->Realtime), carga (k6: 100 webhooks/10s)
**F2:** Unitários (send, optimistic update, falhas), integração (round-trip < 3s), E2E (Playwright: login->chat->enviar->receber)
**F3:** Unitários (delegação), contrato (schemas Evo CRM), regressão (antes/depois da remoção)
**F4-F6:** Unitários (CRUD, permissões), integração (RLS), E2E (drag-and-drop Playwright)

### Contract Testing — CI Diário

```
src/services/evo-crm/__tests__/contracts/
  contacts.contract.test.ts
  messages.contract.test.ts
  pipeline.contract.test.ts
  agents.contract.test.ts
  knowledge.contract.test.ts
```

Request real para API staging -> valida schema com Zod -> quebra se mudar.

### Fixture Architecture

```
src/__tests__/fixtures/
  companies.ts, credentials.ts
  evo-crm-responses/ (JSON snapshots)
  helpers/mock-evo-client.ts, webhook-signer.ts
```

### Regra de Ouro

> TDD para F0 e F1 é requisito, não sugestão. Cada fase termina com: typecheck zero erros, lint zero warnings, test 100% green, deploy staging verificado.

---

## 8. Decisões de Design (Sally)

- **Módulo renomeado:** "WhatsApp Inteligente" -> "Inteligência"
- **Duas experiências na mesma superfície:** Eneas (cockpit denso) vs Cliente (painel simples)
- **Metáfora do ajuste de agente:** equalizador de som / painel de carro alugado — ajusta banco e ar, não mexe no motor
- **Wizard de agente:** 5 passos, botão final "Ativar Agente" (não "Salvar")
- **KB com "Testar Busca":** painel lateral onde digita pergunta e vê chunks antes de ativar
- **Dashboard cross-client** com `ax-value-pulse` nos números que mudaram
- **Design system:** Orange Command (#E8600F), dark mode Deep Night (#080B10), DecisionAxis, animações ax-*

---

## 9. Visão Estratégica (Mary + Victor)

### Posicionamento

> "Axiomix é a camada de gestão unificada que transforma N stacks isoladas de CRM em uma operação coordenada, inteligente e escalável."

### Três Camadas de Valor

1. **Fábrica de Stacks** — onboarding automatizado (futuro), setup em minutos vs horas
2. **Control Plane** — gerenciar agentes, KB, pipelines across N stacks isoladas
3. **Intelligence Layer** — cross-client analytics, benchmarks, anomalias que nenhuma stack individual enxerga

### Moat Competitivo

- Evo CRM é excelente por stack, mas cada instância é uma ilha
- Axiomix é o satélite que fotografa o arquipélago inteiro
- Cross-client intelligence é impossível dentro do Evo CRM por design
- Modelo de negócio: cobra por stack gerenciada, cresce com o cliente

### Risco Mitigado

- Portabilidade: `ControlPlaneAdapter` interface permite trocar de CRM no futuro
- Resiliência: Supabase mantém cache/histórico mesmo se Evo CRM cair
- Multi-fonte: arquitetura preparada para adicionar Google Ads, Meta Business, etc.
