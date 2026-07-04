alter table public.evidence_items
  alter column evidence_type type text using evidence_type::text;

comment on column public.evidence_items.evidence_type is 'Evidence label or standard evidence key. Stored as text so beta users can add custom checklist items.';
