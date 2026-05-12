-- Recurring task templates
create table recurring_template (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- Task definition
  title               text not null,
  notes               text,
  list_id             text not null,
  list_name           text,

  -- Default enrichment (applied to generated tasks)
  category            text check (category in ('Client','Internal','Sales','AI Studio','Content','Admin','Personal','Other')),
  priority            text check (priority in ('High','Medium','Low')),
  effort              text check (effort in ('High','Medium','Low')),

  -- Recurrence rule (simple JSON)
  -- { "type": "daily" }
  -- { "type": "weekly", "days": [1, 3, 5] }  -- 0=Sun..6=Sat
  -- { "type": "monthly", "day_of_month": 15 }
  recurrence_rule     jsonb not null,

  -- State tracking
  enabled             boolean not null default true,
  last_generated_date date,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index idx_recurring_template_user on recurring_template(user_id);
create index idx_recurring_template_enabled on recurring_template(user_id, enabled) where enabled = true;

alter table recurring_template enable row level security;

create policy "Users can read own templates"
  on recurring_template for select using (auth.uid() = user_id);
create policy "Users can insert own templates"
  on recurring_template for insert with check (auth.uid() = user_id);
create policy "Users can update own templates"
  on recurring_template for update using (auth.uid() = user_id);
create policy "Users can delete own templates"
  on recurring_template for delete using (auth.uid() = user_id);

create trigger recurring_template_updated_at
  before update on recurring_template
  for each row execute function update_updated_at();

-- Audit trail linking generated tasks back to templates
create table recurring_task_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  template_id     uuid not null references recurring_template(id) on delete cascade,
  generated_date  date not null,
  external_id     text not null,
  created_at      timestamptz default now(),

  unique(template_id, generated_date)
);

create index idx_recurring_log_template on recurring_task_log(template_id);
create index idx_recurring_log_external on recurring_task_log(external_id);

alter table recurring_task_log enable row level security;

create policy "Users can read own logs"
  on recurring_task_log for select using (auth.uid() = user_id);
create policy "Users can insert own logs"
  on recurring_task_log for insert with check (auth.uid() = user_id);
