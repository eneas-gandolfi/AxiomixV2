# Dashboard Fluency and Session Stability Design

## Goal

Make the WhatsApp group dashboard faster to scan, reduce accidental logouts, and improve perceived navigation speed without broad product refactors.

## Approved Scope

- Replace the long "Todos os grupos" section with a compact "Grupos em foco" view.
- Show up to 6 priority groups in the dashboard: risk, hot, active, and recent groups first.
- Keep inactive and low-signal groups out of the main reading flow; send users to settings when they need the full administrative list.
- Make "Lembrar-me" selected by default on login.
- Make non-remembered idle timeout less aggressive and show the timer only near expiry.
- Add a focused loading skeleton for the groups dashboard mode.

## UX Rules

- The dashboard is for decisions, not administration.
- The user should understand the next action in the first viewport.
- Cards must stay aligned and avoid long scrolls caused by inactive groups.
- Copy should be short and operational.

## Technical Approach

- Keep the existing `getGroupRadarData` summary intact so counts remain accurate.
- Limit only the visual list rendered by `GroupStatusGrid`.
- Add tests for the 6-item focus behavior and the hidden inactive/low-signal overflow.
- Tune idle constants and login defaults without changing Supabase auth primitives.
- Add a route-level skeleton for `?modo=grupos` to improve navigation feedback.

## Out Of Scope

- New database migrations.
- Full virtualized group administration table.
- Reworking global authentication architecture.
- Deploy automation changes.
