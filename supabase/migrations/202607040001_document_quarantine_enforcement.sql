-- can_access_document() governs metadata visibility (matter access + visibility level) and is
-- intentionally left unchanged: a processing/quarantined document should still be listed and
-- reviewable in the UI. It must not also govern whether bytes can be served.
--
-- can_download_document() is the strict gate for actually reading file content: it additionally
-- requires status = 'available' and (for uploaded files) scan_status = 'clean'. External links have
-- no bytes of ours to scan, so they are exempt from the scan_status check but still require
-- status = 'available'.
create or replace function public.can_download_document(document_uuid uuid)
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
      and d.status = 'available'
      and (d.source_type = 'external_link' or d.scan_status = 'clean')
      and public.can_access_matter(d.matter_id)
      and (
        d.visibility <> 'restricted'
        or public.current_profile_role() in ('admin', 'partner', 'attorney')
      )
  )
$$;

-- Safely extracts the leading path segment of a storage object name as a uuid, returning null
-- (rather than raising) for malformed paths so it can be used directly inside an RLS predicate.
create or replace function public.storage_path_matter_id(object_path text)
returns uuid
language plpgsql
immutable
as $$
declare
  segment text;
begin
  segment := split_part(object_path, '/', 1);
  begin
    return segment::uuid;
  exception when others then
    return null;
  end;
end;
$$;

drop policy if exists "matter_document_objects_select_authorized" on storage.objects;
create policy "matter_document_objects_select_authorized"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'matter-documents'
  and exists (
    select 1
    from public.matter_documents d
    where d.storage_path = name
      and public.can_download_document(d.id)
  )
);

-- Uploads must land under <matter-id>/<document-id>/<filename> for a matter the uploader can
-- access. This closes the previous gap where any attorney or staff member could write to any
-- path in the bucket, including paths not tied to a matter they have access to.
--
-- can_access_matter() short-circuits true for admins/partners purely on role, independent of
-- whether the matter row actually exists (see 202607030001_phase_2_foundation.sql). Relying on
-- it alone here would let an admin or partner upload to a path whose leading segment is not a
-- real matter id at all, since the existence check is bypassed for those roles. The explicit
-- "exists (select ... from matters)" clause below closes that gap for every role.
drop policy if exists "matter_document_objects_insert_authorized" on storage.objects;
create policy "matter_document_objects_insert_authorized"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'matter-documents'
  and public.current_profile_role() in ('admin', 'partner', 'attorney', 'staff')
  and array_length(string_to_array(name, '/'), 1) >= 3
  and exists (select 1 from public.matters m where m.id = public.storage_path_matter_id(name))
  and public.can_access_matter(public.storage_path_matter_id(name))
);
