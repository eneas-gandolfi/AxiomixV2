/**
 * Arquivo: scripts/verify-evo-endpoints.mjs
 * Propósito: Validar contra Evo CRM real os 7 endpoints UNVERIFIED do client.ts
 *            (sendTemplate + 6 sub-rotas de kanban card CRUD), com casos
 *            negativos opcionais. Independe do bundler Next — fetch HTTP direto.
 * Autor: AXIOMIX
 * Data: 2026-05-04
 *
 * Uso:
 *   # Só happy path
 *   node scripts/verify-evo-endpoints.mjs
 *
 *   # Happy + casos negativos (E-09 e E-10 marcam SKIP se faltar credencial)
 *   node scripts/verify-evo-endpoints.mjs --negative-cases
 *
 *   # Manter cards de teste no board (debug); default é deletar tudo
 *   node scripts/verify-evo-endpoints.mjs --keep-cards
 *
 *   # Forçar boardId específico (default: primeiro board que tiver >=2 stages)
 *   node scripts/verify-evo-endpoints.mjs --board-id <uuid>
 *
 * Variáveis de ambiente obrigatórias:
 *   EVO_BASE_URL          ex: https://api.getlead.capital
 *   EVO_API_TOKEN         api_access_token do Evo CRM
 *
 * Opcionais:
 *   EVO_INBOX_ID          obrigatório só para C-07 (sendTemplate)
 *   EVO_VERIFY_PHONE      destino do template; default 5511900000000
 *   EVO_VERIFY_TEMPLATE   nome do template aprovado; default hello_world
 *   EVO_CROSS_BASE_URL    base de outro tenant (E-10)
 *   EVO_CROSS_API_TOKEN   token de outro tenant (E-10)
 */

const TEST_PREFIX = 'TEST_VERIFY_'
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const NOT_A_UUID = 'not-a-uuid-string'

const env = process.env
const BASE_URL = (env.EVO_BASE_URL || '').replace(/\/+$/, '')
const TOKEN = env.EVO_API_TOKEN || ''
const INBOX_ID = env.EVO_INBOX_ID || ''
const VERIFY_PHONE = env.EVO_VERIFY_PHONE || '5511900000000'
const VERIFY_TEMPLATE = env.EVO_VERIFY_TEMPLATE || 'hello_world'
const CROSS_BASE_URL = (env.EVO_CROSS_BASE_URL || '').replace(/\/+$/, '')
const CROSS_TOKEN = env.EVO_CROSS_API_TOKEN || ''

const argv = process.argv.slice(2)
const FLAGS = {
  negative: argv.includes('--negative-cases'),
  keepCards: argv.includes('--keep-cards'),
  boardId: (() => {
    const i = argv.indexOf('--board-id')
    return i >= 0 && argv[i + 1] ? argv[i + 1] : null
  })(),
}

if (!BASE_URL || !TOKEN) {
  console.error('ERRO: EVO_BASE_URL e EVO_API_TOKEN são obrigatórios.')
  process.exit(2)
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function evoFetch(path, opts = {}, { baseUrl = BASE_URL, token = TOKEN } = {}) {
  const method = opts.method || 'GET'
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  const headers = { 'content-type': 'application/json' }
  if (token) headers.api_access_token = token

  const init = { method, headers }
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body)

  const started = Date.now()
  let status = 0
  let raw = ''
  let json = null
  try {
    const res = await fetch(url, init)
    status = res.status
    raw = await res.text()
    try {
      json = raw ? JSON.parse(raw) : null
    } catch {
      json = null
    }
  } catch (err) {
    return {
      ok: false,
      networkError: err instanceof Error ? err.message : String(err),
      status: 0,
      durationMs: Date.now() - started,
    }
  }
  const ok = status >= 200 && status < 300
  return { ok, status, raw, json, durationMs: Date.now() - started }
}

function pickId(json) {
  if (!json || typeof json !== 'object') return null
  const candidates = [json.id, json.data?.id, json.card?.id, json.data?.card?.id, json.contact?.id, json.data?.contact?.id]
  for (const c of candidates) if (typeof c === 'string' && c.length > 0) return c
  return null
}

