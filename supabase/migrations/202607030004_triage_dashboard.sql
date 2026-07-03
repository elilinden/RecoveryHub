create type public.triage_severity as enum ('critical', 'high', 'medium', 'low', 'informational');

create table public.triage_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  description text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matter_flags (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  flag_type text not null,
  rule_key text not null,
  severity public.triage_severity not null,
  category text not null,
  title text not null,
  description text not null,
  suggested_action text,
  relevant_date date,
  relevant_user_id uuid references public.profiles(id) on delete set null,
  detected_at timestamptz not null default now(),
  last_evaluated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_reason text,
  dismissed_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matter_flag_overrides (
  id uuid primary key default gen_random_uuid(),
  matter_flag_id uuid not null references public.matter_flags(id) on delete cascade,
  matter_id uuid not null references public.matters(id) on delete cascade,
  rule_key text not null,
  reason text not null,
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index matter_flags_one_active_rule
  on public.matter_flags (matter_id, rule_key)
  where resolved_at is null;

create index matter_flags_active_by_matter on public.matter_flags (matter_id, severity, flag_type) where resolved_at is null;
create index matter_flags_active_by_type on public.matter_flags (flag_type, severity) where resolved_at is null;
create index matter_flags_dismissed_until on public.matter_flags (dismissed_until) where resolved_at is null and dismissed_until is not null;
create index matter_flag_overrides_matter_rule on public.matter_flag_overrides (matter_id, rule_key, expires_at);

create trigger triage_settings_updated_at before update on public.triage_settings for each row execute function public.set_updated_at();
create trigger matter_flags_updated_at before update on public.matter_flags for each row execute function public.set_updated_at();

insert into public.triage_settings (setting_key, setting_value, description)
values
  ('urgent_statute_days', '30'::jsonb, 'Recorded statute deadlines at or inside this many days are treated as urgent.'),
  ('upcoming_statute_days', '90'::jsonb, 'Recorded statute deadlines outside the urgent window but inside this many days are treated as upcoming.'),
  ('stale_matter_days', '30'::jsonb, 'Active matters with no substantive activity for this many days are flagged as stale.'),
  ('overdue_response_days', '14'::jsonb, 'Outside-party response follow-up period when no explicit response date exists.'),
  ('new_referral_review_days', '3'::jsonb, 'Completed intakes remaining in New Referral beyond this many days are flagged.'),
  ('demand_follow_up_days', '14'::jsonb, 'Demand follow-up period when no explicit follow-up date exists.'),
  ('missing_next_action_is_flagged', 'true'::jsonb, 'Whether active completed matters missing a complete next action should be flagged.'),
  ('unverified_deadline_is_flagged', 'true'::jsonb, 'Whether entered statute dates without authorized verification should be flagged.'),
  ('ready_for_demand_required_evidence', '["payment_ledger","police_or_incident_report","repair_estimate","photographs","insurance_information"]'::jsonb, 'Evidence normally expected before a matter appears ready for demand review.'),
  ('ready_for_demand_allowed_liability_values', '["strong","moderate"]'::jsonb, 'Liability assessment values permitted by the demand-readiness rule.'),
  ('ready_for_demand_allowed_insurance_values', '["confirmed_coverage","identified_unconfirmed"]'::jsonb, 'Insurance statuses permitted by the demand-readiness rule.')
on conflict (setting_key) do nothing;

alter table public.triage_settings enable row level security;
alter table public.matter_flags enable row level security;
alter table public.matter_flag_overrides enable row level security;

create policy "triage_settings_read_internal" on public.triage_settings
for select to authenticated using (public.current_profile_role() is not null);

create policy "triage_settings_write_partner_admin" on public.triage_settings
for all to authenticated using (public.is_partner_or_admin()) with check (public.is_partner_or_admin());

create policy "matter_flags_access_by_matter" on public.matter_flags
for select to authenticated using (public.can_access_matter(matter_id));

create policy "matter_flags_insert_internal_by_matter" on public.matter_flags
for insert to authenticated with check (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff'));

create policy "matter_flags_update_internal_by_matter" on public.matter_flags
for update to authenticated using (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(matter_id));

create policy "matter_overrides_access_by_matter" on public.matter_flag_overrides
for select to authenticated using (public.can_access_matter(matter_id));

create policy "matter_overrides_write_legal_by_matter" on public.matter_flag_overrides
for insert to authenticated with check (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney'));

create or replace function public.recalculate_triage_placeholder()
returns text
language sql
security definer
set search_path = public
as $$
  select 'Use the application scheduled endpoint /api/triage/recalculate with TRIAGE_RECALCULATION_SECRET to evaluate rule-based matter flags.';
$$;
