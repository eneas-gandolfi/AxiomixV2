/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/conversas/[id]/page.tsx
 * Propósito: Página cheia da conversa (refresh / link direto).
 *            Quando navegado via lista, o slot @drawer/(.)[id] intercepta
 *            e renderiza o mesmo conteúdo como drawer overlay.
 */

import { ConversationDetailView } from "@/components/whatsapp/conversation-detail-view";

type Props = {
  params: Promise<{ id: string }>;
};

// Cacheable per conversation id. Invalidated via revalidatePath when
// conversations are synced, analyzed, assigned, etc.
export const revalidate = 30;

export default async function ConversationDetailsPage({ params }: Props) {
  const { id } = await params;
  return <ConversationDetailView id={id} mode="full" />;
}