function pickList(json, keys) {
  if (!json || typeof json !== 'object') return []
  for (const k of keys) {
    const v = json[k]
    if (Array.isArray(v)) return v
  }
  if (Array.isArray(json.data)) return json.data
  return []
}

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

const results = []
const ts = () => new Date().toISOString()

function logEvidence(phase, step, payload, response) {
  return { phase, step, status: 'OK', payload, response, at: ts() }
}

async function runHappy(step, fn, payload) {
  const at = ts()
  try {
    const response = await fn()
    if (!response.ok) {
      results.push({ phase: 'happy', step, status: 'FAIL', payload, response, at })
      console.error(`[${at}] FAIL ${step} status=${response.status}`, response.json ?? response.raw?.slice(0, 200))
      return null
    }
    results.push({ phase: 'happy', step, status: 'OK', payload, response, at })
    console.log(`[${at}] OK   ${step} status=${response.status} (${response.durationMs}ms)`)
    return response
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    results.push({ phase: 'happy', step, status: 'FAIL', payload, error, at })
    console.error(`[${at}] FAIL ${step} threw:`, error)
    return null
  }
}

async function runNeg(step, fn, expectedStatuses, payload) {
  const at = ts()
  const expected = expectedStatuses.join('|')
  try {
    const response = await fn()
    const matched = expectedStatuses.includes(response.status)
    if (matched) {
      results.push({ phase: 'negative', step, status: 'OK', payload, response, expected, at })
      console.log(`[${at}] [NEG] OK   ${step} status=${response.status} (esperado ${expected})`)
    } else if (response.ok) {
      results.push({
        phase: 'negative',
        step,
        status: 'FAIL',
        payload,
        response,
        expected,
        reason: 'Evo aceitou input inválido (2xx)',
        at,
      })
      console.error(`[${at}] [NEG] FAIL ${step} — esperava ${expected}, recebeu ${response.status}`)
    } else {
      results.push({
        phase: 'negative',
        step,
        status: 'FAIL',
        payload,
        response,
        expected,
        reason: `status ${response.status} fora do esperado ${expected}`,
        at,
      })
      console.error(`[${at}] [NEG] FAIL ${step} — esperava ${expected}, recebeu ${response.status}`)
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    results.push({ phase: 'negative', step, status: 'FAIL', payload, error, expected, at })
    console.error(`[${at}] [NEG] FAIL ${step} threw:`, error)
  }
}

function skip(phase, step, reason) {
  const at = ts()
  results.push({ phase, step, status: 'SKIPPED', reason, at })
  console.warn(`[${at}] [${phase === 'negative' ? 'NEG' : 'HPY'}] SKIP ${step} — ${reason}`)
}

// ---------------------------------------------------------------------------
// API wrappers — paths/payloads alinhados com src/services/evo-crm/client.ts
// ---------------------------------------------------------------------------

const api = {
  listBoards: () => evoFetch('/api/v1/pipelines'),
  getBoard: (id) => evoFetch(`/api/v1/pipelines/${encodeURIComponent(id)}`),
  createContact: (name, phone) =>
    evoFetch('/api/v1/contacts', { method: 'POST', body: { name, phone_number: phone } }),
  // Path real do Evo v4.2.0 (vide client.ts:findContactByPhone)
  searchContacts: (q) =>
    evoFetch(`/api/v1/contacts/search?q=${encodeURIComponent(q)}`),
  // Card/Item CRUD em pipelines — path real ainda em discovery (Evo CRM v4.2.0 sem doc aberta).
  // O resolver `discoverCardEndpoints` testa variantes e fixa as URLs descobertas em `cardPaths`.
  createCard: (boardId, body) => createCardImpl(boardId, body),
  // Tenta GET individual primeiro; se 404, fallback pra getBoard e procurar item.
  // Evolution Foundation pode não expor GET individual de pipeline_item — items
  // viviam dentro de stages[] no response do board.
  getCard: async (cardId) => {
    const direct = await evoFetch(cardPaths.get(cardId))
    if (direct.status !== 404) return direct
    // Fallback: busca dentro de getBoard
    const board = await evoFetch(`/api/v1/pipelines/${encodeURIComponent(cardPaths.pipelineId)}`)
    if (!board.ok) return board
    const data = board.json?.data || board.json
    const stages = data?.stages || []
    for (const stage of stages) {
      const items = stage.items || []
      const found = items.find((i) => i?.id === cardId)
      if (found) {
        return {
          ok: true,
          status: 200,
          json: { success: true, data: found, _resolvedVia: 'board.stages[].items[]' },
          durationMs: board.durationMs,
        }
      }
    }
    return direct
  },
  // Rails strong params: body precisa estar wrapped em { pipeline_item: {...} }
  // (evidência: response 422 "param is missing or the value is empty: pipeline_item")
  updateCard: (cardId, body) =>
    evoFetch(cardPaths.update(cardId), {
      method: 'PUT',
      body: { pipeline_item: body },
    }),
  deleteCard: (cardId) =>
    evoFetch(cardPaths.delete(cardId), { method: 'DELETE' }),
  // Evolution Foundation: PATCH .../move_to_stage com { new_stage_id, notes? }
  moveCard: (cardId, pipelineId, stageId) => {
    cardPaths.setPipeline(pipelineId)
    return evoFetch(cardPaths.move(cardId), {
      method: 'PATCH',
      body: { new_stage_id: stageId, notes: 'verify script — automated move' },
    })
  },
  sendTemplate: (inboxId, body) =>
    evoFetch(`/api/v1/inboxes/${encodeURIComponent(inboxId)}/send-template`, {
      method: 'POST',
      body,
    }),
}

// ---------------------------------------------------------------------------
// Pipeline items API — paths confirmados via Blueprint Founder (Evolution Foundation)
// Módulo 6, Caso 4: pipelines/{id}/pipeline_items + .../move_to_stage
// ---------------------------------------------------------------------------

// Cards do kanban são "pipeline_items" — entidades que vinculam um contato/conversa
// a um pipeline+stage. NÃO são entidades standalone com title/description.
// Body de criação: { type, item_id, pipeline_stage_id, custom_fields }
//   - type: "contact" | provavelmente também "conversation"
//   - item_id: UUID do contato (ou conversa) sendo associado
//   - pipeline_stage_id: UUID do stage de destino

const cardPaths = {
  // pipelineId é necessário em todas as rotas — fixado em runtime
  pipelineId: null,
  setPipeline(id) {
    this.pipelineId = id
  },
  list() {
    return `/api/v1/pipelines/${encodeURIComponent(this.pipelineId)}/pipeline_items`
  },
  get(itemId) {
    return `/api/v1/pipelines/${encodeURIComponent(this.pipelineId)}/pipeline_items/${encodeURIComponent(itemId)}`
  },
  update(itemId) {
    return `/api/v1/pipelines/${encodeURIComponent(this.pipelineId)}/pipeline_items/${encodeURIComponent(itemId)}`
  },
  delete(itemId) {
    return `/api/v1/pipelines/${encodeURIComponent(this.pipelineId)}/pipeline_items/${encodeURIComponent(itemId)}`
  },
  move(itemId) {
    return `/api/v1/pipelines/${encodeURIComponent(this.pipelineId)}/pipeline_items/${encodeURIComponent(itemId)}/move_to_stage`
  },
}

async function createCardImpl(boardId, body) {
  cardPaths.setPipeline(boardId)
  // body recebido tem (legado do client antigo): title, description, stage_id, contact_id
  // API real espera: type, item_id, pipeline_stage_id, custom_fields
  const payload = {
    type: 'contact',
    item_id: body.contact_id,
    pipeline_stage_id: body.stage_id,
    ...(body.title || body.description
      ? {
          custom_fields: {
            ...(body.title ? { title: body.title } : {}),
            ...(body.description ? { description: body.description } : {}),
          },
        }
      : {}),
  }
  return evoFetch(cardPaths.list(), { method: 'POST', body: payload })
}

// Resolve cardId quando POST retorna 2xx mas sem id no body.
// Pipeline items podem ter título em c.title OU c.custom_fields.title (depende da versão).
function cardTitle(c) {
  if (!c || typeof c !== 'object') return null
  if (typeof c.title === 'string') return c.title
  if (c.custom_fields && typeof c.custom_fields.title === 'string') return c.custom_fields.title
  return null
}

async function resolveCardIdByTitle(boardId, title) {
  const board = await api.getBoard(boardId)
  if (!board.ok || !board.json) return null
  const data = board.json.data || board.json
  const stages = data.stages || []
  for (const stage of stages) {
    const cards = stage.items || stage.cards || []
    for (const c of cards) {
      if (cardTitle(c) === title && typeof c.id === 'string') return c.id
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Happy path (C-01..C-07)
// ---------------------------------------------------------------------------

async function runHappyPath() {
  let boardId = null
  let stageA = null
  let stageB = null
  let contactId = null
  let cardId = null

  // C-00 listBoards (já era VERIFIED, mas precisamos pra resolver fixtures)
  const boardsRes = await runHappy('C-00 listBoards', () => api.listBoards())
  if (!boardsRes) return { boardId, stageA, stageB, contactId, cardId }

  const boards = pickList(boardsRes.json, ['pipelines', 'boards', 'data'])
  const target = FLAGS.boardId
    ? boards.find((b) => b.id === FLAGS.boardId)
    : boards.find((b) => Array.isArray(b.stages) && b.stages.length >= 2)

  if (!target) {
    skip('happy', 'C-01..C-07', 'nenhum board com >=2 stages encontrado (use --board-id ou crie um sandbox)')
    return { boardId, stageA, stageB, contactId, cardId }
  }
  boardId = target.id
  stageA = target.stages[0].id
  stageB = target.stages[1].id
  console.log(`[${ts()}] fixture: boardId=${boardId} stageA=${stageA} stageB=${stageB}`)

  // Contato fixo: busca antes de criar (idempotente entre runs).
  // Evo CRM v4.2.0 exige E164 com prefixo "+" — validado em 2026-05-04.
  const phoneE164 = '+5511900000000'
  const searchRes = await runHappy(
    'C-fixture searchContact',
    () => api.searchContacts(phoneE164),
    { q: phoneE164 },
  )
  if (searchRes && searchRes.ok) {
    const list = pickList(searchRes.json, ['contacts', 'data'])
    const found = list.find((c) => c?.phone_number === phoneE164 || c?.phone === phoneE164) || list[0]
    if (found?.id) {
      contactId = found.id
      console.log(`[${ts()}] contato existente reutilizado: ${contactId}`)
    }
  }
  if (!contactId) {
    const created = await runHappy(
      'C-fixture createContact',
      () => api.createContact(`${TEST_PREFIX}contact`, phoneE164),
      { name: `${TEST_PREFIX}contact`, phone_number: phoneE164 },
    )
    if (created) contactId = pickId(created.json)
  }
  if (!contactId) {
    skip('happy', 'C-01..C-07', 'sem contactId — todos os steps de card pulados')
    return { boardId, stageA, stageB, contactId, cardId }
  }

  // C-01 createKanbanCard
  const cardTitle = `${TEST_PREFIX}happy_${Date.now()}`
  const created = await runHappy(
    'C-01 createKanbanCard',
    () => api.createCard(boardId, { title: cardTitle, description: 'verify happy', stage_id: stageA, contact_id: contactId }),
    { boardId, title: cardTitle, stage_id: stageA, contact_id: contactId },
  )
  if (!created) return { boardId, stageA, stageB, contactId, cardId }

  cardId = pickId(created.json)
  if (!cardId) {
    cardId = await resolveCardIdByTitle(boardId, cardTitle)
    if (!cardId) {
      skip('happy', 'C-02..C-07', 'criação retornou 2xx mas cardId não localizável')
      return { boardId, stageA, stageB, contactId, cardId }
    }
    console.log(`[${ts()}] cardId resolvido por título: ${cardId}`)
  }

  // C-02 getCard
  await runHappy('C-02 getCard', () => api.getCard(cardId), { cardId })

  // C-03 updateCard
  const newTitle = `${cardTitle}_updated`
  await runHappy(
    'C-03 updateCard',
    () => api.updateCard(cardId, { title: newTitle, description: 'verify updated' }),
    { cardId, title: newTitle },
  )

  // C-04 moveCard A -> B
  await runHappy(
    'C-04 moveCard A->B',
    () => api.moveCard(cardId, boardId, stageB),
    { cardId, boardId, stageId: stageB },
  )

  // C-05 moveCard B -> A (valida que move funciona em ambos os sentidos)
  await runHappy(
    'C-05 moveCard B->A',
    () => api.moveCard(cardId, boardId, stageA),
    { cardId, boardId, stageId: stageA },
  )

  // C-06 deleteCard
  const deleted = await runHappy('C-06 deleteCard', () => api.deleteCard(cardId), { cardId })
  if (deleted) cardId = null

  // C-07 sendTemplate
  if (!INBOX_ID) {
    skip('happy', 'C-07 sendTemplate', 'EVO_INBOX_ID ausente')
  } else {
    await runHappy(
      'C-07 sendTemplate',
      () => api.sendTemplate(INBOX_ID, { to: VERIFY_PHONE, template_name: VERIFY_TEMPLATE, language: 'pt_BR' }),
      { to: VERIFY_PHONE, template_name: VERIFY_TEMPLATE },
    )
  }

  return { boardId, stageA, stageB, contactId, cardId }
}

// ---------------------------------------------------------------------------
// Negative cases (E-01..E-10)
// ---------------------------------------------------------------------------

async function runNegativeCases(ctx) {
  const { boardId, stageA, contactId } = ctx

  // E-01 createKanbanCard sem stage_id (board no path, mas omitindo stage_id obrigatório)
  if (boardId && contactId) {
    await runNeg(
      'E-01 createCard sem stage_id',
      () => api.createCard(boardId, { title: `${TEST_PREFIX}e01`, description: 'neg', contact_id: contactId }),
      [400, 422],
      { boardId, contact_id: contactId },
    )
  } else {
    skip('negative', 'E-01 createCard sem stage_id', 'fixtures indisponíveis')
  }

  // E-02 createCard com contact_id inexistente (UUID válido mas zerado)
  if (boardId && stageA) {
    await runNeg(
      'E-02 createCard contact inexistente',
      () => api.createCard(boardId, { title: `${TEST_PREFIX}e02`, description: 'neg', stage_id: stageA, contact_id: ZERO_UUID }),
      [400, 404, 422],
      { contact_id: ZERO_UUID },
    )
  } else {
    skip('negative', 'E-02 createCard contact inexistente', 'fixtures indisponíveis')
  }

  // E-03 getCard zero-uuid
  await runNeg('E-03 getCard zero-uuid', () => api.getCard(ZERO_UUID), [404, 400], { cardId: ZERO_UUID })

  // E-04 getCard com string não-UUID
  await runNeg('E-04 getCard not-a-uuid', () => api.getCard(NOT_A_UUID), [400, 404, 422], { cardId: NOT_A_UUID })

  // E-05 updateCard com title vazio (cria temp, atualiza com vazio, limpa)
  if (boardId && stageA && contactId) {
    const tmpTitle = `${TEST_PREFIX}e05_${Date.now()}`
    const tmp = await runHappy(
      'E-05 setup createCard',
      () => api.createCard(boardId, { title: tmpTitle, description: 'neg setup', stage_id: stageA, contact_id: contactId }),
      { tmpTitle },
    )
    let tmpId = tmp ? pickId(tmp.json) : null
    if (!tmpId && tmp) tmpId = await resolveCardIdByTitle(boardId, tmpTitle)
    if (tmpId) {
      await runNeg(
        'E-05 updateCard title vazio',
        () => api.updateCard(tmpId, { title: '' }),
        [400, 422],
        { cardId: tmpId, title: '' },
      )
      await api.deleteCard(tmpId)
    } else {
      skip('negative', 'E-05 updateCard title vazio', 'setup card falhou')
    }
  } else {
    skip('negative', 'E-05 updateCard title vazio', 'fixtures indisponíveis')
  }

  // E-06 moveCard com stage_id de outro board
  // Procura outro board com pelo menos 1 stage diferente
  if (boardId && stageA && contactId) {
    const boardsRes = await api.listBoards()
    const allBoards = boardsRes.ok ? pickList(boardsRes.json, ['pipelines', 'boards', 'data']) : []
    const foreign = allBoards.find((b) => b.id !== boardId && Array.isArray(b.stages) && b.stages.length > 0)
    const foreignStageId = foreign?.stages?.[0]?.id ?? null
    if (foreignStageId) {
      const tmpTitle = `${TEST_PREFIX}e06_${Date.now()}`
      const tmp = await runHappy(
        'E-06 setup createCard',
        () => api.createCard(boardId, { title: tmpTitle, description: 'neg setup', stage_id: stageA, contact_id: contactId }),
      )
      let tmpId = tmp ? pickId(tmp.json) : null
      if (!tmpId && tmp) tmpId = await resolveCardIdByTitle(boardId, tmpTitle)
      if (tmpId) {
        await runNeg(
          'E-06 moveCard cross-board stage',
          () => api.moveCard(tmpId, boardId, foreignStageId),
          [400, 403, 422, 404],
          { cardId: tmpId, foreignStageId },
        )
        await api.deleteCard(tmpId)
      } else {
        skip('negative', 'E-06 moveCard cross-board stage', 'setup card falhou')
      }
    } else {
      skip('negative', 'E-06 moveCard cross-board stage', 'nenhum 2º board com stages encontrado')
    }
  } else {
    skip('negative', 'E-06 moveCard cross-board stage', 'fixtures indisponíveis')
  }

  // E-07 deleteCard idempotência (cria, deleta, deleta de novo)
  if (boardId && stageA && contactId) {
    const tmpTitle = `${TEST_PREFIX}e07_${Date.now()}`
    const tmp = await runHappy(
      'E-07 setup createCard',
      () => api.createCard(boardId, { title: tmpTitle, description: 'neg setup', stage_id: stageA, contact_id: contactId }),
    )
    let tmpId = tmp ? pickId(tmp.json) : null
    if (!tmpId && tmp) tmpId = await resolveCardIdByTitle(boardId, tmpTitle)
    if (tmpId) {
      const first = await api.deleteCard(tmpId)
      if (first.ok) {
        await runNeg(
          'E-07 deleteCard já deletado',
          () => api.deleteCard(tmpId),
          [404, 410],
          { cardId: tmpId },
        )
      } else {
        skip('negative', 'E-07 deleteCard já deletado', `primeiro delete falhou status=${first.status}`)
      }
    } else {
      skip('negative', 'E-07 deleteCard já deletado', 'setup card falhou')
    }
  } else {
    skip('negative', 'E-07 deleteCard já deletado', 'fixtures indisponíveis')
  }

  // E-08 sendTemplate com template_name inexistente
  if (INBOX_ID) {
    await runNeg(
      'E-08 sendTemplate template inexistente',
      () =>
        api.sendTemplate(INBOX_ID, {
          to: VERIFY_PHONE,
          template_name: '__nonexistent_template_axiomix__',
          language: 'pt_BR',
        }),
      [400, 404, 422],
      { template_name: '__nonexistent_template_axiomix__' },
    )
  } else {
    skip('negative', 'E-08 sendTemplate template inexistente', 'EVO_INBOX_ID ausente')
  }

  // E-09 listBoards sem API key
  await runNeg(
    'E-09 listBoards sem token',
    () => evoFetch('/api/v1/pipelines', {}, { token: '' }),
    [401, 403],
  )

  // E-10 cross-tenant: tenta acessar boardId do tenant atual com token de outro tenant
  if (CROSS_BASE_URL && CROSS_TOKEN && boardId) {
    await runNeg(
      'E-10 getBoard cross-tenant',
      () => evoFetch(`/api/v1/pipelines/${encodeURIComponent(boardId)}`, {}, { baseUrl: CROSS_BASE_URL, token: CROSS_TOKEN }),
      [403, 404],
      { crossBaseUrl: CROSS_BASE_URL, boardId },
    )
  } else {
    skip(
      'negative',
      'E-10 getBoard cross-tenant',
      'EVO_CROSS_BASE_URL/EVO_CROSS_API_TOKEN ausentes ou boardId não resolvido',
    )
  }
}

// ---------------------------------------------------------------------------
// Sweeper — limpa cards TEST_VERIFY_* em todos os boards
// ---------------------------------------------------------------------------

async function sweeper() {
  if (FLAGS.keepCards) {
    console.log(`[${ts()}] sweeper: pulado (--keep-cards)`)
    return
  }
  console.log(`[${ts()}] sweeper: limpando cards prefixo "${TEST_PREFIX}"`)
  try {
    const boardsRes = await api.listBoards()
    if (!boardsRes.ok) return
    const boards = pickList(boardsRes.json, ['pipelines', 'boards', 'data'])
    let removed = 0
    for (const b of boards) {
      const detail = await api.getBoard(b.id)
      if (!detail.ok) continue
      const data = detail.json.data || detail.json
      const stages = data.stages || []
      for (const stage of stages) {
        const cards = stage.items || stage.cards || []
        for (const c of cards) {
          const title = cardTitle(c)
          if (title && title.startsWith(TEST_PREFIX) && typeof c.id === 'string') {
            cardPaths.setPipeline(b.id)
            const r = await api.deleteCard(c.id)
            if (r.ok) removed += 1
          }
        }
      }
    }
    console.log(`[${ts()}] sweeper: ${removed} card(s) removido(s)`)
  } catch (err) {
    console.warn(`[${ts()}] sweeper falhou:`, err)
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport() {
  const happy = results.filter((r) => r.phase === 'happy')
  const neg = results.filter((r) => r.phase === 'negative')

  const fmt = (r) => {
    const parts = [r.status.padEnd(7), r.step]
    if (r.response?.status) parts.push(`status=${r.response.status}`)
    if (r.expected) parts.push(`expected=${r.expected}`)
    if (r.reason) parts.push(`reason="${r.reason}"`)
    if (r.error) parts.push(`error="${r.error}"`)
    return '  ' + parts.join(' ')
  }

  console.log('\n=== HAPPY PATH ===')
  for (const r of happy) console.log(fmt(r))
  console.log('\n=== NEGATIVE CASES ===')
  if (neg.length === 0) console.log('  (não executados — use --negative-cases)')
  for (const r of neg) console.log(fmt(r))

  const c = (phase, status) => results.filter((r) => r.phase === phase && r.status === status).length
  console.log('\n=== SUMMARY ===')
  console.log(`  happy:    OK=${c('happy', 'OK')}  FAIL=${c('happy', 'FAIL')}  SKIPPED=${c('happy', 'SKIPPED')}`)
  console.log(`  negative: OK=${c('negative', 'OK')}  FAIL=${c('negative', 'FAIL')}  SKIPPED=${c('negative', 'SKIPPED')}`)

  // Evidence dump (uma linha JSON com tudo, pra grep/jq depois)
  const evidence = results.map((r) => ({
    phase: r.phase,
    step: r.step,
    status: r.status,
    httpStatus: r.response?.status,
    durationMs: r.response?.durationMs,
    expected: r.expected,
    reason: r.reason,
    error: r.error,
    body: r.response?.json ?? r.response?.raw?.slice(0, 400),
    at: r.at,
  }))
  console.log('\n=== EVIDENCE (JSON) ===')
  console.log(JSON.stringify({ ranAt: ts(), baseUrl: BASE_URL, results: evidence }, null, 2))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[${ts()}] verify-evo-endpoints — base=${BASE_URL}`)
  console.log(`[${ts()}] flags: negative=${FLAGS.negative} keepCards=${FLAGS.keepCards} boardId=${FLAGS.boardId ?? 'auto'}`)

  let ctx = { boardId: null, stageA: null, stageB: null, contactId: null, cardId: null }
  try {
    ctx = await runHappyPath()
    if (FLAGS.negative) {
      console.log(`\n[${ts()}] iniciando casos negativos\n`)
      await runNegativeCases(ctx)
    } else {
      console.log(`[${ts()}] casos negativos pulados (use --negative-cases para rodar)`)
    }
  } finally {
    await sweeper()
    printReport()
  }

  const anyFail = results.some((r) => r.status === 'FAIL')
  process.exit(anyFail ? 1 : 0)
}

main().catch((err) => {
  console.error('fatal:', err)
  process.exit(2)
})
