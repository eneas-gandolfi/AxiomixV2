-- Arquivo: database/migrations/017_conversation_insight_feedback.sql
-- Proposito: Estruturar insights de conversa e registrar feedback humano.
-- Autor: AXIOMIX
-- Data: 2026-03-17

alter table public.conversation_insights
add column if not exists sales_stage text
  check (sales_stage in ('discovery', 'qualification', 'proposal', 'negotiation', 'closing', 'post_sale', 'unknown'));

alter table public.conversation_insights
add column if not exists implicit_need text;

alter table public.conversation_insights
add column if not exists explicit_need text;

alter table public.conversation_insights
add column if not exists objections jsonb default '[]'::jsonb;

alter table public.conversation_insights
add column if not exists next_commitment text;

alter table public.conversation_insights
add column if not exists stall_reason text;

alter table public.conversation_insights
add column if not exists confidence_score int
  check (confidence_score between 0 and 100);

alter table public.conversation_insights
add column if not exists feedback_status text
  check (feedback_status in ('helpful', 'needs_review', 'incorrect'));

alter table public.conversation_insights
add column if not exists feedback_note text;

alter table public.conversation_insights
add column if not exists feedback_by uuid references public.users(id) on delete set null;

alter table public.conversation_insights
add column if not exists feedback_at timestamptz;

create index if not exists idx_conversation_insights_company_stage
on public.conversation_insights (company_id, sales_stage);

create index if not exists idx_conversation_insights_company_feedback
on public.conversation_insights (company_id, feedback_status);
