# F3 — Spike de verificação da API real do Evo CRM

> Status: **pendente de execução contra a stack real** (2026-07-27).
> As mudanças da F3 revisada (fim do LLM automático) **não dependem** deste
> spike — ele bloqueia apenas a fase D (delegação da sugestão de resposta).
> Enquanto o spike não confirmar um endpoint de execução de agente, a decisão
> vigente é: **`response-suggester.ts` permanece local (OpenRouter, sob
> demanda)** e o gap fica registrado aqui.

## Por que este spike existe

O plano original da F3 assumia endpoints `/ai/suggest`, `/ai/summarize`,
`/ai/sentiment` no Evo CRM (citados no header de
`src/services/whatsapp/analyzer.ts`). **Nenhum deles foi validado** — a
superfície verificada em 2026-04-29/05-04 (ver memória de integração e
`src/services/evo-crm/client.ts`) não tem nenhum endpoint de IA analítica.
O que é comprovado: agentes conversacionais (CRUD via Core Service + JWT,
atribuíveis a inboxes). O que não é: execução de agente sob demanda com
retorno estruturado.

## O que verificar (read-only)

Token do CRM Service em `.env.local` (`EVO_CRM_API_TOKEN`); header
`api_access_token:` (não Bearer). Para o Core Service é preciso JWT — login
programático com `EVO_AUTH_EMAIL`/`EVO_AUTH_PASSWORD` (existem só no VPS).

1. **Eventos de webhook disponíveis** — existe algum evento de IA/insight?
   ```bash
   curl -s -H "api_access_token: $EVO_CRM_API_TOKEN" \
     https://api.getlead.capital/api/v1/webhooks | jq '.[].subscriptions'
   ```
2. **Endpoint de execução de agente no Core Service** (JWT):
   ```bash
   # obter JWT
   curl -s -X POST https://api.getlead.capital/api/v1/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"$EVO_AUTH_EMAIL","password":"$EVO_AUTH_PASSWORD"}'
   # probes (esperado: 404 se não existe; 401/405 sugere que a rota existe)
   curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $JWT" \
     https://api.getlead.capital/api/v1/agents/<agentId>/execute
   curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $JWT" \
     https://api.getlead.capital/api/v1/agents/<agentId>/chat
   ```
3. **Formato do sender de mensagem de agente no webhook** — enviar mensagem
   numa conversa atendida por agente Evo e inspecionar o payload de
   `message_created` (validar as heurísticas de `extractMessageAgentId` no
   webhook, que hoje cobrem "formatos prováveis" não confirmados).
4. **Recursos de summary/sentiment não mapeados** no CRM Service:
   ```bash
   for p in ai/sentiment ai/summarize ai/suggest conversations/<id>/summary; do
     curl -s -o /dev/null -w "$p → %{http_code}\n" \
       -H "api_access_token: $EVO_CRM_API_TOKEN" \
       "https://api.getlead.capital/api/v1/$p"
   done
   ```

## Matriz de decisão (fase D)

| Resultado do spike | Ação |
|---|---|
| Endpoint de execução de agente existe e retorna texto | Criar `src/services/evo-crm/ai-assist.ts` (via `fetchWithJwtRefresh`); `generateResponseSuggestion` tenta Evo primeiro quando `aiMode === "evo_delegated"`, fallback OpenRouter |
| Existe evento de webhook de insight de IA | Avaliar popular `conversation_insights` com `insight_source: "evo_agent"` a partir do webhook |
| Nada existe (cenário atual assumido) | **Já aplicado**: suggester/analyzer locais sob demanda; custo recorrente eliminado via heartbeat/scheduler; reavaliar a cada release do Evo |

## O que a F3 revisada já entregou sem o spike (jul/2026)

- Heartbeat não enfileira mais análises automáticas; pós-sync idem
  (`processor.ts`); cron `whatsapp-batch` removido do scheduler; rota
  `api/cron/whatsapp-analyze` deletada.
- `conversation_insights.insight_source` rastreia a origem de cada insight
  (janela de validação antes das deleções da fase F).
- Flag `aiMode` na config evo_crm (`local` default | `evo_delegated`) +
  helper `getWhatsappAiMode`.
- Sync rebaixado a safety-net horário com detecção de drift via
  `conversations.last_synced_at`.

## Fase F (deleções) — checklist antes de apagar

Após ~2 semanas monitorando `insight_source` e o consumo OpenRouter:
- [ ] `src/services/whatsapp/auto-analyze.ts` ainda é usado só pelo
      bulk-analyze? Se sim, renomear (`enqueuePendingAnalyses`) em vez de apagar.
- [ ] `batch-analyzer.ts` + `src/lib/cron/whatsapp-batch.ts` +
      `api/cron/whatsapp-batch/` + `src/lib/ai/prompts/whatsapp-batch.ts` — apagar.
- [ ] `conversation_digests` deixa de ser alimentada — confirmar que
      `src/services/group-agent/context-builder.ts` tolera staleness.
