create extension if not exists pgcrypto;

create type public.profile_role as enum ('admin', 'partner', 'attorney', 'staff', 'billing', 'read_only');
create type public.carrier_contact_type as enum ('adjuster', 'supervisor', 'claims_manager', 'billing_contact', 'other');
create type public.organization_type as enum ('insurance_carrier', 'law_firm', 'business', 'medical_provider', 'repair_facility', 'government_entity', 'other');
create type public.matter_type as enum ('auto_subrogation', 'property_damage', 'workers_compensation_recovery', 'health_plan_recovery', 'commercial_loss', 'product_related_loss', 'construction_loss', 'insurance_defense', 'other');
create type public.insurance_status as enum ('confirmed_coverage', 'identified_unconfirmed', 'no_insurance_identified', 'uninsured', 'unknown');
create type public.assessment_level as enum ('strong', 'moderate', 'weak', 'unknown');
create type public.matter_stage as enum ('new_referral', 'initial_review', 'investigation', 'ready_for_demand', 'demand_pending', 'negotiation', 'arbitration_review', 'litigation_review', 'recovery_received', 'closed');
create type public.priority_level as enum ('urgent', 'high', 'normal', 'low');
create type public.party_role as enum ('insured', 'claimant', 'responsible_party', 'plaintiff', 'defendant', 'adverse_insurer', 'opposing_counsel', 'witness', 'expert', 'medical_provider', 'repair_facility', 'other');
create type public.assignment_role as enum ('lead_attorney', 'supporting_attorney', 'assigned_staff', 'supervising_partner', 'billing', 'reviewer', 'other');
create type public.evidence_type as enum ('police_or_incident_report', 'photographs', 'video', 'witness_statement', 'repair_estimate', 'repair_invoice', 'payment_ledger', 'expert_report', 'medical_records', 'correspondence', 'insurance_information', 'plan_document', 'other');
create type public.evidence_status as enum ('received', 'requested', 'missing', 'not_available', 'not_applicable');
create type public.task_status as enum ('not_started', 'in_progress', 'blocked', 'completed', 'canceled');
create type public.deadline_type as enum ('statute_of_limitations', 'contractual_limitation', 'arbitration', 'notice', 'preservation', 'filing', 'discovery', 'hearing', 'trial', 'other');
create type public.matter_event_type as enum ('referral_received', 'initial_review_completed', 'investigation_started', 'document_requested', 'document_received', 'demand_ready', 'demand_sent', 'response_received', 'offer_received', 'authority_requested', 'authority_received', 'arbitration_filed', 'lawsuit_filed', 'hearing_scheduled', 'recovery_received', 'matter_closed', 'other');
create type public.matter_event_source as enum ('manual', 'system', 'import', 'integration');
create type public.sync_status as enum ('not_synced', 'pending', 'synced', 'error');
create type public.client_update_visibility as enum ('internal', 'client_eligible', 'client_approved', 'client_published');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default 'Invited User',
  role public.profile_role not null default 'read_only',
  job_title text,
  avatar_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text,
  reporting_preferences jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.carrier_contacts (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  job_title text,
  department text,
  contact_type public.carrier_contact_type not null default 'other',
  supervisor_contact_id uuid references public.carrier_contacts(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type public.organization_type not null default 'other',
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'US',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  organization_id uuid references public.organizations(id) on delete set null,
  job_title text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'US',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matters (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid references public.carriers(id) on delete restrict,
  assigned_adjuster_id uuid references public.carrier_contacts(id) on delete set null,
  carrier_supervisor_id uuid references public.carrier_contacts(id) on delete set null,
  matter_name text not null,
  carrier_claim_number text,
  firm_matter_number text,
  matter_type public.matter_type not null default 'other',
  matter_specific_data jsonb not null default '{}'::jsonb,
  date_referred date,
  date_of_loss date,
  jurisdiction text,
  venue text,
  insurance_status public.insurance_status not null default 'unknown',
  amount_paid numeric(14,2) not null default 0,
  deductible numeric(14,2) not null default 0,
  anticipated_additional_payments numeric(14,2) not null default 0,
  recoverable_expenses numeric(14,2) not null default 0,
  amount_sought numeric(14,2) not null default 0,
  amount_recovered numeric(14,2) not null default 0,
  estimated_legal_cost numeric(14,2) not null default 0,
  liability_assessment public.assessment_level not null default 'unknown',
  collectability_assessment public.assessment_level not null default 'unknown',
  stage public.matter_stage not null default 'new_referral',
  priority public.priority_level not null default 'normal',
  next_action text,
  next_action_due_date date,
  statute_deadline date,
  statute_deadline_verified boolean not null default false,
  statute_deadline_verified_by uuid references public.profiles(id) on delete set null,
  statute_deadline_verified_at timestamptz,
  assigned_attorney_id uuid references public.profiles(id) on delete set null,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  internal_notes text,
  is_archived boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  referral_received_at timestamptz,
  initial_review_completed_at timestamptz,
  investigation_started_at timestamptz,
  demand_ready_at timestamptz,
  demand_sent_at timestamptz,
  negotiation_started_at timestamptz,
  recovery_received_at timestamptz,
  closed_at timestamptz,
  last_substantive_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matter_parties (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  party_role public.party_role not null,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matter_party_has_party check (contact_id is not null or organization_id is not null)
);

create table public.matter_assignments (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role public.assignment_role not null,
  created_at timestamptz not null default now(),
  unique (matter_id, profile_id, assignment_role)
);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  evidence_type public.evidence_type not null,
  status public.evidence_status not null default 'requested',
  date_requested date,
  date_received date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date date,
  priority public.priority_level not null default 'normal',
  status public.task_status not null default 'not_started',
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  deadline_type public.deadline_type not null,
  title text not null,
  deadline_date date not null,
  is_verified boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  reminder_date date,
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matter_events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  event_type public.matter_event_type not null,
  occurred_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  source public.matter_event_source not null default 'manual',
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid references public.matters(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  page text not null,
  filter_configuration jsonb not null default '{}'::jsonb,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.external_references (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  system_name text not null,
  external_id text,
  external_url text,
  last_synced_at timestamptz,
  sync_status public.sync_status not null default 'not_synced',
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, system_name, external_id)
);

create table public.client_updates (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  title text not null,
  summary text not null,
  visibility_status public.client_update_visibility not null default 'internal',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_requires_approval check (visibility_status <> 'client_published' or (approved_by is not null and approved_at is not null and published_at is not null))
);

create index on public.profiles (role, is_active);
create index on public.carrier_contacts (carrier_id, contact_type);
create index on public.matters (carrier_id);
create index on public.matters (assigned_adjuster_id);
create index on public.matters (assigned_attorney_id);
create index on public.matters (assigned_staff_id);
create index on public.matters (next_action_due_date);
create index on public.matters (statute_deadline);
create index on public.matters (last_substantive_activity_at);
create index on public.matter_assignments (matter_id, profile_id);
create index on public.tasks (matter_id, assigned_to, due_date, status);
create index on public.deadlines (matter_id, deadline_date, is_verified);
create index on public.matter_events (matter_id, occurred_at);
create index on public.activity_logs (matter_id, created_at);
create index on public.saved_views (profile_id, page);
create index on public.external_references (entity_type, entity_id);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger carriers_updated_at before update on public.carriers for each row execute function public.set_updated_at();
create trigger carrier_contacts_updated_at before update on public.carrier_contacts for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger matters_updated_at before update on public.matters for each row execute function public.set_updated_at();
create trigger matter_parties_updated_at before update on public.matter_parties for each row execute function public.set_updated_at();
create trigger evidence_items_updated_at before update on public.evidence_items for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger deadlines_updated_at before update on public.deadlines for each row execute function public.set_updated_at();
create trigger saved_views_updated_at before update on public.saved_views for each row execute function public.set_updated_at();
create trigger external_references_updated_at before update on public.external_references for each row execute function public.set_updated_at();
create trigger client_updates_updated_at before update on public.client_updates for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', 'Invited User'), 'read_only', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.prevent_self_role_or_active_change()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'Users cannot change their own role or active status.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_or_active_change
before update of role, is_active on public.profiles
for each row execute function public.prevent_self_role_or_active_change();

create or replace function public.apply_matter_lifecycle_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.referral_received_at = coalesce(new.referral_received_at, now());
    new.last_substantive_activity_at = coalesce(new.last_substantive_activity_at, new.referral_received_at, now());
    if new.stage = 'initial_review' and new.initial_review_completed_at is null then
      new.initial_review_completed_at = now();
    elsif new.stage = 'investigation' and new.investigation_started_at is null then
      new.investigation_started_at = now();
    elsif new.stage = 'ready_for_demand' and new.demand_ready_at is null then
      new.demand_ready_at = now();
    elsif new.stage = 'negotiation' and new.negotiation_started_at is null then
      new.negotiation_started_at = now();
    elsif new.stage = 'recovery_received' and new.recovery_received_at is null then
      new.recovery_received_at = now();
    elsif new.stage = 'closed' and new.closed_at is null then
      new.closed_at = now();
    end if;
  else
    if new.stage = 'initial_review' and old.initial_review_completed_at is null then
      new.initial_review_completed_at = coalesce(new.initial_review_completed_at, now());
    elsif new.stage = 'investigation' and old.investigation_started_at is null then
      new.investigation_started_at = coalesce(new.investigation_started_at, now());
    elsif new.stage = 'ready_for_demand' and old.demand_ready_at is null then
      new.demand_ready_at = coalesce(new.demand_ready_at, now());
    elsif new.stage = 'negotiation' and old.negotiation_started_at is null then
      new.negotiation_started_at = coalesce(new.negotiation_started_at, now());
    elsif new.stage = 'recovery_received' and old.recovery_received_at is null then
      new.recovery_received_at = coalesce(new.recovery_received_at, now());
    elsif new.stage = 'closed' and old.closed_at is null then
      new.closed_at = coalesce(new.closed_at, now());
    end if;
  end if;

  return new;
end;
$$;

create trigger matters_lifecycle_before_insert
before insert on public.matters
for each row execute function public.apply_matter_lifecycle_timestamps();

create trigger matters_lifecycle_before_update
before update of stage on public.matters
for each row execute function public.apply_matter_lifecycle_timestamps();

create or replace function public.touch_substantive_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matters
  set last_substantive_activity_at = greatest(coalesce(last_substantive_activity_at, new.created_at), coalesce(new.occurred_at, new.created_at)),
      demand_sent_at = case when new.event_type = 'demand_sent' and demand_sent_at is null then coalesce(new.occurred_at, new.created_at) else demand_sent_at end,
      negotiation_started_at = case when new.event_type in ('response_received', 'offer_received') and negotiation_started_at is null then coalesce(new.occurred_at, new.created_at) else negotiation_started_at end,
      recovery_received_at = case when new.event_type = 'recovery_received' and recovery_received_at is null then coalesce(new.occurred_at, new.created_at) else recovery_received_at end,
      closed_at = case when new.event_type = 'matter_closed' and closed_at is null then coalesce(new.occurred_at, new.created_at) else closed_at end
  where id = new.matter_id
    and new.event_type in ('initial_review_completed','investigation_started','document_received','demand_ready','demand_sent','response_received','offer_received','authority_requested','authority_received','arbitration_filed','lawsuit_filed','recovery_received','matter_closed');
  return new;
end;
$$;

create trigger matter_events_touch_substantive_activity
after insert on public.matter_events
for each row execute function public.touch_substantive_activity();

create or replace function public.touch_task_completion_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = coalesce(new.completed_at, now());
    update public.matters set last_substantive_activity_at = new.completed_at where id = new.matter_id;
  end if;
  return new;
end;
$$;

create trigger task_completion_substantive_activity
before update of status on public.tasks
for each row execute function public.touch_task_completion_activity();

create or replace function public.current_profile_role(user_uuid uuid default auth.uid())
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = user_uuid and is_active = true
$$;

create or replace function public.is_admin(user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role(user_uuid) = 'admin'
$$;

create or replace function public.is_partner_or_admin(user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role(user_uuid) in ('admin', 'partner')
$$;

create or replace function public.can_access_matter(matter_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.matters m on m.id = matter_uuid
    where p.id = auth.uid()
      and p.is_active = true
      and (
        p.role in ('admin', 'partner')
        or m.assigned_attorney_id = p.id
        or m.assigned_staff_id = p.id
        or exists (
          select 1 from public.matter_assignments ma
          where ma.matter_id = matter_uuid and ma.profile_id = p.id
        )
      )
  )
$$;

create or replace function public.get_follow_up_matters(stale_days integer default 30)
returns table (
  matter_id uuid,
  matter_name text,
  condition text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, matter_name, 'overdue_next_action' from public.matters
  where public.can_access_matter(id) and next_action_due_date < current_date and stage <> 'closed'
  union all
  select id, matter_name, 'missing_next_action' from public.matters
  where public.can_access_matter(id) and next_action is null and stage <> 'closed'
  union all
  select id, matter_name, 'stale_matter' from public.matters
  where public.can_access_matter(id) and last_substantive_activity_at < now() - make_interval(days => stale_days) and stage <> 'closed'
  union all
  select id, matter_name, 'unverified_statute_deadline' from public.matters
  where public.can_access_matter(id) and statute_deadline is not null and statute_deadline_verified = false
$$;

alter table public.profiles enable row level security;
alter table public.carriers enable row level security;
alter table public.carrier_contacts enable row level security;
alter table public.organizations enable row level security;
alter table public.contacts enable row level security;
alter table public.matters enable row level security;
alter table public.matter_parties enable row level security;
alter table public.matter_assignments enable row level security;
alter table public.evidence_items enable row level security;
alter table public.tasks enable row level security;
alter table public.deadlines enable row level security;
alter table public.matter_events enable row level security;
alter table public.activity_logs enable row level security;
alter table public.saved_views enable row level security;
alter table public.external_references enable row level security;
alter table public.client_updates enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_update_safe_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "carriers_read_internal" on public.carriers for select to authenticated using (public.current_profile_role() is not null);
create policy "carriers_write_partner_admin" on public.carriers for all to authenticated using (public.is_partner_or_admin()) with check (public.is_partner_or_admin());
create policy "carrier_contacts_read_internal" on public.carrier_contacts for select to authenticated using (public.current_profile_role() is not null);
create policy "carrier_contacts_write_partner_admin" on public.carrier_contacts for all to authenticated using (public.is_partner_or_admin()) with check (public.is_partner_or_admin());

create policy "organizations_read_internal" on public.organizations for select to authenticated using (public.current_profile_role() is not null);
create policy "organizations_write_internal" on public.organizations for all to authenticated using (public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.current_profile_role() in ('admin','partner','attorney','staff'));
create policy "contacts_read_internal" on public.contacts for select to authenticated using (public.current_profile_role() is not null);
create policy "contacts_write_internal" on public.contacts for all to authenticated using (public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.current_profile_role() in ('admin','partner','attorney','staff'));

create policy "matters_select_permitted" on public.matters for select to authenticated using (public.can_access_matter(id));
create policy "matters_insert_internal" on public.matters for insert to authenticated with check (public.current_profile_role() in ('admin','partner','attorney','staff'));
create policy "matters_update_permitted" on public.matters for update to authenticated using (public.can_access_matter(id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(id));

create policy "matter_parties_access_by_matter" on public.matter_parties for select to authenticated using (public.can_access_matter(matter_id));
create policy "matter_parties_write_by_matter" on public.matter_parties for all to authenticated using (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(matter_id));
create policy "matter_assignments_access_by_matter" on public.matter_assignments for select to authenticated using (public.can_access_matter(matter_id));
create policy "matter_assignments_write_partner_admin" on public.matter_assignments for all to authenticated using (public.is_partner_or_admin()) with check (public.is_partner_or_admin());

create policy "evidence_access_by_matter" on public.evidence_items for select to authenticated using (public.can_access_matter(matter_id));
create policy "evidence_write_by_matter" on public.evidence_items for all to authenticated using (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(matter_id));
create policy "tasks_access_by_matter" on public.tasks for select to authenticated using (public.can_access_matter(matter_id));
create policy "tasks_write_by_matter" on public.tasks for all to authenticated using (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(matter_id));
create policy "deadlines_access_by_matter" on public.deadlines for select to authenticated using (public.can_access_matter(matter_id));
create policy "deadlines_write_by_matter" on public.deadlines for all to authenticated using (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(matter_id));
create policy "matter_events_access_by_matter" on public.matter_events for select to authenticated using (public.can_access_matter(matter_id));
create policy "matter_events_insert_by_matter" on public.matter_events for insert to authenticated with check (public.can_access_matter(matter_id));
create policy "activity_logs_access_by_matter" on public.activity_logs for select to authenticated using (matter_id is null or public.can_access_matter(matter_id));
create policy "activity_logs_insert_internal" on public.activity_logs for insert to authenticated with check (public.current_profile_role() is not null);

create policy "saved_views_select_own_or_shared" on public.saved_views for select to authenticated using (profile_id = auth.uid() or is_shared = true);
create policy "saved_views_insert_own" on public.saved_views for insert to authenticated with check (profile_id = auth.uid() and is_shared = false);
create policy "saved_views_update_own_or_admin" on public.saved_views for update to authenticated using (profile_id = auth.uid() or public.is_admin()) with check (profile_id = auth.uid() or public.is_admin());
create policy "saved_views_delete_own_or_admin" on public.saved_views for delete to authenticated using (profile_id = auth.uid() or public.is_admin());

create policy "external_references_access_matters" on public.external_references for select to authenticated using (entity_type <> 'matter' or public.can_access_matter(entity_id));
create policy "external_references_write_partner_admin" on public.external_references for all to authenticated using (public.is_partner_or_admin()) with check (public.is_partner_or_admin());
create policy "client_updates_access_by_matter" on public.client_updates for select to authenticated using (public.can_access_matter(matter_id));
create policy "client_updates_insert_by_matter" on public.client_updates for insert to authenticated with check (public.can_access_matter(matter_id));
create policy "client_updates_update_partner_admin" on public.client_updates for update to authenticated using (public.is_partner_or_admin() and public.can_access_matter(matter_id)) with check (public.is_partner_or_admin() and public.can_access_matter(matter_id));
