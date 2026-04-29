/**
 * Arquivo: src/services/evo-crm/agents.ts
 * Propósito: CRUD de agentes IA via Evo CRM Core API.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 *
 * Os agentes do Evo CRM suportam 5 tipos:
 *   - llm: Conversacional (responde com linguagem natural)
 *   - task: Executa tarefa específica e retorna resultado
 *   - sequential: Orquestra sub-agentes em sequência
 *   - parallel: Dispara múltiplos agentes simultaneamente
 *   - loop: Repete ações até condição satisfeita
 *
 * Cada agente pode ter: knowledge base, memória, sub-agentes, tools, MCP servers.
 * A API de agentes fica no Core Service do Evo CRM.
 *
 * NOTA: Endpoints de agents no Core Service podem usar base URL diferente
 * do CRM Service. Por ora, tentamos no mesmo base URL da integração.
 */

import { getEvoCrmClient } from './client'
import type { EvoCrmClient } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const AGENT_TYPES = ['llm', 'task', 'sequential', 'parallel', 'loop'] as const
export type AgentType = typeof AGENT_TYPES[number]

export type EvoAgent = {
  id: string
  name: string
  description: string | null
  agent_type: AgentType
  role: string | null
  goal: string | null
  instructions: string | null
  model: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export type CreateAgentPayload = {
  name: string
  description?: string
  agent_type: AgentType
  role?: string
  goal?: string
  instructions?: string
  model?: string
}

export type UpdateAgentPayload = Partial<Omit<CreateAgentPayload, 'agent_type'>> & {
  is_active?: boolean
}

/** Parâmetros ajustáveis pelo cliente (não-admin). */
export type ClientAdjustableParams = {
  instructions?: string
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseAgent(raw: Record<string, unknown>): EvoAgent {
  const agentType = typeof raw.agent_type === 'string'
    ? raw.agent_type.toLowerCase()
    : typeof raw.type === 'string'
      ? raw.type.toLowerCase()
      : 'llm'

  return {
    id: String(raw.id ?? ''),
    name: typeof raw.name === 'string' ? raw.name : 'Sem nome',
    description: typeof raw.description === 'string' ? raw.description : null,
    agent_type: (AGENT_TYPES as readonly string[]).includes(agentType)
      ? agentType as AgentType
      : 'llm',
    role: typeof raw.role === 'string' ? raw.role : null,
    goal: typeof raw.goal === 'string' ? raw.goal : null,
    instructions: typeof raw.instructions === 'string' ? raw.instructions
      : typeof raw.system_prompt === 'string' ? raw.system_prompt
      : null,
    model: typeof raw.model === 'string' ? raw.model
      : typeof raw.llm_model === 'string' ? raw.llm_model
      : null,
    is_active: typeof raw.is_active === 'boolean' ? raw.is_active
      : typeof raw.active === 'boolean' ? raw.active
      : true,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  }
}

function assertArrayPayload(payload: unknown): unknown[] {
  return Array.isArray(payload) ? payload : []
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Lista todos os agentes de uma company.
 * Tenta endpoints conhecidos do Core Service do Evo CRM.
 */
export async function listAgents(companyId: string): Promise<EvoAgent[]> {
  const client = await getEvoCrmClient(companyId)

  // O Core Service usa /api/v1/agents (mesmo padrão REST)
  const result = await agentRequest<Record<string, unknown>>(client, '/api/v1/agents')
  const rawList = Array.isArray(result.agents)
    ? result.agents
    : Array.isArray(result.data)
      ? result.data
      : assertArrayPayload(result)

  return rawList.map((item) => parseAgent(item as Record<string, unknown>))
}

/**
 * Busca um agente específico.
 */
export async function getAgent(companyId: string, agentId: string): Promise<EvoAgent> {
  const client = await getEvoCrmClient(companyId)
  const result = await agentRequest<Record<string, unknown>>(
    client,
    `/api/v1/agents/${encodeURIComponent(agentId)}`
  )
  const item = typeof result.agent === 'object' && result.agent !== null
    ? result.agent as Record<string, unknown>
    : result
  return parseAgent(item)
}

/**
 * Cria um novo agente.
 */
export async function createAgent(companyId: string, payload: CreateAgentPayload): Promise<EvoAgent> {
  const client = await getEvoCrmClient(companyId)
  const result = await agentRequest<Record<string, unknown>>(client, '/api/v1/agents', {
    method: 'POST',
    body: {
      name: payload.name,
      agent_type: payload.agent_type,
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.goal ? { goal: payload.goal } : {}),
      ...(payload.instructions ? { instructions: payload.instructions } : {}),
      ...(payload.model ? { model: payload.model } : {}),
    },
  })
  const item = typeof result.agent === 'object' && result.agent !== null
    ? result.agent as Record<string, unknown>
    : result
  return parseAgent(item)
}

/**
 * Atualiza um agente existente.
 */
export async function updateAgent(
  companyId: string,
  agentId: string,
  payload: UpdateAgentPayload
): Promise<void> {
  const client = await getEvoCrmClient(companyId)
  await agentRequest(client, `/api/v1/agents/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: payload as Record<string, unknown>,
  })
}

/**
 * Deleta um agente.
 */
export async function deleteAgent(companyId: string, agentId: string): Promise<void> {
  const client = await getEvoCrmClient(companyId)
  await agentRequest(client, `/api/v1/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  })
}

/**
 * Atualiza parâmetros ajustáveis pelo cliente (não-admin).
 * Subset limitado de campos.
 */
export async function adjustAgentParams(
  companyId: string,
  agentId: string,
  params: ClientAdjustableParams
): Promise<void> {
  await updateAgent(companyId, agentId, params)
}

// ---------------------------------------------------------------------------
// Agent ↔ Inbox integration (vincular agente ao WhatsApp)
// ---------------------------------------------------------------------------

export type AgentIntegration = {
  id: string
  agent_id: string
  provider: string
  config: Record<string, unknown>
  created_at: string | null
}

/**
 * Lista integrações de um agente (inboxes vinculados, etc).
 */
export async function listAgentIntegrations(companyId: string, agentId: string): Promise<AgentIntegration[]> {
  const client = await getEvoCrmClient(companyId)
  const result = await agentRequest<Record<string, unknown>>(
    client,
    `/api/v1/agents/${encodeURIComponent(agentId)}/integrations`
  )
  const rawList = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result) ? result : []

  return (rawList as Record<string, unknown>[]).map((item) => ({
    id: String(item.id ?? ''),
    agent_id: String(item.agent_id ?? agentId),
    provider: typeof item.provider === 'string' ? item.provider : 'unknown',
    config: typeof item.config === 'object' && item.config !== null
      ? item.config as Record<string, unknown>
      : {},
    created_at: typeof item.created_at === 'string' ? item.created_at : null,
  }))
}

