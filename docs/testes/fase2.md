# Checklist de Testes - Fase 2: Automação

## ✅ Implementações Concluídas

### Task #5: Worker de Sync Automático
- [x] Migration adicionada para novos tipos de job (sofia_crm_sync, whatsapp_analyze)
- [x] Endpoint de cron criado (`/api/cron/whatsapp-sync`)
- [x] Configuração do Vercel cron (a cada 15 minutos)
- [x] Worker que busca empresas ativas com Sofia CRM configurado
- [x] Enfileiramento automático de jobs de sync
- [x] Prevenção de duplicação de jobs
- [x] Hook automático para enfileirar análises após sync bem-sucedido
- [x] Serviço `auto-analyze.ts` que identifica conversas sem insight
- [x] Limitação de 10 análises por execução para evitar sobrecarga

**Arquivos criados/modificados:**
- `database/migrations/006_whatsapp_jobs.sql`
- `src/app/api/cron/whatsapp-sync/route.ts`
- `src/services/whatsapp/auto-analyze.ts`
- `src/lib/jobs/processor.ts` (modificado)
- `vercel.json` (cron adicionado)

### Task #6: Análise em Lote
- [x] API endpoint para análise em lote (`/api/whatsapp/bulk-analyze`)
- [x] Componente de botão `BulkAnalyzeButton`
- [x] Integração com o serviço de auto-análise
- [x] Feedback visual durante enfileiramento
- [x] Refresh automático após 2 segundos
- [x] Limitação de 10 análises por vez (mesma do auto-analyze)
- [x] Mensagem informativa quando todas já estão analisadas

**Arquivos criados/modificados:**
- `src/app/api/whatsapp/bulk-analyze/route.ts`
- `src/components/whatsapp/bulk-analyze-button.tsx`
- `src/app/(app)/whatsapp-intelligence/page.tsx` (botão adicionado)

### Task #7: Sistema de Alertas
- [x] Badge de contagem de alertas na sidebar (item WhatsApp Intelligence)
- [x] API endpoint para contagem de críticos (`/api/whatsapp/critical-count`)
- [x] Atualização automática a cada 2 minutos
- [x] Badge responsivo (número quando expandido, ponto quando colapsado)
- [x] Dashboard já tinha sistema de alertas implementado
- [x] Card de alertas mostra conversas negativas sem resposta
- [x] Link direto para WhatsApp Intelligence

**Arquivos criados/modificados:**
- `src/app/api/whatsapp/critical-count/route.ts`
- `src/components/whatsapp/critical-alerts-badge.tsx`
- `src/components/layout/sidebar.tsx` (badge adicionado)

---

## 🧪 Testes a Realizar

### 1. Worker de Sync Automático

#### Verificar Cron Job
- [ ] Endpoint `/api/cron/whatsapp-sync` responde apenas para requisições com header correto
- [ ] Rejeita requisições sem autenticação de cron (`x-vercel-cron` ou `x-cron-secret`)
- [ ] Retorna 401 para requisições não autorizadas

#### Teste Manual do Cron
```bash
# Simular chamada do cron (adicione CRON_SECRET no .env.local se necessário)
curl -X GET http://localhost:3000/api/cron/whatsapp-sync \
  -H "x-cron-secret: YOUR_SECRET"
```

**Verificações:**
- [ ] Retorna JSON com `enqueued` contendo número de jobs criados
- [ ] Apenas empresas ativas com Sofia CRM configurado são processadas
- [ ] Não cria jobs duplicados se já houver um pendente/running

#### Verificar Enfileiramento
- [ ] Acessar tabela `async_jobs` no banco
- [ ] Verificar se jobs do tipo `sofia_crm_sync` foram criados
- [ ] Status inicial deve ser `pending`
- [ ] Campo `company_id` deve estar preenchido

