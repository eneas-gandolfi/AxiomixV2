/**
 * Arquivo: src/services/evo-crm/types.ts
 * Propósito: Tipos compartilhados do Evo CRM (Evolution Foundation, v4.2.0).
 *
 * Extraído de client.ts para reutilização em factory, testes e módulos futuros.
 */

import type { Json } from '@/database/types/database.types'

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

export type EvoConversationApi = {
  id: string
  phone_e164?: string | null
  remote_jid?: string | null
  status?: string | null
  last_message_at?: string | null
  last_customer_message_at?: string | null
  updated_at?: string | null
  created_at?: string | null
  profile_picture?: string | null
  assignee_id?: string | null
  contact?: {
    id?: string | null
    name?: string | null
    phone?: string | null
    phone_e164?: string | null
  } | null
}

export type EvoMessageApi = {
  id: string
  content?: string | null
  from_me?: boolean | null
  created_at?: string | null
  message_type?: string | null
  caption?: string | null
  media_url?: string | null
}

export type EvoContactApi = {
  id: string
  name?: string | null
  phone?: string | null
  phone_e164?: string | null
  email?: string | null
  gender?: string | null
  archived?: boolean | null
  blocked?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  labels?: EvoLabelApi[] | null
}

export type EvoLabelApi = {
  id: string
  name?: string | null
  color?: string | null
}

export type EvoSessionStatus = {
  active: boolean
  expires_at?: string | null
  seconds_remaining?: number | null
}

export type EvoKanbanBoard = {
  id: string
  name?: string | null
  stages?: EvoKanbanStage[] | null
}

export type EvoKanbanStage = {
  id: string
  name?: string | null
  position?: number | null
  cards?: EvoKanbanCard[] | null
}

export type EvoKanbanCard = {
  id: string
  title?: string | null
  description?: string | null
  stage_id?: string | null
  board_id?: string | null
  source?: string | null
  contact_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  assigned_to?: string | null
  assignee?: string | null
  value_amount?: number | null
  phone?: string | null
  priority?: string | null
  tags?: string[] | null
  conversation_id?: string | null
}

export type EvoUserApi = {
  id: string
  name?: string | null
  email?: string | null
  role?: string | null
  avatar_url?: string | null
}

export type EvoTeamApi = {
  id: string
  name?: string | null
  members?: EvoUserApi[] | null
}

export type EvoInboxApi = {
  id: string
  name?: string | null
  channel_type?: string | null
  phone_number?: string | null
  provider?: string | null
}

export type EvoPipelineApi = {
  id: string
  name?: string | null
  description?: string | null
  pipeline_type?: string | null
  is_active?: boolean | null
  is_default?: boolean | null
  item_count?: number | null
  stages?: EvoPipelineStageApi[] | null
}

export type EvoPipelineStageApi = {
  id: string
  name?: string | null
  pipeline_id?: string | null
  position?: number | null
  color?: string | null
  stage_type?: string | null
  item_count?: number | null
}

export type EvoMacroApi = {
  id: string
  name?: string | null
  actions?: Record<string, unknown>[] | null
  created_by_id?: string | null
  visibility?: string | null
}

export type EvoWebhookApi = {
  id: string
  url?: string | null
  webhook_type?: string | null
  subscriptions?: string[] | null
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

export type EvoRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: Json
  searchParams?: Record<string, string | number | boolean | undefined>
}

/**
 * Interface pública do client Evo CRM.
 * Cada instância está vinculada a uma company específica.
 */
export type EvoCrmClient = {
  baseUrl: string
  apiToken: string
  inboxId?: string
  syncInboxIds?: string[]
  buildConversationUrl: (externalConversationId: string) => string
  // Conversas
  listConversations: (limit?: number, filters?: { status?: string; filter?: string; inbox_id?: string }) => Promise<EvoConversationApi[]>
  listMessages: (externalConversationId: string, limit?: number) => Promise<EvoMessageApi[]>
  sendMessage: (conversationId: string, content: string, options?: { checkSession?: boolean }) => Promise<void>
  sendTemplate: (payload: { to: string; templateName: string; language?: string; components?: Json }) => Promise<{ messageId?: string }>
  getSessionStatus: (conversationId: string) => Promise<EvoSessionStatus>
  assignConversation: (conversationId: string, payload: { assigneeId?: string; teamId?: string }) => Promise<void>
  startConversation: (phone: string) => Promise<{ conversationId: string }>
  // Contatos
  listContacts: (params?: { search?: string; page?: number; limit?: number; include_labels?: boolean }) => Promise<EvoContactApi[]>
  getContact: (contactId: string) => Promise<EvoContactApi>
  findContactByPhone: (phone: string) => Promise<EvoContactApi | null>
  createContact: (payload: { name: string; phone: string }) => Promise<EvoContactApi>
  listContactLabels: (contactId: string) => Promise<EvoLabelApi[]>
  removeContactLabel: (contactId: string, labelId: string) => Promise<void>
  // Labels
  listLabels: () => Promise<EvoLabelApi[]>
  createLabel: (name: string) => Promise<EvoLabelApi>
  updateLabel: (labelId: string, payload: { name?: string; color?: string }) => Promise<void>
  deleteLabel: (labelId: string) => Promise<void>
  // Kanban / Pipelines
  createKanbanCard: (payload: {
    boardId: string
    title: string
    description: string
    stage_id?: string
    contact_id?: string
    value_amount?: number
    phone?: string
    assigned_to?: string
    priority?: string
    tags?: string[]
    conversation_id?: string
  }) => Promise<void>
  addContactLabel: (payload: { contactId: string; label: string }) => Promise<void>
  listBoards: () => Promise<EvoKanbanBoard[]>
  getBoard: (boardId: string) => Promise<EvoKanbanBoard>
  getCard: (cardId: string) => Promise<EvoKanbanCard>
  updateCard: (cardId: string, data: Partial<Pick<EvoKanbanCard, 'title' | 'description' | 'stage_id' | 'assigned_to' | 'value_amount' | 'phone' | 'priority' | 'tags' | 'contact_id' | 'conversation_id'>>) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  moveCard: (cardId: string, boardId: string, stageId: string) => Promise<void>
  // Equipe
  listUsers: () => Promise<EvoUserApi[]>
  getUser: (userId: string) => Promise<EvoUserApi>
  listTeams: () => Promise<EvoTeamApi[]>
  listInboxes: () => Promise<EvoInboxApi[]>
  // Pipelines
  listPipelines: () => Promise<EvoPipelineApi[]>
  getPipeline: (pipelineId: string) => Promise<EvoPipelineApi>
  createPipeline: (payload: { name: string; description?: string; pipeline_type?: string }) => Promise<EvoPipelineApi>
  updatePipeline: (pipelineId: string, payload: { name?: string; description?: string }) => Promise<void>
  // Macros
  listMacros: () => Promise<EvoMacroApi[]>
  executeMacro: (macroId: string, conversationIds: string[]) => Promise<void>
  // Webhooks
  listWebhooks: () => Promise<EvoWebhookApi[]>
  createWebhook: (url: string, subscriptions: string[]) => Promise<EvoWebhookApi>
  deleteWebhook: (webhookId: string) => Promise<void>
  // Conversation update
  updateConversation: (conversationId: string, payload: { status?: string; priority?: string; labels?: string[] }) => Promise<void>
}
