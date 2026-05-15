-- Habilita Supabase Realtime nas tabelas `conversations` e `messages` para que o
-- hook useRealtimeConversations receba pushes de INSERT/UPDATE em milissegundos
-- (em vez de depender do polling de 10s no cliente).
--
-- Idempotente: nao falha se ja estiverem na publication ou se a publication nao
-- existir (ambientes locais sem Supabase Realtime).

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- conversations
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'conversations'
    ) then
      execute 'alter publication supabase_realtime add table public.conversations';
    end if;

    -- messages
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
  end if;
end
$$;

-- REPLICA IDENTITY FULL é necessário para que o Supabase Realtime envie os
-- valores antigos em UPDATE/DELETE — sem isso, o cliente recebe só o id e
-- precisa refetchar. Para nosso uso atual (router.refresh), DEFAULT bastaria,
-- mas FULL deixa o caminho aberto para usar payload.new sem round-trip.
alter table public.conversations replica identity full;
alter table public.messages replica identity full;
