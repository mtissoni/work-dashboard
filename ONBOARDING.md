# Work Dashboard — Onboarding Guide

This guide gets Claude Code up to speed on Marcelo's personal work assistant project.

## What This Is

A personal work dashboard that centralizes tasks, email triage, and (eventually) calendar, Slack, audio notes, document generation, and AI-powered briefings. Currently in Phase 1 with two modules live:

1. **Google Tasks** — Sync, enrich with custom fields (category, priority, effort), multiple views, write-back
2. **Gmail Triage** — Inbox sync, actionable email detection, archive/star/mark-read/create-task actions, dashboard widget

## Repo & Setup

**Repo:** `gh repo clone mtissoni/work-dashboard` (private GitHub)

**Stack:** React 19 + Vite 8, TypeScript 6, Tailwind CSS v4, Supabase (PostgreSQL + Auth + RLS)

**To run locally:**
```bash
npm install
# Create .env.local with:
#   VITE_SUPABASE_URL=https://ywrshvhjefrewobachke.supabase.co
#   VITE_SUPABASE_ANON_KEY=<ask Marcelo>
npm run dev          # localhost:5173
npm run build        # TypeScript check + production build
```

**Windows caveat:** Use `npm.cmd` instead of `npm` if PowerShell blocks `.ps1` scripts. Refresh PATH before Node commands:
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "User") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
```

## Core Architecture

**Data flow:** Google APIs (Tasks, Gmail) are source of truth. Supabase is a cache + enrichment layer.
- **Sync** fetches from Google → upserts into Supabase (preserving user enrichment columns)
- **UI** reads exclusively from Supabase
- **Write-back** hits Google API first, then updates Supabase cache
- Upserts use `onConflict` with natural keys, never overwrite enrichment fields

**Auth:** Supabase Google OAuth. `provider_token` captured on sign-in, stored in localStorage. On 401 from Google, call `refreshGoogleToken()` → `supabase.auth.refreshSession()`. All Google API callers must handle this.

**Routing:** State-based (`currentView: ViewType` in App.tsx), not React Router. Views: dashboard, inbox, lists, today, all, overdue, category.

## Key Tables

- **`task_enrichment`** — Google Tasks cache + enrichment (category, priority, effort, status_custom). Key: `(user_id, source, external_id)`. `source` field supports future multi-source.
- **`email_cache`** — Gmail metadata + actionable flags + triage state. Key: `(user_id, gmail_id)`. `linked_task_id` FK for email→task.
- All tables have RLS: `auth.uid() = user_id`. Migrations in `supabase/migrations/`.

## Module Map

- `src/lib/sync/` — Google Tasks API + sync engine
- `src/lib/gmail/` — Gmail API, header parser, sync, actionable rules (blocklist in `actionable-rules.ts`)
- `src/hooks/` — useAuth, useTasks, useSync, useEmailSync, useGmail
- `src/views/` — Page components per ViewType
- `src/components/` — Shared UI (tables, rows, panels, sidebar, filters)
- `src/types/index.ts` — All types + const arrays for enum dropdowns

## What's Next

Planned modules (not yet built): Google Calendar integration, Slack monitoring, audio notes, document generation, social media planning, daily AI briefings. The `source` + `external_id` pattern in `task_enrichment` is designed to absorb new data sources without schema changes.

## Pending Setup Steps (if not done yet)

These are one-time steps that may still need to be completed:
1. Enable **Gmail API** in Google Cloud Console
2. Add `gmail.modify` scope to OAuth consent screen
3. Run `supabase/migrations/003_email_cache.sql` in Supabase SQL Editor
4. Sign out and back in to grant the new Gmail scope
