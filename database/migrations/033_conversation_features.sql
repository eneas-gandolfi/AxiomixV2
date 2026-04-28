/**
 * Migration: 007_conversation_features.sql
 * Proposito: Adicionar sistema de notas, atribuicao e melhorias no WhatsApp Intelligence
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

-- Adicionar coluna assigned_to na tabela conversations
alter table public.conversations
add column if not exists assigned_to uuid references auth.users(id) on delete set null;

-- Criar tabela conversation_notes para notas privadas
create table if not exists public.conversation_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indices para conversation_notes
create index if not exists idx_conversation_notes_conversation_id on public.conversation_notes(conversation_id);
create index if not exists idx_conversation_notes_company_id on public.conversation_notes(company_id);
create index if not exists idx_conversation_notes_user_id on public.conversation_notes(user_id);
create index if not exists idx_conversation_notes_created_at on public.conversation_notes(created_at desc);

-- RLS para conversation_notes
alter table public.conversation_notes enable row level security;

-- Policy: usuarios podem ler notas da sua empresa
drop policy if exists "Users can view notes from their company" on public.conversation_notes;
create policy "Users can view notes from their company"
  on public.conversation_notes
  for select
  using (
    exists (
      select 1
      from public.memberships
      where memberships.user_id = auth.uid()
        and memberships.company_id = conversation_notes.company_id
    )
  );

-- Policy: usuarios podem criar notas na sua empresa
drop policy if exists "Users can create notes in their company" on public.conversation_notes;
create policy "Users can create notes in their company"
  on public.conversation_notes
  for insert
  with check (
    exists (
      select 1
      from public.memberships
      where memberships.user_id = auth.uid()
        and memberships.company_id = conversation_notes.company_id
    )
    and user_id = auth.uid()
  );

-- Policy: usuarios podem atualizar suas proprias notas
drop policy if exists "Users can update their own notes" on public.conversation_notes;
create policy "Users can update their own notes"
  on public.conversation_notes
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policy: usuarios podem deletar suas proprias notas
drop policy if exists "Users can delete their own notes" on public.conversation_notes;
create policy "Users can delete their own notes"
  on public.conversation_notes
  for delete
  using (user_id = auth.uid());

-- Adicionar trigger para updated_at em conversation_notes
create or replace function public.handle_conversation_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_conversation_notes_updated on public.conversation_notes;
create trigger on_conversation_notes_updated
  before update on public.conversation_notes
  for each row
  execute function public.handle_conversation_notes_updated_at();

-- Comentarios
comment on table public.conversation_notes is 'Notas privadas anexadas as conversas do WhatsApp Intelligence';
comment on column public.conversation_notes.id is 'ID unico da nota';
comment on column public.conversation_notes.conversation_id is 'ID da conversa relacionada';
comment on column public.conversation_notes.company_id is 'ID da empresa (para RLS)';
comment on column public.conversation_notes.user_id is 'Usuario que criou a nota';
comment on column public.conversation_notes.content is 'Conteudo da nota (markdown permitido)';
comment on column public.conversations.assigned_to is 'Usuario responsavel pela conversa';
