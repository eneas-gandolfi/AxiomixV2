/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/conversas/[id]/page.tsx
 * Propósito: Página cheia da conversa (refresh / link direto).
 *            Quando navegado via lista, o slot @drawer/(.)[id] intercepta
 *            e renderiza o mesmo conteúdo como drawer overlay.
 */

import { unstable_noStore as noStore } from "next/cache";
import { ConversationDetailView } from "@/components/whatsapp/conversation-detail-view";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ConversationDetailsPage({ params }: Props) {
  noStore();
  const { id } = await params;
  return <ConversationDetailView id={id} mode="full" />;
}
