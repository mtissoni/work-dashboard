-- Task enrichment table: one row per task from any source
create table task_enrichment (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  source          text not null default 'google_tasks',
  external_id     text not null,
  list_id         text,
  list_name       text,

  -- Enrichment fields (dashboard-only, not pushed to source)
  category        text check (category in ('Client','Internal','Sales','AI Studio','Content','Admin','Personal','Other')),
  priority        text check (priority in ('High','Medium','Low')),
  effort          text check (effort in ('High','Medium','Low')),
  status_custom   text check (status_custom in ('Not Started','In Progress','Waiting','Blocked','Done'))
                    default 'Not Started',
  next_action     text,
  related_entity  text,

  -- Cached from source (refreshed on sync)
  title           text,
  notes           text,
  due_date        date,
  google_status   text,
  google_updated_at timestamptz,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  unique(user_id, source, external_id)
);

create index idx_enrichment_user_source on task_enrichment(user_id, source);
create index idx_enrichment_category on task_enrichment(category);
create index idx_enrichment_due_date on task_enrichment(due_date);

-- Row Level Security
alter table task_enrichment enable row level security;

create policy "Users can read own tasks"
  on task_enrichment for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on task_enrichment for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on task_enrichment for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on task_enrichment for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger task_enrichment_updated_at
  before update on task_enrichment
  for each row execute function update_updated_at();

-- Sync log table
create table sync_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  source     text not null default 'google_tasks',
  synced_at  timestamptz default now(),
  task_count int,
  status     text default 'success'
);

alter table sync_log enable row level security;

create policy "Users can read own sync logs"
  on sync_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own sync logs"
  on sync_log for insert
  with check (auth.uid() = user_id);
