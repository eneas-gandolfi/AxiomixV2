/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/equipe/page.tsx
 * Propósito: Redirect para `/settings?tab=team`. A rota antiga /whatsapp-intelligence/equipe
 *            era operacional (workload chart, inboxes, auto-assign) + administrativa
 *            (cadastro de membros, papéis). A parte administrativa pertence ao
 *            Settings (cross-módulo) e já existe lá. A parte operacional (workload
 *            chart) será absorvida pela aba Operação como widget — os componentes
 *            originais (TeamMembersTable, WorkloadChart, MemberDetailDrawer,
 *            AutoAssignButton) continuam disponíveis em /components/whatsapp/.
 *
 *            Redirect mantido pra não quebrar bookmarks existentes.
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function EquipeRedirectPage() {
  redirect("/settings?tab=team");
}
