# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint       # ESLint
npm run preview    # Preview production build
```

**Windows note:** On machines where PowerShell blocks `.ps1` scripts, use `npm.cmd` instead of `npm`. Refresh PATH before running Node commands:
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "User") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
```

There are no tests configured yet.

## Environment Setup

Requires `.env.local` in project root (gitignored):
```
VITE_SUPABASE_URL=https://ywrshvhjefrewobachke.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>
```

External services: Supabase (PostgreSQL + Auth), Google Tasks API, Gmail API. OAuth scopes: `tasks` + `gmail.modify`.

## Architecture

**Stack:** React 19 + Vite 8, TypeScript 6, Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config`, use `@import "tailwindcss"` in CSS), Supabase JS SDK.

### Data Flow Pattern

Google APIs are the source of truth. Supabase is a cache + enrichment layer. The pattern is:

1. **Sync** — Fetch from Google API (Tasks or Gmail) → upsert cached fields into Supabase (preserving user-added enrichment columns like category, priority, effort)
2. **Read** — UI reads exclusively from Supabase tables
3. **Write-back** — Mutations (complete task, archive email) call Google API first, then update Supabase cache

This means the upsert in sync must use `onConflict` with the natural key (`user_id,source,external_id` for tasks; `user_id,gmail_id` for emails) and must NOT overwrite enrichment columns.

### Auth

Supabase Google OAuth with `provider_token` captured on `SIGNED_IN` event and stored in `localStorage`. All Google API calls use this token directly. On 401, `refreshGoogleToken()` calls `supabase.auth.refreshSession()` to get a new token — every Google API caller should handle this pattern.

### Key Tables (Supabase)

- **`task_enrichment`** — Cached Google Tasks + user enrichment fields (category, priority, effort, status_custom, next_action). Natural key: `(user_id, source, external_id)`. The `source` field enables future multi-source support.
- **`email_cache`** — Cached Gmail metadata + actionable flags + triage state. Natural key: `(user_id, gmail_id)`. Has `linked_task_id` FK to `task_enrichment` for email→task linking.
- **`sync_log`** — Audit trail of sync operations.

All tables use RLS with `auth.uid() = user_id` policies. Migrations are in `supabase/migrations/`.

### Module Layout

- **`src/lib/sync/`** — Google Tasks API wrapper + sync orchestrator
- **`src/lib/gmail/`** — Gmail API wrapper, header parser, sync engine, actionable-email rules
- **`src/hooks/`** — React hooks: `useAuth` (session + token), `useTasks` (Supabase reads + mutations), `useSync`/`useEmailSync` (sync triggers), `useGmail` (email reads + triage actions)
- **`src/views/`** — Page-level components routed via `ViewType` in App.tsx (no React Router — simple state-based routing)
- **`src/components/`** — Reusable UI: task table/row, email row, detail panels, sidebar, filters

### Routing

No React Router used despite being in dependencies. `App.tsx` holds a `currentView: ViewType` state and renders the matching view. `Sidebar` and `DashboardView` call `onNavigate(view)` to switch. `ViewType` is defined in `src/types/index.ts`.

### Gmail Actionable Rules

`src/lib/gmail/actionable-rules.ts` flags emails as actionable based on: unread from real person (not automated sender), starred, has question in subject/snippet, or stale (unread 2+ days). The `AUTOMATED_SENDERS` blocklist lives there.

## Conventions

- All types in `src/types/index.ts` — both app types and Google API response shapes
- Enum-like values (Category, Priority, Effort, StatusCustom) have both a type and a const array export for UI dropdowns
- Email body rendering uses a sandboxed iframe with `allow-same-origin` (in `EmailDetailPanel`)
- Google API calls are plain `fetch()` against REST endpoints, not a client library
