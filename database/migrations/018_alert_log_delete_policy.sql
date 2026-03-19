-- ============================================================
-- Migration 018: Permitir DELETE em alert_log por membros da empresa
-- ============================================================

create policy alert_log_delete_by_membership
on public.alert_log
for delete
using (
  exists (
    select 1 from public.memberships m
    where m.company_id = alert_log.company_id
      and m.user_id = auth.uid()
  )
);
