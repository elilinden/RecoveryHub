create type public.matter_document_type as enum (
  'demand_letter',
  'payment_ledger',
  'proof_of_payment',
  'police_or_incident_report',
  'photograph',
  'video',
  'witness_statement',
  'repair_estimate',
  'repair_invoice',
  'medical_record',
  'expert_report',
  'insurance_information',
  'policy_document',
  'correspondence',
  'pleading',
  'discovery',
  'arbitration_document',
  'settlement_document',
  'legal_notice',
  'other'
);

create type public.document_source_type as enum ('uploaded', 'external_link', 'generated_from_template', 'imported', 'integration');
create type public.document_status as enum ('uploading', 'processing', 'available', 'quarantined', 'failed', 'superseded', 'archived');
create type public.document_scan_status as enum ('not_scanned', 'pending', 'clean', 'flagged', 'scan_failed');
create type public.document_visibility as enum ('internal_only', 'package_eligible', 'client_eligible', 'restricted');
create type public.document_template_type as enum ('subrogation_demand', 'reimbursement_request', 'document_request', 'follow_up_demand', 'deadline_notice', 'arbitration_notice', 'litigation_notice', 'settlement_document', 'other');
create type public.document_template_version_status as enum ('draft', 'approved', 'retired');
create type public.outbound_package_type as enum ('initial_demand', 'supplemental_demand', 'reimbursement_request', 'document_request', 'follow_up', 'arbitration_notice', 'litigation_notice', 'settlement', 'other');
create type public.outbound_package_status as enum ('draft', 'assembling', 'validation_needed', 'ready_for_review', 'changes_requested', 'approved_for_send', 'canceled');
create type public.package_recipient_role as enum ('responsible_party', 'adverse_adjuster', 'adverse_insurer', 'claims_administrator', 'opposing_counsel', 'carrier_contact', 'individual', 'company', 'other');
create type public.package_email_source as enum ('existing_contact', 'carrier_directory', 'prior_correspondence', 'user_entered', 'verified_external_source', 'unknown');
create type public.package_verification_status as enum ('unverified', 'verification_required', 'verified', 'rejected', 'outdated');
create type public.package_validation_status as enum ('passed', 'warning', 'failed', 'overridden');
create type public.package_validation_severity as enum ('critical', 'high', 'medium', 'low', 'informational');
create type public.package_review_type as enum ('preparation_review', 'attorney_review', 'final_send_review');
create type public.package_review_decision as enum ('approved', 'changes_requested', 'rejected');

create table public.matter_documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  title text not null,
  document_type public.matter_document_type not null default 'other',
  description text,
  document_date date,
  source_type public.document_source_type not null default 'uploaded',
  source_contact_id uuid references public.contacts(id) on delete set null,
  source_organization_id uuid references public.organizations(id) on delete set null,
  storage_provider text not null default 'supabase',
  storage_path text,
  external_url text,
  original_filename text,
  display_filename text not null,
  mime_type text,
  file_extension text,
  file_size_bytes bigint,
  file_hash text,
  page_count integer,
  status public.document_status not null default 'processing',
  scan_status public.document_scan_status not null default 'not_scanned',
  visibility public.document_visibility not null default 'internal_only',
  version_group_id uuid not null default gen_random_uuid(),
  version_number integer not null default 1,
  supersedes_document_id uuid references public.matter_documents(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  constraint matter_documents_source_check check (
    (source_type = 'external_link' and external_url is not null)
    or (source_type <> 'external_link' and storage_path is not null)
  ),
  constraint matter_documents_version_positive check (version_number > 0)
);

create table public.evidence_document_links (
  id uuid primary key default gen_random_uuid(),
  evidence_item_id uuid not null references public.evidence_items(id) on delete cascade,
  document_id uuid not null references public.matter_documents(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (evidence_item_id, document_id)
);

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_type public.document_template_type not null,
  matter_type public.matter_type,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates(id) on delete cascade,
  version_number integer not null,
  name text not null,
  subject_template text not null,
  body_template text not null,
  footer_template text,
  merge_field_schema jsonb not null default '{}'::jsonb,
  status public.document_template_version_status not null default 'draft',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version_number),
  constraint template_approval_required check (status <> 'approved' or (approved_by is not null and approved_at is not null))
);

