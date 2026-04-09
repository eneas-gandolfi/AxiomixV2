# AXIOMIX — Product Requirements Document (PRD)

**Versão:** 2.0 — MVP
**Status:** Em desenvolvimento
**Última atualização:** Março 2026
**Autor:** Produto AXIOMIX

---

## Sumário

1. [Visão do Produto](#1-visão-do-produto)
2. [Problema e Oportunidade](#2-problema-e-oportunidade)
3. [Público-Alvo](#3-público-alvo)
4. [Objetivos e Métricas de Sucesso](#4-objetivos-e-métricas-de-sucesso)
5. [Arquitetura e Stack Técnica](#5-arquitetura-e-stack-técnica)
6. [Módulos e Funcionalidades](#6-módulos-e-funcionalidades)
   - 6.1 [Autenticação e Multi-Tenancy](#61-autenticação-e-multi-tenancy)
   - 6.2 [Onboarding e Configurações](#62-onboarding-e-configurações)
   - 6.3 [Dashboard](#63-dashboard)
   - 6.4 [WhatsApp Intelligence](#64-whatsapp-intelligence)
   - 6.5 [Intelligence (Concorrentes + Content Radar)](#65-intelligence-concorrentes--content-radar)
   - 6.6 [Social Publisher](#66-social-publisher)
   - 6.7 [Relatório Semanal pelo WhatsApp](#67-relatório-semanal-pelo-whatsapp)
7. [Integrações Externas](#7-integrações-externas)
8. [Modelo de Dados](#8-modelo-de-dados)
9. [Design System](#9-design-system)
10. [Segurança e Privacidade](#10-segurança-e-privacidade)
11. [Infraestrutura e Jobs Assíncronos](#11-infraestrutura-e-jobs-assíncronos)
12. [Roadmap de Desenvolvimento](#12-roadmap-de-desenvolvimento)
13. [Fora de Escopo (MVP)](#13-fora-de-escopo-mvp)
14. [Glossário](#14-glossário)

---

## 1. Visão do Produto

**AXIOMIX** é um micro SaaS multi-tenant de Marketing e Inteligência Competitiva para pequenas e médias empresas brasileiras.

> "Inteligência acionável entregue onde o gestor já está — sem precisar abrir mais um sistema."

O AXIOMIX não substitui ferramentas existentes como o Sofia CRM: ele se conecta a elas, processa os dados com IA e entrega o que importa direto no WhatsApp do gestor, toda semana, de forma automática.

### O diferencial central

Gestores de PMEs não têm tempo para acessar dashboards constantemente. Por isso, o AXIOMIX foi desenhado para ser **útil mesmo sem acesso diário à plataforma**: todo domingo, um resumo executivo da semana é enviado automaticamente pelo WhatsApp — com o que aconteceu nas conversas, o que os concorrentes fizeram e como foram os posts publicados.

A interface web existe para o **time de marketing operar** (agendar posts, analisar conversas, monitorar concorrentes). O gestor recebe o essencial no WhatsApp.

---

## 2. Problema e Oportunidade

### Problemas identificados

**Fragmentação de dados.** As conversas de vendas ficam no WhatsApp, os dados de concorrentes são coletados manualmente, o conteúdo viral é descoberto por acaso e os posts são agendados em ferramentas separadas. Não existe visão unificada.

**Análise reativa.** Sem automação, a equipe só percebe padrões — reclamações recorrentes, conteúdo que engaja, movimento de concorrentes — depois que a janela de oportunidade passou.

**O gestor não tem tempo.** Donos e gestores de PMEs não acessam dashboards diariamente. Relatórios manuais consumem horas do time e chegam tarde demais para gerar ação.

### Oportunidade

Com a maturidade das APIs de IA e a popularização de CRMs de WhatsApp (como o Sofia CRM), existe espaço para uma camada de inteligência que conecte essas fontes, processe os dados automaticamente e entregue insights prontos para ação — sem exigir que o gestor mude seu comportamento ou aprenda uma nova ferramenta.

---

## 3. Público-Alvo

### Perfil primário — Gestor da empresa

Dono ou diretor de PME brasileira (10–200 funcionários) que usa WhatsApp como canal principal de vendas. **Não acessa ferramentas web com frequência.** Quer saber o que está acontecendo no negócio de forma rápida, pelo canal que já usa todos os dias.

**Como o AXIOMIX serve esse perfil:** recebe o resumo semanal diretamente no WhatsApp, toda segunda-feira às 8h, sem precisar fazer login em lugar nenhum.

### Perfil secundário — Time de marketing

Analistas e coordenadores de marketing (1–5 pessoas) que operam no dia a dia: agendando posts, analisando conversas, monitorando concorrentes. **Usam a interface web com frequência.** Precisam de uma ferramenta rápida, sem ruído visual, que centralize o trabalho sem complexidade desnecessária.

**Como o AXIOMIX serve esse perfil:** interface web focada nas três tarefas que mais consomem tempo do time — analisar conversas do WhatsApp com IA, publicar nas redes sociais e monitorar concorrentes.

---

## 4. Objetivos e Métricas de Sucesso

### Objetivos do MVP (primeiros 3 meses)

| Objetivo | Descrição |
|----------|-----------|
| Tempo até valor | Usuário recebe o primeiro relatório pelo WhatsApp em menos de 24h após configurar as integrações |
| Adoção do core | 70% dos usuários ativos do time de marketing usam pelo menos 2 módulos por semana |
| Retenção | Churn mensal abaixo de 5% |
| Satisfação do gestor | NPS acima de 40 nos primeiros 3 meses |

### Métricas por módulo

| Módulo | Métrica principal |
|--------|------------------|
| WhatsApp Intelligence | % de conversas analisadas por IA / semana |
| Intelligence | Coletas de concorrentes e radar realizadas / semana |
| Social Publisher | Posts agendados e publicados com sucesso / semana |
| Relatório WhatsApp | % de gestores que abrem/respondem o relatório semanal |

---

## 5. Arquitetura e Stack Técnica

### Visão geral

```
┌──────────────────────────────────────────────────────┐
│                  AXIOMIX (Next.js 14)                 │
│                                                      │
│   ┌──────────┐   ┌──────────┐   ┌─────────────────┐  │
│   │ Frontend │   │   API    │   │ Background Jobs  │  │
│   │ App      │   │ Route    │   │ Workers          │  │
│   │ Router   │   │ Handlers │   │ (async_jobs)     │  │
│   └────┬─────┘   └────┬─────┘   └────────┬────────┘  │
└────────┼──────────────┼─────────────────-┼────────────┘
         │              │                  │
         ▼              ▼                  ▼
┌──────────────────────────────────────────────────────┐
│                      Supabase                         │
│   ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│   │   Auth   │  │ Postgres │  │ Storage + Realtime  │ │
│   └──────────┘  └──────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│               Integrações Externas                    │
│  Sofia CRM · Evolution API · OpenRouter               │
│  Upload-Post API · Upstash QStash                     │
└──────────────────────────────────────────────────────┘
```

### Stack técnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Framework | Next.js 14 (App Router) | SSR nativo, Route Handlers, deploy serverless |
| Linguagem | TypeScript (strict mode) | Segurança de tipos em toda a base |
| Estilização | TailwindCSS + shadcn/ui | Velocidade de desenvolvimento + consistência |
| BaaS | Supabase | Auth, DB, Storage e Realtime em um só lugar |
| Banco | PostgreSQL via Supabase | RLS para multi-tenancy sem overhead |
| IA | OpenRouter | Flexibilidade de modelo, compatível com OpenAI SDK |
| Agendamento de posts | Upstash QStash | Delay de até 90 dias, retry automático, serverless-friendly |
| Envio de relatório | Evolution API | WhatsApp já usado pelo gestor, sem fricção |
| Validação | Zod | Schema validation no servidor e no cliente |
| Ícones | lucide-react | Biblioteca leve e consistente |

### Princípios arquiteturais

- **Multi-tenancy por `company_id`:** toda query inclui filtro por empresa; RLS garante isolamento mesmo em falha de código
- **Credenciais por empresa:** cada integração usa tokens armazenados criptografados por empresa, nunca variáveis de ambiente globais em produção
- **Jobs assíncronos:** operações pesadas (sync, IA, relatórios) nunca bloqueiam o request do usuário
- **Realtime para UX:** progresso de publicação é transmitido via Supabase Realtime, sem polling
- **WhatsApp como canal de saída principal:** o relatório semanal é o principal ponto de contato com o gestor

---

## 6. Módulos e Funcionalidades

### 6.1 Autenticação e Multi-Tenancy

Sistema de autenticação com suporte a múltiplas empresas. Cada empresa é um tenant completamente isolado por `company_id` com Row Level Security no banco.

#### Funcionalidades

- Login com email e senha
- Magic link (login sem senha)
- Proteção de rotas via middleware global
- Um usuário pode pertencer a múltiplas empresas com papéis diferentes

#### Modelo de acesso por papel

| Ação | Owner | Admin | Member |
|------|-------|-------|--------|
| Editar dados da empresa | ✅ | ✅ | ❌ |
| Configurar integrações | ✅ | ✅ | ❌ |
| Convidar membros | ✅ | ✅ | ❌ |
| Usar todos os módulos | ✅ | ✅ | ✅ |
| Disparar relatório manual | ✅ | ✅ | ❌ |
| Excluir empresa | ✅ | ❌ | ❌ |

---

### 6.2 Onboarding e Configurações

#### Onboarding

Fluxo guiado no primeiro acesso que coleta as informações essenciais da empresa e já direciona para a configuração das integrações — pois sem elas nenhum módulo funciona.

```
Cadastro → sem empresa detectada → /onboarding
  └── Formulário:
        · Nome da empresa (obrigatório)
        · Nicho de mercado (obrigatório)
        · Segmento / subnicho (opcional)
        · URL do site (opcional)
  └── Submit → cria company + membership (owner)
            → redireciona para /settings/integrations
```

O campo `niche` e `sub_niche` são usados pelos workers de Intelligence e pelo gerador de relatório para personalizar os dados coletados e a narrativa da IA.

#### Configurações `/settings`

**Aba Empresa:** editar nome, nicho, logo (upload no Supabase Storage).

**Aba Integrações:** formulário por integração com botão "Testar conexão" que valida as credenciais em tempo real.

| Integração | Campos | Módulo que usa |
|-----------|--------|----------------|
| **Sofia CRM** | URL base, API Token, Inbox ID, toggle sync automático | WhatsApp Intelligence |
| **Evolution API** | URL base, API Key, **número do WhatsApp do gestor** | Relatório semanal |
| **Upload-Post API** | API Key | Social Publisher |
| **OpenRouter** | API Key, seletor de modelo | Todos os módulos com IA |

> O campo "número do WhatsApp do gestor" na Evolution API é obrigatório para o relatório semanal funcionar. O sistema deve destacar isso no formulário.

**Segurança das credenciais:**
- Salvas criptografadas com `pgcrypto` no banco
- Nunca retornam em texto puro para o frontend
- Para editar, o usuário deve redigitar o valor completo (sem pré-preenchimento)

---

### 6.3 Dashboard

Página inicial pós-login com visão consolidada dos principais indicadores.

#### Componentes

- **Cards de métricas:** conversas analisadas na semana, posts publicados, conteúdos virais detectados, engajamento médio dos concorrentes
- **Card "Próximo relatório":** data e hora do próximo envio para o gestor + botão "Enviar agora" (owner/admin)
- **Alertas de atenção:** conversas com sentimento negativo sem resposta, posts falhados
- **Status das integrações:** indicador visual se Sofia CRM, Evolution API e demais estão conectadas e funcionando

---

### 6.4 WhatsApp Intelligence

Sincronização automática de conversas do Sofia CRM com análise de IA para extrair sentimento, intenção de compra, resumo e próximos passos — e envio dessas ações de volta ao Sofia CRM.

#### Sincronização de conversas

- Worker sincroniza conversas e mensagens das últimas 24h a cada ciclo
- Upsert por `company_id + external_id` para evitar duplicatas
- Disparado automaticamente via `async_jobs` ou manualmente pelo usuário

#### Análise de IA

O endpoint `/api/whatsapp/analyze` recebe uma conversa e retorna:

- **Sentimento:** `positivo`, `neutro` ou `negativo`
- **Intenção:** `compra`, `suporte`, `reclamação`, `dúvida`, `cancelamento`
- **Resumo** executivo da conversa
- **Ações sugeridas** (ex: "Enviar proposta", "Escalar para supervisor")

#### Ações automáticas no Sofia CRM

- Intenção = `compra` → cria card no Kanban do Sofia CRM
- Sentimento = `negativo` → adiciona etiqueta "Atenção" ao contato

#### Interface

- Lista de conversas com badge de sentimento e data da última mensagem
- Detalhe com histórico completo + card de insight (sentimento, intenção, resumo, ações)
- Botão "Analisar com IA" para conversas sem insight
- Botão "Abrir no Sofia CRM" com link direto

#### Fluxo

```
Sofia CRM ──webhook──▶ /api/whatsapp/webhook
                               │
                               ▼
                     async_jobs (whatsapp_analyze)
                               │
                               ▼
                     /api/whatsapp/analyze (OpenRouter)
                               │
                     ┌─────────┴──────────┐
                     ▼                    ▼
              Cria card Kanban    Etiqueta "Atenção"
              (se compra)        (se negativo)
```

---

### 6.5 Intelligence (Concorrentes + Content Radar)

Módulo unificado em duas abas que combina monitoramento de concorrentes e detecção de conteúdos virais do nicho.

#### Aba "Concorrentes"

- Cadastro de até **3 concorrentes** por empresa (validado no servidor)
- Campos: nome, URL do site, perfil do Instagram, perfil do LinkedIn
- Coleta automática de posts públicos via worker
- `engagement_score` por post: `likes + (comments × 2) + (shares × 3)`
- Insights de IA: estratégia de conteúdo, temas dominantes, frequência de postagem

**Interface:**
- Cards por concorrente com engajamento médio e última coleta
- Feed dos posts mais recentes com métricas
- Card de insight gerado pela IA
- Botão "Coletar agora"
- Botão "Adicionar" desabilitado ao atingir o limite, com tooltip explicativo

#### Aba "Content Radar"

- Coleta automática baseada no `niche` e `sub_niche` da empresa
- Plataformas: Instagram, LinkedIn, TikTok
- Ordenação por `engagement_score`
- Badge "Viral" para posts acima do threshold
- Botão **"Criar conteúdo baseado nesse post"** → modal com rascunho gerado pela IA

---

### 6.6 Social Publisher

Criação, agendamento e acompanhamento de posts com suporte a foto, vídeo e carrossel.

#### Tipos de mídia

| Tipo | Regra | Formatos |
|------|-------|----------|
| **Foto** | Exatamente 1 imagem | jpg, png, webp |
| **Vídeo** | Exatamente 1 vídeo | mp4, mov |
| **Carrossel** | Mínimo 2, máximo 10 imagens | jpg, png, webp |

Validações ocorrem no frontend (UX imediata) e no servidor (segurança). Um carrossel com menos de 2 imagens é rejeitado com erro 400 e mensagem clara.

#### Formulário em 3 etapas

**Etapa 1 — Mídia:** toggle de tipo + upload drag-and-drop + preview em tempo real

**Etapa 2 — Conteúdo:** legenda com contador por plataforma + seletor de plataformas (Instagram, LinkedIn, TikTok)

**Etapa 3 — Agendamento:** date/time picker + "Publicar agora" ou "Agendar"

#### Fluxo QStash

```
Usuário clica "Agendar"
        │
        ▼
POST /api/social/schedule
  ├─ Valida tipo de mídia
  ├─ Cria scheduled_post (status: 'scheduled')
  ├─ Calcula delay = scheduled_at - now()
  └─ Publica no QStash com delay e retries=3
        │
        ▼ (no horário agendado)
QStash chama POST /api/social/publish
  ├─ Verifica assinatura (obrigatório — rejeita sem assinatura)
  ├─ status → 'processing'
  ├─ Publica em cada plataforma via Upload-Post API
  ├─ Atualiza progress (Supabase Realtime → frontend)
  └─ status → 'published' | 'partial' | 'failed'
```

#### Barra de progresso em tempo real

- Ativada quando status muda para `processing`
- Supabase Realtime escuta o campo `progress`
- Cada plataforma: ⏳ aguardando → 🔄 enviando → ✅ publicado / ❌ falhou

#### Cancelamento

- Disponível apenas para `status = 'scheduled'`
- Remove job do QStash + atualiza status para `cancelled`

#### Histórico

- Tabela paginada (20/página): thumbnail, tipo, legenda, plataformas, data, status, métricas
- Filtros por status e período

---

### 6.7 Relatório Semanal pelo WhatsApp

O módulo mais importante do ponto de vista do gestor. Toda segunda-feira às 8h, um resumo executivo da semana anterior é enviado automaticamente pelo WhatsApp para o número configurado em Settings.

#### Por que WhatsApp?

Gestores de PMEs não têm tempo para abrir dashboards. O WhatsApp é o canal que eles já usam todos os dias, onde a mensagem será lida — não ignorada. O relatório chega sem que o gestor precise fazer nada.

#### Fluxo

```
Toda segunda-feira às 08:00 (Vercel Cron)
  → Enfileira job weekly_report para cada empresa ativa
  → Worker agrega dados da semana anterior:
      · WhatsApp Intelligence: total de conversas, sentimento médio,
        intenções mais frequentes, oportunidades de venda detectadas
      · Content Radar: top 3 posts virais do nicho
      · Concorrentes: movimentos mais relevantes da semana
      · Social Publisher: posts publicados, melhor resultado
  → IA gera narrativa executiva em português (máx. 400 palavras)
  → Texto formatado para WhatsApp (sem markdown, linguagem direta)
  → Enviado via Evolution API para o número do gestor
```

#### Tom e formato da mensagem

```
Você é um analista de marketing que faz resumos executivos diretos.
Gere o resumo em português simples, sem jargões.
Máximo de 400 palavras. Estrutura:

1. Destaque da semana (1 parágrafo)
2. WhatsApp: X conversas, Y oportunidades de venda identificadas
3. Redes sociais: posts publicados, qual teve melhor resultado
4. Concorrentes: o que merece atenção esta semana
5. 1 ação recomendada para os próximos 7 dias

Tom: direto, como um sócio informando o dono do negócio.
Sem asteriscos, sem markdown, sem emojis excessivos.
```

#### Interface no Dashboard

- Card "Próximo relatório" com data e hora do próximo envio
- Botão "Enviar relatório agora" (owner/admin) para disparo manual
- Histórico dos últimos 4 relatórios com prévia do texto enviado

---

## 7. Integrações Externas

### Sofia CRM

| Item | Detalhe |
|------|---------|
| Propósito | Fonte primária de conversas e contatos do WhatsApp |
| Autenticação | Bearer Token por empresa |
| Endpoints | `GET /api/conversations`, `GET /api/conversations/:id`, `POST /api/contacts/:id/labels`, `POST /api/kanban/boards/:boardId/cards` |
| Isolamento | Cada empresa configura sua própria URL e token |

### Evolution API

| Item | Detalhe |
|------|---------|
| Propósito | Envio do relatório semanal para o WhatsApp do gestor |
| Autenticação | API Key por empresa |
| Campo obrigatório | Número do WhatsApp do gestor (configurado em Settings > Integrações) |

### OpenRouter

| Item | Detalhe |
|------|---------|
| Propósito | Gateway de IA para análise de conversas, insights e relatório |
| Modelo padrão | `openai/gpt-4o` (configurável por empresa) |
| Compatibilidade | API compatível com OpenAI SDK |

### Upstash QStash

| Item | Detalhe |
|------|---------|
| Propósito | Agendamento preciso de publicações no Social Publisher |
| Delay máximo | 90 dias |
| Retry | 3 tentativas automáticas |
| Segurança | Assinatura verificada via `verifySignatureAppRouter` |
| Escopo | Exclusivo para Social Publisher |

### Upload-Post API

| Item | Detalhe |
|------|---------|
| Propósito | Publicação em Instagram, LinkedIn e TikTok |
| Autenticação | API Key por empresa |

---

## 8. Modelo de Dados

### Diagrama de entidades

```
companies
  ├── users (via memberships)
  ├── integrations
  ├── conversations
  │     ├── messages
  │     └── conversation_insights
  ├── competitor_profiles
  │     └── collected_posts (source_type='competitor')
  ├── collected_posts (source_type='radar')
  ├── intelligence_insights
  ├── media_files
  ├── scheduled_posts
  └── async_jobs
```

### Tabelas por módulo

#### Core / Auth

| Tabela | Descrição |
|--------|-----------|
| `companies` | Empresas (tenants) com nicho e configurações |
| `users` | Perfis espelhando `auth.users` |
| `memberships` | Vínculo usuário ↔ empresa com papel |
| `integrations` | Credenciais criptografadas por empresa e tipo |

#### WhatsApp Intelligence

| Tabela | Descrição |
|--------|-----------|
| `conversations` | Conversas sincronizadas do Sofia CRM |
| `messages` | Mensagens individuais de cada conversa |
| `conversation_insights` | Sentimento, intenção, resumo e ações sugeridas |

#### Intelligence

| Tabela | Descrição |
|--------|-----------|
| `competitor_profiles` | Perfis de concorrentes (máx. 3/empresa) |
| `collected_posts` | Posts de concorrentes e do radar |
| `intelligence_insights` | Insights de IA para concorrentes e radar |

#### Social Publisher

| Tabela | Descrição |
|--------|-----------|
| `media_files` | Arquivos no Supabase Storage |
| `scheduled_posts` | Posts com tipo, status, progress e qstash_message_id |

#### Jobs

| Tabela | Descrição |
|--------|-----------|
| `async_jobs` | Fila de jobs com tipo, payload, status e retry |

### Row Level Security

Todas as tabelas possuem RLS ativa. Política padrão:

```sql
CREATE POLICY "company_isolation" ON <tabela>
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );
```

---

## 9. Design System

### Paleta de cores

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#FA5E24` | Botões principais, links, destaques |
| `primary-hover` | `#FF824D` | Hover de elementos primários |
| `background` | `#F8FAFC` | Fundo da aplicação |
| `card` | `#FFFFFF` | Fundo de cards e modais |
| `text` | `#1E293B` | Texto principal |
| `muted` | `#64748B` | Texto secundário, placeholders |
| `border` | `#E2E8F0` | Bordas e divisores |
| `success` | `#22C55E` | Status positivo, publicado |
| `warning` | `#F59E0B` | Alertas, status parcial |
| `danger` | `#EF4444` | Erros, sentimento negativo |

### Tipografia

- **Fonte:** Inter (Google Fonts)
- **Escala:** 12px · 14px · 16px · 20px · 24px · 32px

### Componentes base

| Componente | Variantes |
|-----------|-----------|
| `Button` | primary, secondary, ghost, destructive |
| `Card` | default, hover |
| `Badge` | success, warning, danger, neutral |
| `Input` | default, error, disabled |
| `Skeleton` | loading states |
| `EmptyState` | telas sem dados |

### Layout

- Sidebar fixa no desktop, drawer em mobile
- Topbar com nome do módulo ativo e avatar
- `PageContainer` com padding consistente e max-width

---

## 10. Segurança e Privacidade

- Sessão gerenciada pelo Supabase Auth (JWT com refresh token)
- Middleware global bloqueia rotas protegidas
- `company_id` validado no servidor antes de qualquer operação
- RLS ativa em 100% das tabelas — banco rejeita queries cross-tenant mesmo em falha de código
- Credenciais salvas com `pgcrypto.encrypt()`, nunca retornam em texto puro
- Assinatura QStash verificada em todo request recebido em `/api/social/publish`
- Headers de segurança no `next.config.js`: CSP, X-Frame-Options, X-Content-Type-Options

---

## 11. Infraestrutura e Jobs Assíncronos

### Sistema async_jobs

Para sync, IA e relatório — operações que não precisam de horário exato ao segundo.

```
enqueueJob(type, payload, companyId)
        │
        ▼
  async_jobs (status: 'pending')
        │
        ▼ (Vercel Cron a cada 1 min)
POST /api/jobs/process
  ├─ Busca próximo job pendente (lock otimista)
  ├─ Marca como 'running'
  ├─ Dispatch para worker correto
  └─ Marca como 'done' ou reagenda se 'failed'
```

### Tipos de job e frequência

| Tipo | Worker | Frequência |
|------|--------|------------|
| `sofia_crm_sync` | sofia-crm-worker | A cada 15 min |
| `whatsapp_analyze` | whatsapp-worker | Após cada sync |
| `competitor_scrape` | competitor-worker | 1x/dia ou manual |
| `radar_collect` | radar-worker | 1x/dia |
| `weekly_report` | report-worker | Toda segunda-feira às 08:00 |

### Upstash QStash

Usado exclusivamente para o Social Publisher — onde o horário exato de publicação é crítico. Delay de até 90 dias, retry automático de 3 tentativas, cancelamento via API.

---

## 12. Roadmap de Desenvolvimento

### Fase 1 — Fundação (Tasks 1–2)

| Task | Entrega | Critério de aceite |
|------|---------|-------------------|
| 1 | Layout, design system, navegação | `npm run dev` sem erros; sidebar funcional; responsivo |
| 2 | Auth + RLS + multi-tenancy | Login, logout, isolamento entre empresas validado |

### Fase 2 — Setup do Tenant (Task 3)

| Task | Entrega | Critério de aceite |
|------|---------|-------------------|
| 3 | Onboarding + Settings + Integrações | Novo usuário cria empresa, configura integrações, testa conexão |

### Fase 3 — Core de Inteligência (Tasks 4–5)

| Task | Entrega | Critério de aceite |
|------|---------|-------------------|
| 4 | WhatsApp Intelligence + Sofia CRM | Sync funciona; IA retorna insights; ações automáticas no CRM |
| 5 | Intelligence (Concorrentes + Radar) | Coleta + score + insights; botão "Criar conteúdo" funcional |

### Fase 4 — Publicação e Entrega (Tasks 6–7)

| Task | Entrega | Critério de aceite |
|------|---------|-------------------|
| 6 | Social Publisher | Foto/vídeo/carrossel; QStash agenda; progresso em tempo real |
| 7 | Relatório semanal + async_jobs | Mensagem entregue no WhatsApp; jobs com retry; disparo manual funcional |

---

## 13. Fora de Escopo (MVP)

Itens explicitamente excluídos para garantir foco e velocidade:

- **Billing / pagamentos:** aba de plano é placeholder. Stripe fica para v2.
- **Gerenciamento de membros da equipe:** convidar, remover e alterar papéis ficam para v2. No MVP, o onboarding cria apenas o owner.
- **Performance Reports como módulo web:** substituído pelo relatório semanal via WhatsApp, que é mais acionável para o gestor.
- **PDF de relatório:** o relatório do MVP é em texto simples para WhatsApp. PDF fica para v2.
- **Publicação no Facebook e Twitter/X:** apenas Instagram, LinkedIn e TikTok via Upload-Post API.
- **App mobile nativo:** web-first, responsivo via browser.
- **API pública do AXIOMIX:** sem endpoints públicos para terceiros.
- **Notificações por email ou push:** alertas ficam no Dashboard e no WhatsApp.
- **Chatbot / automação de respostas:** o AXIOMIX analisa, mas não responde automaticamente.
- **Análise de grupos de WhatsApp:** apenas conversas individuais no MVP.

---

## 14. Glossário

| Termo | Definição |
|-------|-----------|
| **Tenant** | Uma empresa cadastrada no AXIOMIX. Cada tenant é completamente isolado dos demais. |
| **company_id** | Identificador único de um tenant. Presente em todas as tabelas como chave de isolamento. |
| **RLS** | Row Level Security — recurso do PostgreSQL que garante isolamento no nível do banco, independente do código. |
| **Worker** | Processo background que executa operações assíncronas (sync, IA, relatório). |
| **async_jobs** | Tabela do banco usada como fila de jobs para workers internos. |
| **QStash** | Serviço da Upstash para mensagens com delay preciso. Usado para agendamento de posts. |
| **Engagement Score** | Métrica calculada para posts: `likes + (comments × 2) + (shares × 3)`. |
| **Sofia CRM** | CRM de WhatsApp usado pelos clientes como fonte de conversas. |
| **Evolution API** | API de WhatsApp usada para enviar o relatório semanal ao gestor. |
| **OpenRouter** | Gateway de IA compatível com OpenAI SDK. Permite trocar de modelo sem mudar código. |
| **Insight** | Resultado da análise de IA sobre uma conversa: sentimento, intenção, resumo e ações. |
| **Carrossel** | Post com múltiplas imagens (mín. 2, máx. 10). |
| **Magic Link** | Login sem senha via link enviado por email. |
| **Upsert** | Operação que insere se não existir, ou atualiza se já existir. |
| **Relatório semanal** | Resumo executivo gerado por IA e enviado toda segunda-feira pelo WhatsApp ao gestor. |

---

*Documento vivo — atualizado a cada ciclo de desenvolvimento.*
*AXIOMIX MVP v2.0 — Março 2026*
