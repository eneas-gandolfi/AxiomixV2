"use client"

/**
 * Hook para receber atualizações de conversas em tempo real via Supabase Realtime.
 * Escuta INSERTs e UPDATEs na tabela conversations filtrados por company_id.
 *
 * Fluxo: Evo CRM webhook → UPSERT no Supabase → Realtime → este hook → UI atualiza
 */

import { useEffect, useCallback, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type RealtimeConversation = {
  id: string
  company_id: string
  external_id: string | null
  remote_jid: string
  contact_name: string | null
  contact_phone: string | null
  status: string
  last_message_at: string | null
  last_synced_at: string | null
  labels: string[] | null
}

type UseRealtimeConversationsOptions = {
  companyId: string
  onConversationChange: (conversation: RealtimeConversation, eventType: "INSERT" | "UPDATE") => void
  enabled?: boolean
}

export function useRealtimeConversations({
  companyId,
  onConversationChange,
  enabled = true,
}: UseRealtimeConversationsOptions) {
  const callbackRef = useRef(onConversationChange)
  callbackRef.current = onConversationChange

  const subscribe = useCallback(() => {
    if (!enabled || !companyId) return undefined

    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`conversations:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          callbackRef.current(payload.new as RealtimeConversation, "INSERT")
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          callbackRef.current(payload.new as RealtimeConversation, "UPDATE")
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, enabled])

  useEffect(() => {
    const cleanup = subscribe()
    return () => cleanup?.()
  }, [subscribe])
}