#### Verificar Processamento
- [ ] Jobs são processados pelo endpoint `/api/jobs/process`
- [ ] Status muda para `running` e depois `done`
- [ ] Após sync bem-sucedido, jobs `whatsapp_analyze` são criados automaticamente
- [ ] Resultado contém `autoAnalyze` com contagem de análises enfileiradas

#### Teste de Auto-Análise
- [ ] Após sync, verificar se jobs `whatsapp_analyze` foram criados
- [ ] Máximo de 10 análises enfileiradas por sync
- [ ] Apenas conversas sem insight são analisadas
- [ ] Conversas mais recentes têm prioridade

### 2. Análise em Lote

#### Botão na Interface
- [ ] Botão "Analisar todas pendentes" aparece na página WhatsApp Intelligence
- [ ] Localizado ao lado do botão "Sincronizar com Sofia CRM"
- [ ] Tem ícone de Sparkles

#### Funcionalidade
- [ ] Clicar no botão dispara requisição para `/api/whatsapp/bulk-analyze`
- [ ] Durante processamento, botão mostra "Enfileirando..." com ícone pulsando
- [ ] Botão fica desabilitado enquanto processa
- [ ] Após sucesso, mostra mensagem verde: "X análise(s) enfileirada(s)"
- [ ] Se todas já analisadas, mostra: "Todas as conversas já foram analisadas"
- [ ] Após 2 segundos, página faz refresh automaticamente

#### Edge Cases
- [ ] Se não houver conversas, mensagem adequada é exibida
- [ ] Se API falhar, erro é mostrado em vermelho
- [ ] Múltiplos cliques não criam jobs duplicados

#### Verificar Jobs Criados
- [ ] Tabela `async_jobs` contém jobs do tipo `whatsapp_analyze`
- [ ] Payload tem campo `conversationId`
- [ ] Jobs são processados pelo worker
- [ ] Insights são salvos na tabela `conversation_insights`

### 3. Sistema de Alertas

#### Badge na Sidebar
- [ ] Badge aparece no item "WhatsApp Intelligence"
- [ ] Mostra número de conversas negativas das últimas 24h
- [ ] Quando sidebar expandida: badge com número (ex: "3")
- [ ] Quando sidebar colapsada: ponto vermelho pequeno
- [ ] Se contagem for 0, badge não aparece
- [ ] Se contagem > 99, mostra "99+"
- [ ] Badge atualiza automaticamente a cada 2 minutos
- [ ] Quando rota muda, faz re-fetch imediatamente

#### API de Contagem
```bash
# Testar endpoint manualmente
curl -X POST http://localhost:3000/api/whatsapp/critical-count \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{"companyId": "UUID_DA_EMPRESA"}'
```

**Verificações:**
- [ ] Retorna JSON com campo `count`
- [ ] Conta apenas insights com `sentiment = 'negativo'`
- [ ] Filtra por `generated_at >= 24h atrás`
- [ ] Respeita `company_id` do usuário autenticado

#### Alertas no Dashboard
- [ ] Dashboard mostra card de alertas quando há conversas críticas
- [ ] Card tem variante "danger" (vermelho)
- [ ] Título: "X conversas negativas sem resposta"
- [ ] Descrição mostra última conversa e tempo relativo
- [ ] Botão "Ver todas" redireciona para `/whatsapp-intelligence`
- [ ] Se não houver alertas, card não aparece

### 4. Integração entre Componentes

#### Fluxo Completo de Sync + Análise
1. [ ] Cron job dispara a cada 15 minutos
2. [ ] Job de sync é enfileirado
3. [ ] Worker processa sync e sincroniza conversas
4. [ ] Após sync, auto-análise enfileira análises pendentes
5. [ ] Worker processa análises e gera insights
6. [ ] Badge na sidebar é atualizado
7. [ ] Dashboard mostra alertas se houver conversas negativas

#### Fluxo de Análise Manual em Lote
1. [ ] Usuário clica em "Analisar todas pendentes"
2. [ ] API enfileira até 10 análises
3. [ ] Worker processa análises em background
4. [ ] Após 2 segundos, página faz refresh
5. [ ] Novas análises aparecem nas conversas
6. [ ] Badge e dashboard são atualizados

