# Análise e Melhorias: WhatsApp Intelligence

**Data:** 2026-03-12
**Autor:** Claude (Axiomix)

## 📊 Estado Atual

### ✅ Pontos Fortes

1. **Design consistente** - Segue o design system do Axiomix (cores, espaçamento, tipografia)
2. **Funcionalidades implementadas:**
   - Sincronização automática (15 min) e manual
   - Análise com IA (individual e bulk)
   - Filtros robustos (sentimento, intenção, status, período, busca)
   - Seleção múltipla para análise em lote
   - Badge de alertas no sidebar
   - Métricas agregadas (últimos 7 dias)
3. **Acessibilidade** - Ícones com significado claro, cores semânticas
4. **Performance** - Filtros client-side, paginação limitada (100 conversas)

### ⚠️ Áreas de Melhoria

#### 1. **Visualização de Dados**
- Cards de métricas muito básicos (apenas números)
- Falta contexto temporal (tendências, comparações)
- Sentimento poderia ter visualização mais rica (como o dashboard usa barras)
- Sem gráficos para análise temporal ou distribuição

#### 2. **Design e Layout**
- Lista de conversas sem hierarquia visual clara
- Filtros expandidos ocupam muito espaço
- Cards de métricas não aproveitam o "storytelling" dos dados
- Falta densidade de informação nos cards

#### 3. **UX e Interatividade**
- Sem indicador de "tempo decorrido" visual
- Análise bulk não mostra progresso
- Falta ações rápidas (marcar como resolvido, adicionar nota, etc.)
- Sem exportação de dados filtrados

#### 4. **Funcionalidades**
- Não usa as ações do Sofia CRM (criar card kanban, adicionar label)
- Sem atribuição de responsável por conversa
- Sem SLA tracking ou priorização automática
- Sem histórico de ações tomadas

---

## 🎨 Melhorias de Design e Layout

### 1. **Cards de Métricas - Adicionar Sparklines**

Transformar os cards numéricos em mini-dashboards com:
- **Sparkline** mostrando tendência dos últimos 7 dias
- **Comparação** com período anterior (+12%, -5%, etc.)
- **Mini barra de progresso** para sentimento

**Exemplo:**
```
┌─────────────────────────────┐
│ Conversas analisadas    ↗️  │
│ 47         +23%             │
│ ▃▅▂▇▃▆█  Últimos 7 dias    │
└─────────────────────────────┘
```

### 2. **Card de Sentimento - Usar Barras Horizontais**

Similar ao componente `SentimentOverview` do dashboard:
```
Positivo  ████████████░░  75%  (35)
Neutro    ████░░░░░░░░░░  20%  (10)
Negativo  █░░░░░░░░░░░░░   5%  ( 2)
```

### 3. **Lista de Conversas - Densidade e Hierarquia**

- **Avatar/Foto** do contato (placeholder colorido com inicial)
- **Hierarquia clara:** Nome em bold, telefone menor, última msg em muted
- **Timeline visual** para conversas negativas antigas (barra lateral vermelha)
- **Status badge** mais proeminente
- **Quick actions** ao hover (resolver, atribuir, adicionar nota)

### 4. **Filtros - Modo Compacto**

- Filtros em **uma linha horizontal** (chips)
- Busca integrada no header
- Filtro avançado em modal/drawer (apenas quando necessário)

---

## 📈 Gráficos: Viabilidade e Implementação

### ✅ **SIM, gráficos são MUITO plausíveis!**

O Axiomix já tem:
- TailwindCSS para estilização
- React 18 para componentes
- Design system bem definido
- Dados estruturados no Supabase

### 📚 Biblioteca Recomendada: **Recharts**

**Por quê?**
- ✅ Popular (24k+ stars no GitHub)
- ✅ Sintaxe declarativa (fácil de usar)
- ✅ Responsiva por padrão
- ✅ Customizável com Tailwind
- ✅ Leve (~450KB minified)
- ✅ Mantida ativamente
- ✅ TypeScript nativo

**Alternativa:** Tremor (usa Recharts + componentes prontos para dashboards)

### 📊 Gráficos Propostos

#### 1. **Gráfico de Linha: Sentimento ao Longo do Tempo**
```typescript
// Mostra evolução de sentimentos nos últimos 30 dias
// 3 linhas: Positivo (verde), Neutro (amarelo), Negativo (vermelho)
// Permite identificar padrões e tendências
```

