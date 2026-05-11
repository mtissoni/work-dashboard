-- Add parent task and position fields for subtask hierarchy
alter table task_enrichment add column parent_external_id text;
alter table task_enrichment add column position text;

create index idx_enrichment_parent on task_enrichment(parent_external_id);
