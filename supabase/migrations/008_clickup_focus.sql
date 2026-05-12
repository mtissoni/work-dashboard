-- Cache auto-discovered Dolphia folder and parent space IDs
alter table user_settings
  add column if not exists clickup_folder_id text,
  add column if not exists clickup_space_id  text;
