-- =============================================================================
-- Migration: preview denormalizado da última mensagem em conversations
-- Date: 2026-07-27
-- Author: AXIOMIX
-- Purpose:
--   A linha 2 da lista de conversas mostrava texto derivado (telefone/data)
--   porque buscar a última mensagem por conversa seria N+1 na listagem.
--   Colunas denormalizadas escritas pelos próprios escritores de `messages`
--   (webhook evo-crm, send-message, syncMessages) com custo marginal zero —
--   o webhook já faz um update na conversa a cada mensagem.
--   Também destrava a fila do modo Ao vivo sem o cap de 500 mensagens
--   (live-operation passa a ler direto das colunas da conversa).
-- =============================================================================

alter table public.conversations
  add column if not exists last_message_preview text,
  add column if not exists last_message_direction text,
  add column if not exists last_message_type text;

-- Backfill one-shot a partir da mensagem mais recente de cada conversa.
-- O preview aqui é o conteúdo cru truncado (o strip de HTML/rótulos de mídia
-- acontece na aplicação daqui em diante); linhas sem mensagem ficam null e a
-- UI usa o fallback derivado.
with latest as (
  select distinct on (m.conversation_id)
    m.conversation_id,
    m.content,
    m.direction,
    m.message_type
  from public.messages m
  order by m.conversation_id, m.sent_at desc
)
update public.conversations c
set
  last_message_preview = left(nullif(trim(coalesce(latest.content, '')), ''), 140),
  last_message_direction = latest.direction,
  last_message_type = latest.message_type
from latest
where latest.conversation_id = c.id
  and c.last_message_preview is null;