**Posicionamento:** Seção expandível abaixo das métricas

#### 2. **Gráfico de Rosca (Donut): Distribuição de Intenções**
```typescript
// Mostra % de cada intenção (compra, suporte, reclamação, etc.)
// Cores distintas para cada categoria
// Clique para filtrar lista
```

**Posicionamento:** Card lado a lado com sentimento

#### 3. **Gráfico de Barras: Volume de Mensagens por Dia**
```typescript
// Últimos 14 dias
// Barras empilhadas: inbound vs outbound
// Identifica picos de demanda
```

**Posicionamento:** Abaixo dos donut charts

#### 4. **Sparklines nos Cards de Métricas**
```typescript
// Mini gráfico de linha inline
// Mostra tendência dos últimos 7 dias
// Leve e não invasivo
```

**Posicionamento:** Dentro de cada card de métrica

#### 5. **Heatmap: Horários de Maior Volume** (Fase 2)
```typescript
// Mostra padrões de horário (dia da semana x hora)
// Ajuda a planejar equipe de atendimento
```

---

## 🚀 Melhorias Funcionais

### 1. **Ações Rápidas nas Conversas**

Adicionar botões de ação inline:
- ✅ Marcar como resolvida
- 📝 Adicionar nota privada
- 👤 Atribuir responsável
- 🏷️ Adicionar tag
- 📋 Criar card no Sofia CRM Kanban
- 🔗 Copiar link da conversa

### 2. **Exportação de Dados**

Botão para exportar conversas filtradas:
- CSV (para análise em Excel/Sheets)
- JSON (para integração)
- PDF (relatório executivo)

### 3. **Atribuição e Workflow**

- Campo `assigned_to` na tabela conversations
- Filtro "Minhas conversas"
- Notificações quando atribuído
- Status workflow: `open → in_progress → resolved → closed`

### 4. **SLA Tracking**

- Definir SLA por tipo de sentimento/intenção
- Alertas visuais quando próximo do vencimento
- Métricas de tempo médio de resposta

### 5. **Integração Sofia CRM**

Usar as funções já disponíveis no client:
```typescript
// Já implementado em client.ts:
- createKanbanCard() // Criar card no quadro
- addContactLabel() // Adicionar etiqueta ao contato
```

Adicionar UI para:
- Botão "Criar card no Kanban" (selecionar board)
- Botão "Adicionar label" (input de texto)

### 6. **Notas e Histórico**

Nova tabela `conversation_notes`:
```sql
- id (uuid)
- conversation_id (fk)
- company_id (fk)
- user_id (fk)
- content (text)
- created_at (timestamp)
```

Exibir timeline de ações na página de detalhes.

---

## 🎯 Plano de Implementação

### **Fase 1: Gráficos Básicos** (2-3 horas)

1. Instalar Recharts
2. Criar componente `SentimentTrendChart` (linha)
3. Criar componente `IntentDistributionChart` (donut)
4. Adicionar sparklines nos cards de métricas
5. Criar seção "Análise Visual" na página

**Arquivos afetados:**
- `package.json` (adicionar recharts)
- `src/components/whatsapp/sentiment-trend-chart.tsx` (NOVO)
- `src/components/whatsapp/intent-distribution-chart.tsx` (NOVO)
- `src/components/whatsapp/metric-card-with-sparkline.tsx` (NOVO)
- `src/app/(app)/whatsapp-intelligence/page.tsx` (modificar)

### **Fase 2: Melhorias de UX** (2-3 horas)

1. Refatorar layout dos filtros (horizontal chips)
2. Adicionar quick actions nas conversas
3. Melhorar densidade visual da lista
4. Adicionar avatares/iniciais coloridas

**Arquivos afetados:**
- `src/components/whatsapp/conversation-filters.tsx` (refatorar)
- `src/components/whatsapp/conversations-list.tsx` (melhorar)
- `src/components/whatsapp/conversation-quick-actions.tsx` (NOVO)
- `src/components/whatsapp/contact-avatar.tsx` (NOVO)

### **Fase 3: Funcionalidades Avançadas** (4-6 horas)

1. Implementar sistema de notas
2. Adicionar exportação CSV/PDF
3. Integrar ações do Sofia CRM (kanban, labels)
4. Adicionar atribuição de responsável