create table public.outbound_packages (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  package_type public.outbound_package_type not null,
  status public.outbound_package_status not null default 'draft',
  title text not null,
  subject_line text,
  cover_document_id uuid references public.matter_documents(id) on delete set null,
  template_version_id uuid references public.document_template_versions(id) on delete set null,
  amount_demanded numeric(14,2),
  response_deadline date,
  payment_instructions text,
  claim_number_snapshot text,
  insured_name_snapshot text,
  responsible_party_snapshot text,
  carrier_name_snapshot text,
  matter_amount_sought_snapshot numeric(14,2),
  notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  submitted_for_review_by uuid references public.profiles(id) on delete set null,
  submitted_for_review_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  canceled_by uuid references public.profiles(id) on delete set null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outbound_packages_not_sent check (status <> 'sent')
);

create table public.outbound_package_recipients (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.outbound_packages(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  carrier_contact_id uuid references public.carrier_contacts(id) on delete set null,
  recipient_name_snapshot text not null,
  organization_name_snapshot text,
  email_address text,
  email_source public.package_email_source not null default 'unknown',
  recipient_role public.package_recipient_role not null default 'other',
  relationship_to_matter text,
  verification_status public.package_verification_status not null default 'unverified',
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  verification_note text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_recipient_verified_requires_user check (verification_status <> 'verified' or (verified_by is not null and verified_at is not null))
);

create table public.outbound_package_documents (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.outbound_packages(id) on delete cascade,
  document_id uuid not null references public.matter_documents(id) on delete restrict,
  document_version_number_snapshot integer not null,
  display_filename_snapshot text not null,
  document_type_snapshot public.matter_document_type not null,
  sort_order integer not null default 1,
  is_required boolean not null default false,
  included_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (package_id, document_id)
);

create table public.outbound_package_validations (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.outbound_packages(id) on delete cascade,
  validation_key text not null,
  status public.package_validation_status not null,
  severity public.package_validation_severity not null,
  title text not null,
  description text not null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outbound_package_reviews (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.outbound_packages(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_type public.package_review_type not null,
  decision public.package_review_decision not null,
  comments text,
  created_at timestamptz not null default now(),
  constraint final_send_review_reserved check (review_type <> 'final_send_review')
);

create index matter_documents_matter_idx on public.matter_documents (matter_id, status, visibility);
create index matter_documents_version_group_idx on public.matter_documents (version_group_id, version_number desc);
create index evidence_document_links_document_idx on public.evidence_document_links (document_id);
create index document_templates_type_idx on public.document_templates (template_type, is_active);
create index document_template_versions_template_idx on public.document_template_versions (template_id, status, version_number desc);
create index outbound_packages_matter_idx on public.outbound_packages (matter_id, status, updated_at desc);
create index outbound_packages_queue_idx on public.outbound_packages (status, response_deadline, updated_at desc);
create index outbound_package_recipients_package_idx on public.outbound_package_recipients (package_id, verification_status);
create index outbound_package_documents_package_idx on public.outbound_package_documents (package_id, sort_order);
create index outbound_package_validations_package_idx on public.outbound_package_validations (package_id, status, severity);
create index outbound_package_reviews_package_idx on public.outbound_package_reviews (package_id, created_at desc);

create trigger matter_documents_updated_at before update on public.matter_documents for each row execute function public.set_updated_at();
create trigger document_templates_updated_at before update on public.document_templates for each row execute function public.set_updated_at();
create trigger outbound_packages_updated_at before update on public.outbound_packages for each row execute function public.set_updated_at();
create trigger outbound_package_recipients_updated_at before update on public.outbound_package_recipients for each row execute function public.set_updated_at();
create trigger outbound_package_validations_updated_at before update on public.outbound_package_validations for each row execute function public.set_updated_at();

create or replace function public.can_access_document(document_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matter_documents d
    where d.id = document_uuid
      and public.can_access_matter(d.matter_id)
      and (
        d.visibility <> 'restricted'
        or public.current_profile_role() in ('admin','partner','attorney')
      )
  )
$$;

create or replace function public.can_access_package(package_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.outbound_packages p
    where p.id = package_uuid and public.can_access_matter(p.matter_id)
  )
$$;

alter table public.matter_documents enable row level security;
alter table public.evidence_document_links enable row level security;
alter table public.document_templates enable row level security;
alter table public.document_template_versions enable row level security;
alter table public.outbound_packages enable row level security;
alter table public.outbound_package_recipients enable row level security;
alter table public.outbound_package_documents enable row level security;
alter table public.outbound_package_validations enable row level security;
alter table public.outbound_package_reviews enable row level security;

create policy "matter_documents_select_by_matter" on public.matter_documents for select to authenticated using (public.can_access_document(id));
create policy "matter_documents_insert_by_matter" on public.matter_documents for insert to authenticated with check (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff'));
create policy "matter_documents_update_by_matter" on public.matter_documents for update to authenticated using (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(matter_id));

create policy "evidence_document_links_select_by_matter" on public.evidence_document_links for select to authenticated using (
  exists (
    select 1
    from public.evidence_items e
    join public.matter_documents d on d.id = document_id
    where e.id = evidence_item_id and e.matter_id = d.matter_id and public.can_access_matter(e.matter_id)
  )
);
create policy "evidence_document_links_write_by_matter" on public.evidence_document_links for all to authenticated using (
  public.current_profile_role() in ('admin','partner','attorney','staff')
  and exists (
    select 1
    from public.evidence_items e
    join public.matter_documents d on d.id = document_id
    where e.id = evidence_item_id and e.matter_id = d.matter_id and public.can_access_matter(e.matter_id)
  )
) with check (
  public.current_profile_role() in ('admin','partner','attorney','staff')
  and exists (
    select 1
    from public.evidence_items e
    join public.matter_documents d on d.id = document_id
    where e.id = evidence_item_id and e.matter_id = d.matter_id and public.can_access_matter(e.matter_id)
  )
);

create policy "document_templates_select_internal" on public.document_templates for select to authenticated using (public.current_profile_role() is not null);
create policy "document_templates_manage_admin_partner" on public.document_templates for all to authenticated using (public.current_profile_role() in ('admin','partner')) with check (public.current_profile_role() in ('admin','partner'));
create policy "document_template_versions_select_internal" on public.document_template_versions for select to authenticated using (public.current_profile_role() is not null);
create policy "document_template_versions_manage_admin_partner" on public.document_template_versions for all to authenticated using (public.current_profile_role() in ('admin','partner')) with check (public.current_profile_role() in ('admin','partner'));

create policy "outbound_packages_select_by_matter" on public.outbound_packages for select to authenticated using (public.can_access_package(id));
create policy "outbound_packages_insert_by_matter" on public.outbound_packages for insert to authenticated with check (public.can_access_matter(matter_id) and public.current_profile_role() in ('admin','partner','attorney','staff'));
create policy "outbound_packages_update_by_matter" on public.outbound_packages for update to authenticated using (public.can_access_package(id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_matter(matter_id));

create policy "package_recipients_access_by_package" on public.outbound_package_recipients for select to authenticated using (public.can_access_package(package_id));
create policy "package_recipients_write_by_package" on public.outbound_package_recipients for all to authenticated using (public.can_access_package(package_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_package(package_id));
create policy "package_documents_access_by_package" on public.outbound_package_documents for select to authenticated using (public.can_access_package(package_id));
create policy "package_documents_write_by_package" on public.outbound_package_documents for all to authenticated using (public.can_access_package(package_id) and public.can_access_document(document_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_package(package_id) and public.can_access_document(document_id));
create policy "package_validations_access_by_package" on public.outbound_package_validations for select to authenticated using (public.can_access_package(package_id));
create policy "package_validations_write_by_package" on public.outbound_package_validations for all to authenticated using (public.can_access_package(package_id) and public.current_profile_role() in ('admin','partner','attorney','staff')) with check (public.can_access_package(package_id));
create policy "package_reviews_access_by_package" on public.outbound_package_reviews for select to authenticated using (public.can_access_package(package_id));
create policy "package_reviews_write_attorneys" on public.outbound_package_reviews for insert to authenticated with check (public.can_access_package(package_id) and public.current_profile_role() in ('admin','partner','attorney','staff'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'matter-documents',
  'matter-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "matter_document_objects_select_authorized" on storage.objects for select to authenticated using (
  bucket_id = 'matter-documents'
  and exists (
    select 1
    from public.matter_documents d
    where d.storage_path = name and public.can_access_document(d.id)
  )
);
create policy "matter_document_objects_insert_authorized" on storage.objects for insert to authenticated with check (
  bucket_id = 'matter-documents'
  and public.current_profile_role() in ('admin','partner','attorney','staff')
);
