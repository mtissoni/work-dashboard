-- Email cache table: stores inbox metadata for fast rendering + triage state
create table email_cache (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  gmail_id        text not null,
  thread_id       text not null,
  subject         text,
  sender_name     text,
  sender_email    text,
  snippet         text,
  received_at     timestamptz not null,
  label_ids       text[] default '{}',
  is_unread       boolean default true,
  is_starred      boolean default false,
  is_actionable   boolean default false,
  action_reason   text,
  triaged_at      timestamptz,
  triage_action   text,
  linked_task_id  uuid references task_enrichment(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, gmail_id)
);

create index idx_email_user on email_cache(user_id);
create index idx_email_thread on email_cache(user_id, thread_id);
create index idx_email_actionable on email_cache(user_id, is_actionable) where is_actionable = true;
create index idx_email_unread on email_cache(user_id, is_unread) where is_unread = true;
create index idx_email_received on email_cache(received_at desc);

alter table email_cache enable row level security;

create policy "Users can read own emails"
  on email_cache for select using (auth.uid() = user_id);

create policy "Users can insert own emails"
  on email_cache for insert with check (auth.uid() = user_id);

create policy "Users can update own emails"
  on email_cache for update using (auth.uid() = user_id);

create policy "Users can delete own emails"
  on email_cache for delete using (auth.uid() = user_id);

create trigger email_cache_updated_at
  before update on email_cache
  for each row execute function update_updated_at();
