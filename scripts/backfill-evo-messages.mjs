/**
 * Arquivo: scripts/backfill-evo-messages.mjs
 * Propósito: Reparar messages com sent_at colapsado e popular external_id ausente,
 *            puxando o estado real do Evo CRM e fazendo match por (direction, content, ordinal).
 *
 * Estratégia:
 *   1. Para cada conversa local com mensagens, pega lista do Evo CRM.
 *   2. Faz match conservador: agrupa por (direction, content) e ordena ambas as listas;
 *      o N-ésimo match do mesmo (direction, content) local recebe external_id + sent_at do N-ésimo no Evo.
 *   3. Mensagens locais sem match (ex.: activity events ou content diferente) ficam intactas.
 *   4. Mensagens do Evo que NÃO têm correspondente local são INSERIDAS (recupera msgs perdidas).
 *
 * Read-write: faz UPDATE em messages e INSERT de msgs faltantes. Idempotente (skip se external_id já populado).
 *
 * Uso:
 *   node scripts/backfill-evo-messages.mjs                  # processa todas companies com evo_crm
 *   node scripts/backfill-evo-messages.mjs --dry-run        # mostra o que faria, não escreve
 *   node scripts/backfill-evo-messages.mjs --company <uuid> # foca em uma company
 *   node scripts/backfill-evo-messages.mjs --conversation <externalId> # foca em uma conversa
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

try {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
} catch (e) {
  console.error('.env.local:', e.message); process.exit(2)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EVO_BASE = (process.env.EVO_CRM_BASE_URL || '').replace(/\/+$/, '')
const EVO_TOKEN = process.env.EVO_CRM_API_TOKEN

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Supabase env ausente'); process.exit(2) }
if (!EVO_BASE || !EVO_TOKEN) { console.error('Evo CRM env ausente'); process.exit(2) }

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run')
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null }
const ONLY_COMPANY = flag('company')
const ONLY_CONV = flag('conversation')

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const c = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m' }

function normalizeContent(v) {
  return (v ?? '').toString().trim()
}

function evoSentAt(m) {
  const r = m.created_at ?? m.createdAt ?? m.sent_at ?? m.timestamp
  if (typeof r === 'string') {
    const t = r.trim()
    if (/^\d+$/.test(t)) {
      const n = Number(t)
      return new Date(n < 1e12 ? n * 1000 : n).toISOString()
    }
    return t
  }
  if (typeof r === 'number' && r > 0) {
    return new Date(r < 1e12 ? r * 1000 : r).toISOString()
  }
  return null
}

function evoDirection(m) {
  if (typeof m.from_me === 'boolean') return m.from_me ? 'outbound' : 'inbound'
  const t = (m.message_type || '').toString().toLowerCase()
  if (t === 'outgoing') return 'outbound'
  if (t === 'incoming') return 'inbound'
  return null
}

async function processConversation(conv) {
  console.log(`\n${c.bold}── ${conv.contact_name ?? conv.external_id}${c.reset}  (${conv.external_id})`)

  // 1. mensagens locais
  const { data: localMsgs, error: lErr } = await supabase
    .from('messages')
    .select('id, external_id, direction, content, sent_at, message_type')
    .eq('conversation_id', conv.id)
    .order('sent_at', { ascending: true })
  if (lErr) { console.log(c.red, 'erro local:', lErr.message, c.reset); return }

  // 2. mensagens no Evo CRM
  let evoMsgs = []
  try {
    const url = `${EVO_BASE}/api/v1/conversations/${conv.external_id}/messages?limit=300`
    const r = await fetch(url, { headers: { api_access_token: EVO_TOKEN, accept: 'application/json' } })
    if (!r.ok) { console.log(c.red, `Evo ${r.status}`, c.reset); return }
    const body = await r.json()
    const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : Array.isArray(body.messages) ? body.messages : []
    evoMsgs = list.map((m) => ({
      id: String(m.id ?? m.message_id ?? ''),
      direction: evoDirection(m),
      content: normalizeContent(m.content ?? m.body),
      sent_at: evoSentAt(m),
      message_type: (m.message_type || '').toString().toLowerCase() || null,
    })).filter((m) => m.id)
  } catch (e) { console.log(c.red, 'erro evo:', e.message, c.reset); return }

  console.log(`  local: ${localMsgs.length}  evo: ${evoMsgs.length}`)

  // 3. agrupar por (direction, normalized content), ignorar activity events
  const groupKey = (m) => `${m.direction}::${normalizeContent(m.content)}`
  const evoByKey = new Map()
  for (const m of evoMsgs) {
    if (m.message_type === 'activity') continue
    if (!m.direction) continue
    if (!evoByKey.has(groupKey(m))) evoByKey.set(groupKey(m), [])
    evoByKey.get(groupKey(m)).push(m)
  }

  const updates = []
  const usedEvoIds = new Set()
  for (const lm of localMsgs) {
    if (lm.external_id) {
      usedEvoIds.add(lm.external_id)
      continue
    }
    if ((lm.message_type ?? '').toLowerCase() === 'activity') continue
    const key = groupKey({ direction: lm.direction, content: lm.content })
    const candidates = evoByKey.get(key) ?? []
    const match = candidates.find((m) => !usedEvoIds.has(m.id))
    if (!match) continue
    usedEvoIds.add(match.id)
    updates.push({ id: lm.id, external_id: match.id, sent_at: match.sent_at })
  }

  // 4. msgs Evo sem correspondente local → INSERT (perdidas pelo webhook quebrado)
  const inserts = []
  for (const em of evoMsgs) {
    if (em.message_type === 'activity') continue
    if (!em.direction) continue
    if (usedEvoIds.has(em.id)) continue
    inserts.push({
      company_id: conv.company_id,
      conversation_id: conv.id,
      external_id: em.id,
      content: em.content,
      direction: em.direction,
      sent_at: em.sent_at ?? new Date().toISOString(),
      message_type: em.message_type,
    })
  }

  console.log(`  ${c.green}updates: ${updates.length}${c.reset}  ${c.yellow}inserts (msgs perdidas): ${inserts.length}${c.reset}`)
  if (DRY) {
    for (const u of updates.slice(0, 3)) console.log(`    ${c.dim}UPDATE id=${u.id.slice(0, 8)} → ext=${u.external_id.slice(0, 8)} sent_at=${u.sent_at}${c.reset}`)
    for (const i of inserts.slice(0, 3)) console.log(`    ${c.dim}INSERT ${i.direction} "${i.content.slice(0, 40)}" sent_at=${i.sent_at}${c.reset}`)
    return
  }

  for (const u of updates) {
    const { error } = await supabase.from('messages').update({ external_id: u.external_id, sent_at: u.sent_at }).eq('id', u.id)
    if (error) console.log(c.red, '  update fail:', error.message, c.reset)
  }
  if (inserts.length) {
    const { error } = await supabase.from('messages').insert(inserts)
    if (error) console.log(c.red, '  insert fail:', error.message, c.reset)
  }

  // 5. recalcular last_message_at = max(sent_at)
  const allMsgs = [...localMsgs.map((m) => ({ id: m.id, sent_at: m.sent_at })), ...inserts]
  const updated = updates.reduce((acc, u) => { acc.set(u.id, u.sent_at); return acc }, new Map())
  const maxSent = allMsgs
    .map((m) => updated.get(m.id) ?? m.sent_at)
    .filter(Boolean)
    .sort()
    .pop()
  if (maxSent) {
    await supabase.from('conversations').update({ last_message_at: maxSent }).eq('id', conv.id)
  }
}

async function main() {
  console.log(`${c.bold}Backfill evo messages${DRY ? ' [DRY-RUN]' : ''}${c.reset}`)
  let q = supabase.from('conversations').select('id, company_id, external_id, contact_name')
  if (ONLY_COMPANY) q = q.eq('company_id', ONLY_COMPANY)
  if (ONLY_CONV) q = q.eq('external_id', ONLY_CONV)
  else q = q.order('last_message_at', { ascending: false, nullsFirst: false })
  const { data: convs, error } = await q.limit(500)
  if (error) { console.error('erro:', error.message); process.exit(1) }

  // se não filtrar, só processar conversas de companies com integração evo_crm ativa
  let allowedCompanies = null
  if (!ONLY_COMPANY) {
    const { data: integs } = await supabase.from('integrations').select('company_id').eq('type', 'evo_crm').eq('is_active', true)
    allowedCompanies = new Set((integs ?? []).map((x) => x.company_id))
  }

  let processed = 0
  for (const conv of convs) {
    if (allowedCompanies && !allowedCompanies.has(conv.company_id)) continue
    await processConversation(conv)
    processed++
    await new Promise((r) => setTimeout(r, 200))
  }
  console.log(`\n${c.green}Done. ${processed} conversas processadas.${c.reset}`)
}

main().catch((e) => { console.error('fatal:', e); process.exit(1) })