/**
 * Vincula um agente a um inbox WhatsApp (ou outro canal).
 * Faz o agente atender automaticamente novas conversas daquele inbox.
 */
export async function assignAgentToInbox(
  companyId: string,
  agentId: string,
  inboxId: string
): Promise<AgentIntegration> {
  const client = await getEvoCrmClient(companyId)
  const result = await agentRequest<Record<string, unknown>>(
    client,
    `/api/v1/agents/${encodeURIComponent(agentId)}/integrations`,
    {
      method: 'POST',
      body: {
        provider: 'crm_inbox',
        config: { inbox_id: inboxId },
      },
    }
  )

  const item = typeof result.data === 'object' && result.data !== null
    ? result.data as Record<string, unknown>
    : result

  return {
    id: String(item.id ?? ''),
    agent_id: String(item.agent_id ?? agentId),
    provider: typeof item.provider === 'string' ? item.provider : 'crm_inbox',
    config: typeof item.config === 'object' && item.config !== null
      ? item.config as Record<string, unknown>
      : { inbox_id: inboxId },
    created_at: typeof item.created_at === 'string' ? item.created_at : null,
  }
}

/**
 * Remove a vinculação de um agente com um inbox.
 */
export async function removeAgentFromInbox(
  companyId: string,
  agentId: string,
  integrationId: string
): Promise<void> {
  const client = await getEvoCrmClient(companyId)
  await agentRequest(
    client,
    `/api/v1/agents/${encodeURIComponent(agentId)}/integrations/${encodeURIComponent(integrationId)}`,
    { method: 'DELETE' }
  )
}

// ---------------------------------------------------------------------------
// HTTP helper (reutiliza credenciais do client)
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 15_000

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
}

async function agentRequest<T = unknown>(
  client: EvoCrmClient,
  path: string,
  options?: RequestOptions
): Promise<T> {
  const method = options?.method ?? 'GET'
  const url = `${client.baseUrl}${path}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method,
      headers: {
        api_access_token: client.apiToken,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    if (res.status === 204 || res.status === 202) {
      return {} as T
    }

    const text = await res.text()

    if (res.status >= 400) {
      throw new Error(`Evo CRM Agents ${method} ${path}: ${res.status} ${text.slice(0, 200)}`)
    }

    if (!text.trim()) return {} as T

    const json = JSON.parse(text)

    // Unwrap envelope padrão
    if (json && typeof json === 'object' && json.success === true && 'data' in json) {
      return json.data as T
    }

    return json as T
  } finally {
    clearTimeout(timeout)
  }
}
