# Estratégia de renderização — Axiomix

> Decisão de arquitetura sobre como cada segmento do app é renderizado pelo Next.js 16 (estático, dinâmico, ISR). Critério: **multi-tenant não pode vazar dados entre companies**.

## TL;DR

| Segmento | Renderização | Motivo |
|---|---|---|
| `src/app/(app)/**` (autenticado) | `force-dynamic` (via layout) | Multi-tenant — toda página acessa dados do tenant atual via Supabase RLS ou Evo CRM por company. |
| `src/app/(app)/dashboard/demo/**` | `force-dynamic` (explícito por página) | Demo Fashion Center: saudação depende de hora atual + cold leads datados por request. |
| `src/app/(auth)/**` (login, signup, etc.) | default Next.js | Páginas públicas com forms client-side. |
| `src/app/api/**` | dinâmico por natureza (Route Handlers) | N/A. |
| `src/app/page.tsx` (root) | default | Landing page pode ser estática. |
| `src/app/alertas/**`, `src/app/aprovacao/**` | default — **revisar caso a caso** | Não autenticadas. Avaliar se acessam dados de tenant; se sim, anotar `force-dynamic` explicitamente. |

## Decisão para `(app)/`

Declarado em `src/app/(app)/layout.tsx`:

```ts
export const dynamic = "force-dynamic";
```

**Por quê:**

1. **Risco principal — vazamento cross-tenant.** Next 16 mudou semantics de cache. Uma rota que parecia dinâmica (porque lê `cookies()` ou `headers()`) pode ter sido prerenderizada estaticamente e servida ao usuário errado. Caso já documentado no diff que originou o pivot do PR `force-dynamic` no Fashion Center demo.
2. **Default seguro.** Toda nova rota criada sob `(app)/` herda `force-dynamic`. Devs não precisam lembrar de anotar.
3. **Opt-out explícito.** Páginas que comprovadamente não dependem de auth/tenant podem sobrescrever:

   ```ts
   // Caso raro — confirmar que página não lê cookies, headers, ou tabelas RLS-aware
   export const dynamic = "force-static";
   ```

## Decisões por rota crítica (já anotadas)

| Rota | Config | Motivo |
|---|---|---|
| `(app)/dashboard/demo/shopping/page.tsx` | `dynamic = "force-dynamic"` | Saudação por horário (`getGreeting`) muda durante o dia. |
| `(app)/dashboard/demo/loja/[storeId]/page.tsx` | `dynamic = "force-dynamic"` | Cold leads são datados por request (`Date.now()` em `generateColdLeads`); render estático congelaria datas. |
| `(app)/whatsapp-intelligence/pipeline/page.tsx` | herda do layout | Acessa pipeline_items do Evo CRM, multi-tenant. |
| `(app)/whatsapp-intelligence/agentes/**` | herda do layout | Acessa agents do Evo CRM via JWT por sessão. |
| `(app)/whatsapp-intelligence/base-conhecimento/**` | herda do layout | KB por tenant. |
| `(app)/whatsapp-intelligence/equipe/page.tsx` | herda do layout | Equipe (`users` table) por company. |

## Quando reconsiderar

Esta decisão deve ser revisitada se:

1. **Adotarmos Cache Components (Next 16+ experimental).** O modelo muda — `'use cache'` + `cacheTag` permite granularidade por tenant via tags (`tenant:${companyId}`) em vez de `force-dynamic` global. Trade-off: ganho de performance (CDN cache) vs complexidade de invalidação correta.
2. **Métrica de TTFB ficar inaceitável** para páginas estáticas-friendly (ex: landing autenticada com pouco dado). Aí avalia ISR (`revalidate = 60`) com isolamento por cookie.
3. **Migrarmos para edge runtime.** Cookies SSR via `@supabase/ssr` têm nuances em edge — pode precisar de strategy diferente.

## Checklist pra novo PR

Antes de criar uma rota nova:

- [ ] A rota está sob `(app)/`? → herda `force-dynamic` automaticamente.
- [ ] A rota está fora de `(app)/` mas lê dados do usuário/tenant? → adicionar `export const dynamic = "force-dynamic"` explicitamente.
- [ ] A rota é claramente pública e estática? → deixar default ou anotar `force-static` explicitamente (com comentário do motivo).

## Referências

- Memória `project_axiomix_hairpin_fix`: Hostinger VPS + Traefik Swarm.
- Memória `project_evocrm_integration`: dual auth (UUID UUID + JWT) por tenant.
- Memória `project_evocrm_dual_auth`: JWT do `evo-auth-service` é por sessão de usuário.
- Memória `project_dual_migrations_gotcha`: schema drift Supabase pode mascarar RLS.
- Commit `573080b feat(dashboard): Fashion Center demo` — primeira instância documentada de `force-dynamic` por causa de saudação por hora.
