alter table public.matter_events
  add column struck_through_at timestamptz,
  add column struck_through_by uuid references public.profiles(id) on delete set null;

-- Lets a user strike through (soft-remove, preserved) their own manually recorded events, or
-- restore one they struck through. Admins may strike through or restore any event. Permanent
-- deletion is a separate, admin-only policy below — normal users can never remove an entry
-- outright, only cross it out.
create policy "matter_events_update_strike_own_or_admin"
on public.matter_events
for update
to authenticated
using (
  public.can_access_matter(matter_id)
  and (
    (source = 'manual' and recorded_by = auth.uid())
    or public.is_admin()
  )
)
with check (
  public.can_access_matter(matter_id)
  and (
    (source = 'manual' and recorded_by = auth.uid())
    or public.is_admin()
  )
);

create policy "matter_events_delete_admin_only"
on public.matter_events
for delete
to authenticated
using (public.is_admin());
