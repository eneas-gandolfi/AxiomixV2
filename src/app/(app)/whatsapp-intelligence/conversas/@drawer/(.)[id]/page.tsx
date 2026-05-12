import { unstable_noStore as noStore } from "next/cache";
import { ConversationDetailView } from "@/components/whatsapp/conversation-detail-view";
import { ConversationDrawerShell } from "@/components/whatsapp/conversation-drawer-shell";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ConversationDrawerPage({ params }: Props) {
  noStore();
  const { id } = await params;
  return (
    <ConversationDrawerShell conversationId={id}>
      <ConversationDetailView id={id} mode="drawer" />
    </ConversationDrawerShell>
  );
}
