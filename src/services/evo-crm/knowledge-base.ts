/**
 * Arquivo: src/services/evo-crm/knowledge-base.ts
 * Propósito: CRUD de knowledge bases via Evo CRM Knowledge API.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 *
 * O Evo CRM suporta:
 *   - Provedores de vector DB: Pinecone, Qdrant
 *   - Conteúdo: manual (markdown), upload (PDF/DOCX/etc), URL (com sub-pages)
 *   - Busca: hybrid/vector/text, hybrid alpha configurável
 */

import { getEvoCrmClient } from './client'
import type { EvoCrmClient } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EvoKnowledgeBase = {
  id: string
  name: string
  description: string | null
  provider: string | null
  document_count: number
  created_at: string | null
  updated_at: string | null
}

export type EvoKBDocument = {
  id: string
  knowledge_base_id: string
  title: string | null
  source_type: 'manual' | 'upload' | 'url' | string
  status: 'processing' | 'ready' | 'error' | string
  content_preview: string | null
  created_at: string | null
}

export type CreateKBPayload = {
  name: string
  description?: string
  provider?: string
}

export type AddContentPayload =
  | { type: 'manual'; title: string; content: string }
  | { type: 'url'; url: string; include_subpages?: boolean }

export type KBSearchResult = {
  content: string
  score: number
  metadata: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseKB(raw: Record<string, unknown>): EvoKnowledgeBase {
  return {
    id: String(raw.id ?? ''),
    name: typeof raw.name === 'string' ? raw.name : 'Sem nome',
    description: typeof raw.description === 'string' ? raw.description : null,
    provider: typeof raw.provider === 'string' ? raw.provider : null,
    document_count: typeof raw.document_count === 'number' ? raw.document_count
      : typeof raw.documents_count === 'number' ? raw.documents_count
      : 0,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  }
}

function parseDocument(raw: Record<string, unknown>): EvoKBDocument {
  return {
    id: String(raw.id ?? ''),
    knowledge_base_id: typeof raw.knowledge_base_id === 'string' ? raw.knowledge_base_id : '',
    title: typeof raw.title === 'string' ? raw.title
      : typeof raw.name === 'string' ? raw.name
      : null,
    source_type: typeof raw.source_type === 'string' ? raw.source_type
      : typeof raw.type === 'string' ? raw.type
      : 'manual',
    status: typeof raw.status === 'string' ? raw.status : 'processing',
    content_preview: typeof raw.content_preview === 'string' ? raw.content_preview
      : typeof raw.content === 'string' ? raw.content.slice(0, 200)
      : null,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listKnowledgeBases(companyId: string): Promise<EvoKnowledgeBase[]> {
  const client = await getEvoCrmClient(companyId)
  const result = await kbRequest<Record<string, unknown>>(client, '/api/v1/knowledge')
  const rawList = Array.isArray(result.knowledge_bases)
    ? result.knowledge_bases
    : Array.isArray(result.data)
      ? result.data
      : Array.isArray(result) ? result : []

  return (rawList as Record<string, unknown>[]).map(parseKB)
}

export async function getKnowledgeBase(companyId: string, kbId: string): Promise<EvoKnowledgeBase> {
  const client = await getEvoCrmClient(companyId)
  const result = await kbRequest<Record<string, unknown>>(
    client, `/api/v1/knowledge/${encodeURIComponent(kbId)}`
  )
  const item = typeof result.knowledge_base === 'object' && result.knowledge_base !== null
    ? result.knowledge_base as Record<string, unknown>
    : result
  return parseKB(item)
}

export async function createKnowledgeBase(companyId: string, payload: CreateKBPayload): Promise<EvoKnowledgeBase> {
  const client = await getEvoCrmClient(companyId)
  const result = await kbRequest<Record<string, unknown>>(client, '/api/v1/knowledge', {
    method: 'POST',
    body: {
      name: payload.name,
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.provider ? { provider: payload.provider } : {}),
    },
  })
  const item = typeof result.knowledge_base === 'object' && result.knowledge_base !== null
    ? result.knowledge_base as Record<string, unknown>
    : result
  return parseKB(item)
}

export async function deleteKnowledgeBase(companyId: string, kbId: string): Promise<void> {
  const client = await getEvoCrmClient(companyId)
  await kbRequest(client, `/api/v1/knowledge/${encodeURIComponent(kbId)}`, {
    method: 'DELETE',
  })
}

export async function listDocuments(companyId: string, kbId: string): Promise<EvoKBDocument[]> {
  const client = await getEvoCrmClient(companyId)
  const result = await kbRequest<Record<string, unknown>>(
    client, `/api/v1/knowledge/${encodeURIComponent(kbId)}/documents`
  )
  const rawList = Array.isArray(result.documents)
    ? result.documents
    : Array.isArray(result.data)
      ? result.data
      : Array.isArray(result) ? result : []

  return (rawList as Record<string, unknown>[]).map(parseDocument)
}

export async function addContent(
  companyId: string,
  kbId: string,
  payload: AddContentPayload
): Promise<EvoKBDocument> {
  const client = await getEvoCrmClient(companyId)
  const body = payload.type === 'manual'
    ? { source_type: 'manual', title: payload.title, content: payload.content }
    : { source_type: 'url', url: payload.url, include_subpages: payload.include_subpages ?? false }

  const result = await kbRequest<Record<string, unknown>>(
    client,
    `/api/v1/knowledge/${encodeURIComponent(kbId)}/documents`,
    { method: 'POST', body }
  )
  const item = typeof result.document === 'object' && result.document !== null
    ? result.document as Record<string, unknown>
    : result
  return parseDocument(item)
}

export async function deleteDocument(companyId: string, kbId: string, docId: string): Promise<void> {
  const client = await getEvoCrmClient(companyId)
  await kbRequest(
    client,
    `/api/v1/knowledge/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}`,
    { method: 'DELETE' }
  )
}

export async function searchKnowledge(
  companyId: string,
  kbId: string,
  query: string,
  maxResults = 5
): Promise<KBSearchResult[]> {
  const client = await getEvoCrmClient(companyId)
  const result = await kbRequest<Record<string, unknown>>(
    client,
    `/api/v1/knowledge/${encodeURIComponent(kbId)}/search`,
    { method: 'POST', body: { query, max_results: maxResults } }
  )
  const rawList = Array.isArray(result.results)
    ? result.results
    : Array.isArray(result.data)
      ? result.data
      : []

  return (rawList as Record<string, unknown>[]).map((r) => ({
    content: typeof r.content === 'string' ? r.content : '',
    score: typeof r.score === 'number' ? r.score : 0,
    metadata: typeof r.metadata === 'object' && r.metadata !== null
      ? r.metadata as Record<string, unknown>
      : {},
  }))
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 15_000

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
}

async function kbRequest<T = unknown>(
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

    if (res.status === 204 || res.status === 202) return {} as T

    const text = await res.text()
    if (res.status >= 400) {
      throw new Error(`Evo CRM Knowledge ${method} ${path}: ${res.status} ${text.slice(0, 200)}`)
    }

    if (!text.trim()) return {} as T
    const json = JSON.parse(text)

    if (json && typeof json === 'object' && json.success === true && 'data' in json) {
      return json.data as T
    }
    return json as T
  } finally {
    clearTimeout(timeout)
  }
}
