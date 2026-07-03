alter table public.matters
  add column closed_reason text,
  add column closed_by uuid references public.profiles(id) on delete set null,
  add column archived_at timestamptz,
  add column archived_by uuid references public.profiles(id) on delete set null,
  add column current_status_summary text,
  add column status_summary_updated_at timestamptz,
  add column status_summary_updated_by uuid references public.profiles(id) on delete set null;

create index matters_archived_stage_idx on public.matters (is_archived, stage);
create index matters_intake_archive_idx on public.matters (intake_status, is_archived);

comment on column public.matters.closed_reason is 'Concise reason selected when a matter is closed.';
comment on column public.matters.closed_by is 'Profile that closed the matter.';
comment on column public.matters.archived_at is 'Administrative archive timestamp; distinct from legal matter closure.';
comment on column public.matters.archived_by is 'Profile that archived the matter.';
comment on column public.matters.current_status_summary is 'Concise internal summary of the matter current position.';
comment on column public.matters.status_summary_updated_at is 'Timestamp for the current status summary.';
comment on column public.matters.status_summary_updated_by is 'Profile that last updated the current status summary.';