**Arquivos afetados:**
- `database/migrations/007_conversation_notes.sql` (NOVO)
- `src/app/api/whatsapp/notes/route.ts` (NOVO)
- `src/app/api/whatsapp/export/route.ts` (NOVO)
- `src/app/api/whatsapp/assign/route.ts` (NOVO)
- `src/app/api/whatsapp/kanban/route.ts` (NOVO)
- `src/components/whatsapp/add-note-dialog.tsx` (NOVO)
- `src/components/whatsapp/export-button.tsx` (NOVO)
- `src/components/whatsapp/assign-dialog.tsx` (NOVO)
- `src/components/whatsapp/create-kanban-card-dialog.tsx` (NOVO)

### **Fase 4: Analytics Avançados** (3-4 horas)

1. Gráfico de volume por dia da semana
2. Heatmap de horários
3. Métricas de SLA
4. Dashboard comparativo (mês atual vs anterior)

---

## 💡 Mockup Conceitual: Nova Home do WhatsApp Intelligence

```
┌─────────────────────────────────────────────────────────────┐
│ WhatsApp Intelligence                    [Exportar] [Sync]  │
│ Converse menos com planilhas...                             │
├─────────────────────────────────────────────────────────────┤
│ MÉTRICAS (4 cards com sparklines)                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │    47    │ │    12    │ │ Compra   │ │     3    │       │
│ │ Analisad.│ │ Oportun. │ │ Top Int. │ │ Críticas │       │
│ │ ▃▅▂▇▃▆█ │ │ ▂▃▅▇▅▃▂ │ │ 25%      │ │ !Atenção │       │
│ │ +23%  ↗ │ │ +50%  ↗ │ │ 12 conv. │ │ <24h     │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│ ANÁLISE VISUAL                                              │
│ ┌────────────────────────┐ ┌────────────────────────┐      │
│ │ Sentimento (30 dias)   │ │ Distribuição Intenções │      │
│ │ ═══════════════════    │ │      ◐◑◐◑◐            │      │
│ │   Positivo ──────      │ │   Compra    35%        │      │
│ │   Neutro   ─ ─ ─      │ │   Suporte   28%        │      │
│ │   Negativo ·····       │ │   Dúvida    22%        │      │
│ └────────────────────────┘ │   Outros    15%        │      │
│                            └────────────────────────┘      │
├─────────────────────────────────────────────────────────────┤
│ FILTROS                                                     │
│ [🔍 Buscar...] [😊Positivo] [😐Neutro] [😢Negativo]       │
│ [🛒Compra] [📞Suporte] [⚠️Reclamação] [7 dias▾]           │
├─────────────────────────────────────────────────────────────┤
│ CONVERSAS (47 filtradas de 100)        [Selecionar] [...]  │
│                                                             │
│ ┌─ 🟢 João Silva ──────────────────────────── há 2h ──────┐│
│ │  (11) 98765-4321                                         ││
│ │  😊 Positivo  🛒 Compra  ✓ Resolvida                    ││
│ │  [📝] [👤] [📋] [🔗]                                    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ 🔴 Maria Santos ───────────────────── há 18h ──────────┐│
│ │  (11) 91234-5678                         ⚠️ URGENTE      ││
│ │  😢 Negativo  ⚠️ Reclamação  ⏰ Aberta                  ││
│ │  [📝] [👤] [📋] [🔗]                                    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Recomendação Final

**Sim, gráficos são ESSENCIAIS e VIÁVEIS!**

### Implementação Sugerida:

1. **AGORA (Prioridade Alta):**
   - Instalar Recharts
   - Adicionar gráfico de linha de sentimento
   - Adicionar gráfico de donut de intenções
   - Adicionar sparklines nos cards

2. **PRÓXIMO (Prioridade Média):**
   - Refatorar filtros para chips horizontais
   - Adicionar quick actions
   - Melhorar densidade da lista

3. **FUTURO (Prioridade Baixa):**
   - Sistema de notas
   - Exportação
   - SLA tracking
   - Heatmaps

### Design está coeso?

**Sim, mas pode melhorar:**
- ✅ Cores semânticas bem definidas
- ✅ Componentes reutilizáveis (Card, Button)
- ✅ Tipografia consistente
- ⚠️ Falta densidade de informação
- ⚠️ Falta storytelling visual (gráficos)
- ⚠️ Hierarquia visual pode ser mais clara

**Com os gráficos e melhorias de UX, o WhatsApp Intelligence se tornará o módulo mais completo e visual do Axiomix!**
