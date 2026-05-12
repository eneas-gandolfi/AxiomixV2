/**
 * Arquivo: scripts/diag-evo-sync.mjs
 * Propósito: Diagnosticar divergência de sync de conversas entre Evo CRM e Axiomix.
 *            Executa as etapas E1-E6 do plano em /Users/Eneas/.claude/plans/as-conversas-n-o-est-o-quiet-sky.md
 * Read-only: não escreve em banco nem no Evo CRM.
 *
 * Uso:
 *   node scripts/diag-evo-sync.mjs
 *   node scripts/diag-evo-sync.mjs --contact "Edi"            # filtro por nome de contato
 *   node scripts/diag-evo-sync.mjs --company <uuid>           # foca em um company_id
 *   node scripts/diag-evo-sync.mjs --conversation <externalId># foca em uma conversa específica
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Parse .env.local manually (dotenv não está nas deps).
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
  console.error('Não consegui ler .env.local:', e.message)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERRO: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios em .env.local')
  process.exit(2)
}

const argv = process.argv.slice(2)
function flag(name) {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null
}
const FILTER_CONTACT = flag('contact') ?? 'edi'
const FILTER_COMPANY = flag('company')
const FILTER_CONV = flag('conversation')

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
}
const h1 = (s) => console.log(`\n${c.bold}${c.cyan}━━━ ${s} ${'━'.repeat(Math.max(0, 60 - s.length))}${c.reset}`)
const h2 = (s) => console.log(`\n${c.bold}${s}${c.reset}`)
const ok = (s) => console.log(`${c.green}✓${c.reset} ${s}`)
const warn = (s) => console.log(`${c.yellow}⚠${c.reset} ${s}`)
const bad = (s) => console.log(`${c.red}✗${c.reset} ${s}`)
const info = (s) => console.log(`  ${c.dim}${s}${c.reset}`)

async function main() {
  h1('Diagnóstico Evo CRM ↔ Axiomix')
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log(`Filtro contato: "${FILTER_CONTACT}"`)
  if (FILTER_COMPANY) console.log(`Filtro company: ${FILTER_COMPANY}`)
  if (FILTER_CONV) console.log(`Filtro conversation external_id: ${FILTER_CONV}`)

  // ─── E6: integrações ───
  h1('E6: Integrações Evo CRM ativas')
  let { data: integrations, error: intErr } = await supabase
    .from('integrations')
    .select('id, company_id, type, is_active, last_tested_at, test_status, config, created_at')
    .eq('type', 'evo_crm')
  if (intErr) { bad(`Erro listando integrations: ${intErr.message}`); process.exit(1) }
  if (FILTER_COMPANY) integrations = integrations.filter((i) => i.company_id === FILTER_COMPANY)
  if (!integrations.length) { bad('Nenhuma integração evo_crm encontrada.'); process.exit(1) }

  for (const integ of integrations) {
    const cfg = integ.config ?? {}
    const conf = (cfg.encrypted_config && typeof cfg === 'object') ? cfg : cfg
    console.log(`\n  Company: ${integ.company_id}`)
    console.log(`  Integração id: ${integ.id}  active: ${integ.is_active}  test_status: ${integ.test_status ?? '-'}`)
    info(`baseUrl:       ${conf.baseUrl ?? conf.base_url ?? '(ausente)'}`)
    info(`webhookUrl:    ${conf.webhookUrl ?? conf.webhook_url ?? '(ausente)'}`)
    info(`hasToken:      ${conf.apiAccessToken || conf.api_access_token ? 'sim' : 'NÃO'}`)
    info(`hasSecret:     ${conf.webhookSecret || conf.webhook_secret ? 'sim' : 'NÃO'}`)
    info(`syncInboxIds:  ${JSON.stringify(conf.syncInboxIds ?? conf.sync_inbox_ids ?? null)}`)
    info(`last_tested:   ${integ.last_tested_at ?? '-'}`)
    info(`created_at:    ${integ.created_at}`)
  }

  // pick target company (first or filtered)
  const target = integrations[0]
  const COMPANY = target.company_id
  const cfg = target.config ?? {}
  const EVO_BASE = cfg.baseUrl ?? cfg.base_url ?? process.env.EVO_CRM_BASE_URL
  const EVO_TOKEN = cfg.apiAccessToken ?? cfg.api_access_token ?? process.env.EVO_CRM_API_TOKEN
  const EVO_SECRET = cfg.webhookSecret ?? cfg.webhook_secret ?? process.env.EVO_CRM_WEBHOOK_SECRET

  // ─── E5: jobs de sync recentes ───
  h1('E5: Últimos jobs evo_crm_sync')
  const { data: jobs, error: jobsErr } = await supabase
    .from('async_jobs')
    .select('id, status, attempts, max_attempts, started_at, completed_at, error_message, result, scheduled_for, created_at')
    .eq('company_id', COMPANY)
    .eq('job_type', 'evo_crm_sync')
    .order('created_at', { ascending: false })
    .limit(10)
  if (jobsErr) {
    bad(`Erro listando async_jobs: ${jobsErr.message}`)
  } else if (!jobs.length) {
    bad('Nenhum job evo_crm_sync encontrado para esta company → H7 forte (cron não roda).')
  } else {
    for (const j of jobs) {
      const tag = j.status === 'failed' ? `${c.red}FAILED${c.reset}` :
                  j.status === 'done' ? `${c.green}done${c.reset}` :
                  j.status === 'running' ? `${c.yellow}running${c.reset}` :
                  `${c.dim}${j.status}${c.reset}`
      console.log(`  ${tag} ${j.created_at}  attempts=${j.attempts}/${j.max_attempts}`)
      if (j.error_message) info(`error: ${j.error_message}`)
      if (j.result) info(`result: ${JSON.stringify(j.result).slice(0, 200)}`)
    }
    const lastDone = jobs.find((j) => j.status === 'done')
    if (lastDone) {
      const ageMin = Math.round((Date.now() - new Date(lastDone.completed_at ?? lastDone.created_at).getTime()) / 60000)
      info(`último 'done' há ${ageMin} min`)
      if (ageMin > 60) warn(`> 60 min sem sucesso → cron pode estar quebrado (H7)`)
    }
  }

  // ─── E1: conversa "Edi" ───
  h1('E1: Conversa(s) no Axiomix matching contato')
  let convQ = supabase
    .from('conversations')
    .select('id, external_id, contact_name, contact_phone, remote_jid, status, last_message_at, last_synced_at, created_at, assigned_to, labels')
    .eq('company_id', COMPANY)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(10)
  if (FILTER_CONV) {
    convQ = convQ.eq('external_id', FILTER_CONV)
  } else {
    convQ = convQ.or(`contact_name.ilike.%${FILTER_CONTACT}%,contact_phone.ilike.%${FILTER_CONTACT}%`)
  }
  const { data: convs, error: convErr } = await convQ
  if (convErr) { bad(`Erro listando conversations: ${convErr.message}`); process.exit(1) }
  if (!convs.length) {
    bad(`Nenhuma conversa Axiomix com contato matching "${FILTER_CONTACT}".`)
    warn(`Hipótese H1/H3/H5: conversa nunca chegou ao Axiomix (race, inbox filter, ou webhook quebrado).`)
  } else {
    for (const cv of convs) {
      console.log(`  ${c.bold}${cv.contact_name ?? '(sem nome)'}${c.reset}  ext_id=${cv.external_id}`)
      info(`phone: ${cv.contact_phone ?? '-'}  remote_jid: ${cv.remote_jid}`)
      info(`status: ${cv.status}  last_message_at: ${cv.last_message_at}  last_synced_at: ${cv.last_synced_at}`)
    }
  }

  const targetConv = convs[0]
  if (!targetConv) {
    h1('Sem conversa local — pulando E2/E4')
  } else {
    // ─── E4: análise de raw_payload (origem das mensagens) ───
    h1(`E4: raw_payload das mensagens (conversation ${targetConv.external_id})`)
    const { data: msgs, error: msgErr } = await supabase
      .from('messages')
      .select('id, external_id, direction, content, sent_at, message_type, raw_payload')
      .eq('conversation_id', targetConv.id)
      .order('sent_at', { ascending: true })
      .limit(200)
    if (msgErr) { bad(`Erro listando messages: ${msgErr.message}`) }
    else {
      console.log(`  Total no Axiomix: ${msgs.length}`)
      const withRaw = msgs.filter((m) => m.raw_payload).length
      const withExtId = msgs.filter((m) => m.external_id).length
      info(`com raw_payload (veio do webhook): ${withRaw}/${msgs.length}`)
      info(`com external_id (idempotência ok): ${withExtId}/${msgs.length}`)
      if (msgs.length && withRaw === 0) warn('Nenhuma msg com raw_payload → todas vieram do cron, não do webhook (H1/H5 provável)')
      console.log()
      for (const m of msgs.slice(-10)) {
        const arrow = m.direction === 'outbound' ? '→' : '←'
        const src = m.raw_payload ? 'webhook' : 'cron'
        const ext = m.external_id ? m.external_id.slice(0, 8) : c.red + 'sem-ext-id' + c.reset
        console.log(`  ${arrow} ${m.sent_at}  [${src}]  ${ext}  ${(m.content || '').slice(0, 50)}`)
      }

      // ─── E2: diff contra Evo CRM ───
      h1('E2: Diff de mensagens (Evo CRM vs Axiomix)')
      if (!EVO_BASE || !EVO_TOKEN) {
        warn('EVO_BASE/EVO_TOKEN ausente — pulando diff')
      } else {
        try {
          const evoUrl = `${EVO_BASE.replace(/\/+$/, '')}/api/v1/conversations/${targetConv.external_id}/messages?limit=300`
          const resp = await fetch(evoUrl, {
            headers: { api_access_token: EVO_TOKEN, accept: 'application/json' },
          })
          if (!resp.ok) {
            bad(`Evo CRM ${resp.status} ${resp.statusText} em ${evoUrl}`)
            const text = await resp.text()
            info(text.slice(0, 300))
          } else {
            const body = await resp.json()
            const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : Array.isArray(body.messages) ? body.messages : []
            console.log(`  Total no Evo CRM: ${list.length}`)
            const evoIds = new Set(list.map((m) => String(m.id ?? m.message_id ?? '')).filter(Boolean))
            const axIds = new Set(msgs.map((m) => m.external_id).filter(Boolean))
            const onlyInEvo = [...evoIds].filter((id) => !axIds.has(id))
            const onlyInAx = [...axIds].filter((id) => !evoIds.has(id))
            console.log(`  ${c.bold}Mensagens só no Evo${c.reset} (não chegaram no Axiomix): ${onlyInEvo.length}`)
            if (onlyInEvo.length) {
              warn(`Validates H1/H4/H5. IDs (até 5): ${onlyInEvo.slice(0, 5).join(', ')}`)
              for (const id of onlyInEvo.slice(0, 5)) {
                const m = list.find((x) => String(x.id ?? x.message_id) === id)
                if (m) info(`  ${m.created_at ?? m.timestamp ?? '?'}  ${m.message_type ?? '?'}  ${(m.content ?? m.body ?? '').toString().slice(0, 60)}`)
              }
            } else {
              ok('Todas as mensagens do Evo estão no Axiomix.')
            }
            console.log(`  Mensagens só no Axiomix (Evo deletou ou Axiomix duplicou): ${onlyInAx.length}`)
            if (onlyInAx.length) warn(`Validates H6 (sem dedupe). IDs (até 5): ${onlyInAx.slice(0, 5).join(', ')}`)

            // Estado da conversa Evo
            const evoConvUrl = `${EVO_BASE.replace(/\/+$/, '')}/api/v1/conversations/${targetConv.external_id}`
            const r2 = await fetch(evoConvUrl, { headers: { api_access_token: EVO_TOKEN } })
            if (r2.ok) {
              const ec = await r2.json()
              const ecd = ec.data ?? ec
              console.log(`\n  ${c.bold}Estado no Evo CRM${c.reset}`)
              info(`status: ${ecd.status}  last_message_at: ${ecd.last_message_at ?? ecd.last_activity_at}`)
              info(`contact_name: ${ecd.contact?.name}  phone: ${ecd.contact?.phone_number ?? ecd.contact?.phone_e164}`)
              if (ecd.status !== targetConv.status) warn(`Status divergente: Axiomix=${targetConv.status} Evo=${ecd.status} → H2 se 'open' vs 'resolved'`)
            }
          }
        } catch (e) {
          bad(`Falha ao chamar Evo CRM: ${e.message}`)
        }
      }
    }
  }

  // ─── E3: webhooks ativos no Evo CRM ───
  h1('E3: Webhooks configurados no Evo CRM')
  if (!EVO_BASE || !EVO_TOKEN) {
    warn('EVO_BASE/EVO_TOKEN ausente — pulando')
  } else {
    try {
      const url = `${EVO_BASE.replace(/\/+$/, '')}/api/v1/webhooks`
      const resp = await fetch(url, { headers: { api_access_token: EVO_TOKEN } })
      if (!resp.ok) {
        bad(`Evo CRM ${resp.status} ${resp.statusText} em ${url}`)
        const text = await resp.text()
        info(text.slice(0, 300))
      } else {
        const body = await resp.json()
        const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : []
        console.log(`  Total webhooks: ${list.length}`)
        for (const w of list) {
          console.log(`  • id=${w.id}  url=${w.url}  events=${(w.subscriptions ?? w.events ?? []).join(',')}  active=${w.active ?? w.enabled ?? '?'}`)
        }
        if (!list.length) bad('Nenhum webhook configurado no Evo → H5 confirmado (webhooks nunca disparam)')
      }
    } catch (e) {
      bad(`Falha: ${e.message}`)
    }
  }

  // ─── Sumário ───
  h1('Sumário')
  console.log(`Company alvo: ${COMPANY}`)
  console.log(`Conversa alvo: ${targetConv ? targetConv.external_id : '(nenhuma encontrada)'}`)
  console.log(`Próximo passo: classificar causa raiz (etapa E7) a partir dos sinais acima.`)
}

main().catch((e) => { console.error('Erro fatal:', e); process.exit(1) })
