"use client"

/**
 * Hook para receber mensagens em tempo real via Supabase Realtime.
 * Usa postgres_changes para escutar INSERTs na tabela messages
 * filtrados por conversation_id.
 *
 * Fluxo: Evo CRM webhook → INSERT no Supabase → Realtime → este hook → UI atualiza
 */

import { useEffect, useCallback, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type RealtimeMessage = {
  id: string
  conversation_id: string
  company_id: string
  content: string | null
  direction: "inbound" | "outbound"
  sent_at: string
  message_type: string | null
  media_url: string | null
  external_id: string | null
}

type UseRealtimeMessagesOptions = {
  conversationId: string
  onNewMessage: (message: RealtimeMessage) => void
  enabled?: boolean
}

export function useRealtimeMessages({
  conversationId,
  onNewMessage,
  enabled = true,
}: UseRealtimeMessagesOptions) {
  const callbackRef = useRef(onNewMessage)
  callbackRef.current = onNewMessage

  const subscribe = useCallback(() => {
    if (!enabled || !conversationId) return undefined

    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as RealtimeMessage
          callbackRef.current(row)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, enabled])

  useEffect(() => {
    const cleanup = subscribe()
    return () => cleanup?.()
  }, [subscribe])
}
