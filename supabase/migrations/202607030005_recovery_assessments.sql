create table public.recovery_assessment_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  matter_type text not null default 'general',
  version integer not null,
  is_active boolean not null default false,
  effective_from date not null default current_date,
  effective_to date,
  recommendation_bands jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, matter_type, version)
);

create table public.recovery_assessment_factors (
  id uuid primary key default gen_random_uuid(),
  assessment_model_id uuid not null references public.recovery_assessment_models(id) on delete cascade,
  factor_key text not null,
  label text not null,
  description text not null,
  category text not null,
  input_type text not null,
  weight numeric(6,2) not null,
  is_required boolean not null default true,
  display_order integer not null,
  help_text text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_model_id, factor_key)
);

create table public.recovery_assessment_factor_options (
  id uuid primary key default gen_random_uuid(),
  factor_id uuid not null references public.recovery_assessment_factors(id) on delete cascade,
  value text not null,
  label text not null,
  score_percentage numeric(6,2),
  description text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (factor_id, value)
);

create table public.recovery_assessments (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  assessment_model_id uuid not null references public.recovery_assessment_models(id) on delete restrict,
  assessment_model_version integer not null,
  status text not null default 'draft' check (status in ('draft','finalized','superseded','canceled')),
  viability_score numeric(6,2) not null default 0,
  potential_recoverable_amount numeric(14,2) not null default 0,
  estimated_recovery_probability numeric(6,2) not null default 0,
  expected_gross_value numeric(14,2) not null default 0,
  estimated_legal_costs numeric(14,2) not null default 0,
  estimated_third_party_reductions numeric(14,2) not null default 0,
  expected_net_value numeric(14,2) not null default 0,
  data_completeness_percentage numeric(6,2) not null default 0,
  calculated_recommendation text not null,
  attorney_conclusion text,
  assessment_summary text,
  assumptions text,
  amount_explanation text,
  completed_by uuid references public.profiles(id) on delete set null,
  finalized_by uuid references public.profiles(id) on delete set null,
  finalized_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recovery_assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.recovery_assessments(id) on delete cascade,
  factor_id uuid not null references public.recovery_assessment_factors(id) on delete restrict,
  selected_option_id uuid references public.recovery_assessment_factor_options(id) on delete restrict,
  numeric_value numeric(14,2),
  percentage_value numeric(6,2),
  currency_value numeric(14,2),
  boolean_value boolean,
  text_value text,
  factor_weight_snapshot numeric(6,2) not null,
  score_percentage_snapshot numeric(6,2),
  points_awarded numeric(6,2) not null default 0,
  is_missing boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, factor_id)
);

create table public.recovery_assessment_overrides (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.recovery_assessments(id) on delete cascade,
  calculated_recommendation text not null,
  override_recommendation text not null,
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index recovery_assessments_matter_status on public.recovery_assessments (matter_id, status, finalized_at);
create index recovery_assessments_scores on public.recovery_assessments (viability_score, expected_net_value, data_completeness_percentage);
create index recovery_assessment_responses_assessment on public.recovery_assessment_responses (assessment_id);

create trigger recovery_assessment_models_updated_at before update on public.recovery_assessment_models for each row execute function public.set_updated_at();
create trigger recovery_assessment_factors_updated_at before update on public.recovery_assessment_factors for each row execute function public.set_updated_at();
create trigger recovery_assessment_factor_options_updated_at before update on public.recovery_assessment_factor_options for each row execute function public.set_updated_at();
create trigger recovery_assessments_updated_at before update on public.recovery_assessments for each row execute function public.set_updated_at();
create trigger recovery_assessment_responses_updated_at before update on public.recovery_assessment_responses for each row execute function public.set_updated_at();

alter table public.recovery_assessment_models enable row level security;
alter table public.recovery_assessment_factors enable row level security;
alter table public.recovery_assessment_factor_options enable row level security;
alter table public.recovery_assessments enable row level security;
alter table public.recovery_assessment_responses enable row level security;
alter table public.recovery_assessment_overrides enable row level security;

create policy "assessment_models_read_internal" on public.recovery_assessment_models for select to authenticated using (public.current_profile_role() is not null);
create policy "assessment_models_write_partner_admin" on public.recovery_assessment_models for all to authenticated using (public.is_partner_or_admin()) with check (public.is_partner_or_admin());
create policy "assessment_factors_read_internal" on public.recovery_assessment_factors for select to authenticated using (public.current_profile_role() is not null);
create policy "assessment_factors_write_partner_admin" on public.recovery_assessment_factors for all to authenticated using (public.is_partner_or_admin()) with check (public.is_partner_or_admin());
create policy "assessment_options_read_internal" on public.recovery_assessment_factor_options for select to authenticated using (public.current_profile_role() is not null);
create policy "assessment_options_write_partner_admin" on public.recovery_assessment_factor_options for all to authenticated using (public.is_partner_or_admin()) with check (public.is_partner_or_admin());

create policy "assessments_access_by_matter" on public.recovery_assessments for select to authenticated using (public.can_access_matter(matter_id));
create policy "assessments_insert_by_matter" on public.recovery_assessments for insert to authenticated with check (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff'));
create policy "assessments_update_by_matter" on public.recovery_assessments for update to authenticated using (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(matter_id));
create policy "assessment_responses_access_by_matter" on public.recovery_assessment_responses for select to authenticated using (exists (select 1 from public.recovery_assessments ra where ra.id = assessment_id and public.can_access_matter(ra.matter_id)));
create policy "assessment_responses_write_by_matter" on public.recovery_assessment_responses for all to authenticated using (exists (select 1 from public.recovery_assessments ra where ra.id = assessment_id and public.can_access_matter(ra.matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff'))) with check (exists (select 1 from public.recovery_assessments ra where ra.id = assessment_id and public.can_access_matter(ra.matter_id)));
create policy "assessment_overrides_access_by_matter" on public.recovery_assessment_overrides for select to authenticated using (exists (select 1 from public.recovery_assessments ra where ra.id = assessment_id and public.can_access_matter(ra.matter_id)));
create policy "assessment_overrides_insert_legal" on public.recovery_assessment_overrides for insert to authenticated with check (public.current_profile_role() in ('admin','partner','attorney') and exists (select 1 from public.recovery_assessments ra where ra.id = assessment_id and public.can_access_matter(ra.matter_id)));
