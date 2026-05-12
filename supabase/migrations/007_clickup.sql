-- User settings (stores ClickUp API token and future per-user config)
create table user_settings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade unique,
  clickup_api_token   text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users can read own settings"
  on user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings"
  on user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = user_id);
create policy "Users can delete own settings"
  on user_settings for delete using (auth.uid() = user_id);

create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at();

-- ClickUp task cache
create table clickup_task (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  clickup_id      text not null,
  list_id         text not null,
  list_name       text,
  folder_name     text,
  space_name      text,
  name            text not null,
  description     text,
  status_name     text,
  status_color    text,
  priority_val    integer,
  priority_label  text,
  assignees       jsonb default '[]',
  tags            jsonb default '[]',
  due_date        timestamptz,
  date_created    timestamptz,
  date_updated    timestamptz,
  url             text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, clickup_id)
);

create index idx_clickup_task_user on clickup_task(user_id);
create index idx_clickup_task_list on clickup_task(user_id, list_id);

alter table clickup_task enable row level security;

create policy "Users can read own clickup tasks"
  on clickup_task for select using (auth.uid() = user_id);
create policy "Users can insert own clickup tasks"
  on clickup_task for insert with check (auth.uid() = user_id);
create policy "Users can update own clickup tasks"
  on clickup_task for update using (auth.uid() = user_id);
create policy "Users can delete own clickup tasks"
  on clickup_task for delete using (auth.uid() = user_id);

create trigger clickup_task_updated_at
  before update on clickup_task
  for each row execute function update_updated_at();

-- ClickUp workspace hierarchy cache
create table clickup_hierarchy (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  team_id     text not null,
  team_name   text,
  space_id    text,
  space_name  text,
  folder_id   text,
  folder_name text,
  list_id     text,
  list_name   text,
  node_type   text not null check (node_type in ('team', 'space', 'folder', 'list')),
  created_at  timestamptz default now()
);

create index idx_clickup_hierarchy_user on clickup_hierarchy(user_id);

alter table clickup_hierarchy enable row level security;

create policy "Users can read own hierarchy"
  on clickup_hierarchy for select using (auth.uid() = user_id);
create policy "Users can insert own hierarchy"
  on clickup_hierarchy for insert with check (auth.uid() = user_id);
create policy "Users can update own hierarchy"
  on clickup_hierarchy for update using (auth.uid() = user_id);
create policy "Users can delete own hierarchy"
  on clickup_hierarchy for delete using (auth.uid() = user_id);