### 5. Performance e Escalabilidade

- [ ] Cron não sobrecarrega banco (limite de queries)
- [ ] Auto-análise respeita limite de 10 por vez
- [ ] Jobs com retry funcionam corretamente (max 3 tentativas)
- [ ] Não há race conditions em jobs paralelos
- [ ] Sidebar não faz requests excessivos (cache de 2min funciona)

### 6. Erros e Edge Cases

#### Sem Integração Configurada
- [ ] Cron não enfileira jobs para empresas sem Sofia CRM
- [ ] Análise em lote retorna erro adequado
- [ ] Mensagens de erro são claras e acionáveis

#### API Indisponível
- [ ] Sofia CRM offline: job falha e entra em retry
- [ ] OpenRouter offline: análise falha e entra em retry
- [ ] Após 3 falhas, job vai para status `failed`
- [ ] Erro é registrado no campo `error_message`

#### Dados Inconsistentes
- [ ] Conversas sem mensagens não quebram análise
- [ ] Mensagens sem conteúdo são tratadas graciosamente
- [ ] Payload JSON inválido não quebra worker

---

## 📊 Métricas de Sucesso

### Automação Funcionando
- [ ] Cron executa a cada 15 minutos sem erros
- [ ] Jobs são processados automaticamente
- [ ] Taxa de sucesso de sync > 95%
- [ ] Taxa de sucesso de análise > 90%

### Usabilidade
- [ ] Badge de alerta é visível e informativo
- [ ] Análise em lote é rápida (< 2s para enfileirar)
- [ ] Feedback visual é claro em todas as operações

### Confiabilidade
- [ ] Sem duplicação de jobs
- [ ] Retry funciona para falhas temporárias
- [ ] Erros são logados e recuperáveis

---

## 🐛 Bugs Conhecidos
_Nenhum identificado ainda. Adicionar aqui se encontrado durante os testes._

---

## 📝 Notas de Implementação

### Decisões de Design

1. **Limite de 10 análises por vez**: Evita sobrecarregar a API de IA e garante processamento rápido.

2. **Atualização de badge a cada 2 minutos**: Balance entre atualização em tempo real e carga no servidor.

3. **Auto-análise após sync**: Garante que conversas novas sejam analisadas automaticamente sem intervenção manual.

4. **Cron a cada 15 minutos**: Conforme especificação do PRD, mantém dados atualizados sem sobrecarga.

5. **Prevenção de duplicação**: Verifica jobs pendentes/running antes de criar novos, evitando desperdício de recursos.

### Arquivos Criados (Fase 2)

**Backend:**
- `database/migrations/006_whatsapp_jobs.sql`
- `src/app/api/cron/whatsapp-sync/route.ts`
- `src/app/api/whatsapp/bulk-analyze/route.ts`
- `src/app/api/whatsapp/critical-count/route.ts`
- `src/services/whatsapp/auto-analyze.ts`

**Frontend:**
- `src/components/whatsapp/bulk-analyze-button.tsx`
- `src/components/whatsapp/critical-alerts-badge.tsx`

**Configuração:**
- `vercel.json` (cron adicionado)

**Modificados:**
- `src/lib/jobs/processor.ts`
- `src/components/layout/sidebar.tsx`
- `src/app/(app)/whatsapp-intelligence/page.tsx`

---

## ✅ Resultado Esperado

Após os testes, o sistema deve:
- Sincronizar conversas automaticamente a cada 15 minutos
- Analisar conversas novas automaticamente após cada sync
- Permitir análise em lote manual de conversas pendentes
- Mostrar badge de alertas na sidebar com contagem atualizada
- Exibir alertas críticos no dashboard
- Processar jobs em background de forma confiável
- Ter retry automático para falhas temporárias
- Fornecer feedback claro ao usuário em todas as operações
