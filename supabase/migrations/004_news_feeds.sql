-- Feed sources config table
create table feed_source (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  feed_url    text not null,
  feed_type   text not null check (feed_type in ('article', 'video', 'netsuite')),
  enabled     boolean default true,
  created_at  timestamptz default now(),
  unique(user_id, feed_url)
);

alter table feed_source enable row level security;

create policy "Users can read own feed sources"
  on feed_source for select using (auth.uid() = user_id);

create policy "Users can insert own feed sources"
  on feed_source for insert with check (auth.uid() = user_id);

create policy "Users can update own feed sources"
  on feed_source for update using (auth.uid() = user_id);

create policy "Users can delete own feed sources"
  on feed_source for delete using (auth.uid() = user_id);

-- Cached feed items
create table feed_item (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source_id     uuid not null references feed_source(id) on delete cascade,
  external_id   text not null,
  feed_type     text not null,
  title         text not null,
  url           text not null,
  author        text,
  summary       text,
  thumbnail_url text,
  published_at  timestamptz not null,
  is_read       boolean default false,
  is_starred    boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, external_id)
);

create index idx_feed_item_user_type on feed_item(user_id, feed_type);
create index idx_feed_item_published on feed_item(user_id, published_at desc);
create index idx_feed_item_unread on feed_item(user_id, is_read) where is_read = false;

alter table feed_item enable row level security;

create policy "Users can read own feed items"
  on feed_item for select using (auth.uid() = user_id);

create policy "Users can insert own feed items"
  on feed_item for insert with check (auth.uid() = user_id);

create policy "Users can update own feed items"
  on feed_item for update using (auth.uid() = user_id);

create policy "Users can delete own feed items"
  on feed_item for delete using (auth.uid() = user_id);

create trigger feed_item_updated_at
  before update on feed_item
  for each row execute function update_updated_at();
