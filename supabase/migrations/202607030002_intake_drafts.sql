create type public.intake_status as enum ('draft', 'in_progress', 'complete');

alter table public.matters
  add column intake_status public.intake_status not null default 'complete',
  add column current_intake_step integer not null default 3 check (current_intake_step between 1 and 3),
  add column last_autosaved_at timestamptz;

create index matters_intake_status_idx on public.matters (intake_status, current_intake_step);

comment on column public.matters.intake_status is 'Tracks whether a matter intake is draft, in progress, or complete.';
comment on column public.matters.current_intake_step is 'Last reachable intake step for draft resume. Valid steps are 1 through 3.';
comment on column public.matters.last_autosaved_at is 'Timestamp of the most recent draft autosave. Autosave is not substantive matter activity.';
