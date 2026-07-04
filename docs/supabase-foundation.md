# Recovery Hub Supabase Foundation

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

New Supabase projects should prefer a publishable key. The app accepts the legacy anon key because the phase brief requested it.

## Setup

```bash
npm install
npm run lint
npm run build
```

With Supabase CLI:

```bash
supabase db reset
supabase db push
supabase db seed --file supabase/seed/phase_2_seed.sql
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

The checked-in `database.types.ts` is a hand-maintained starter so the app compiles before a project is connected. Regenerate it after applying migrations.

## Authentication

Recovery Hub uses Supabase Auth through `@supabase/ssr` and cookie-backed sessions:

- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`
- Route protection and session refresh: `src/proxy.ts`

Protected routes are `/dashboard`, `/matters`, `/matters/new`, `/matters/[id]`, and `/settings`. Unauthenticated users are redirected to `/login` with the intended destination when practical. Authenticated users on auth pages are redirected to `/dashboard`. Inactive users are denied entry.

There is no public self-registration. Users should be invited or created by an administrator.

### Required: email template configuration (invite and password reset)

Supabase's default "Invite user" and "Reset Password" email templates link to
`{{ .ConfirmationURL }}`, which points to Supabase's own hosted
`/auth/v1/verify` endpoint. That endpoint consumes the one-time token and
redirects back to the app with a session already established — before the
app's own page ever loads. Corporate/institutional email security scanners
(Microsoft Safe Links, Proofpoint, Mimecast, etc.) pre-fetch every link in an
incoming email with a real browser, which silently consumes that one-time
token before the real recipient opens the email. Nothing the app does after
the redirect can prevent this, because the token is already spent by the time
the app's page loads.

The app instead expects these emails to link to its own `/reset-password`
page carrying `{{ .TokenHash }}`, and only calls `verifyOtp()` in response to
an explicit form submission (`src/lib/auth/actions.ts`,
`confirmAuthLinkAction`). A scanner's GET-only prefetch can load that page
without ever submitting the form, so the token is never consumed until a
human clicks "Continue" or "Accept Invitation".

**This requires editing both templates in the Supabase Dashboard** (Authentication →
Email Templates) — it cannot be done from application code or migrations:

**Invite user** — replace the `{{ .ConfirmationURL }}` link with:

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=invite">Accept the invitation</a>
```

**Reset Password** — replace the `{{ .ConfirmationURL }}` link with:

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

Until both templates are updated, invite and password-reset emails will link
to the old Supabase-hosted verify URL, which this app no longer knows how to
finish processing (the PKCE callback route and hash-fragment bridge it used
to rely on have been removed) — links will appear broken rather than
insecure. Update the templates before relying on either flow.

## Roles

Roles are constrained by the `profile_role` enum:

- `admin`
- `partner`
- `attorney`
- `staff`
- `billing`
- `read_only`

Profiles default to `read_only` and inactive. The app reads authorization state from `profiles`, not client metadata. Users may update safe profile fields, but not their own role or active status.

## Permission Model

RLS is enabled on every application table. Anonymous access is not granted.

Admins and partners can access all matters. Attorneys and staff can access assigned or explicitly shared matters. Billing and read-only users require matter assignment or explicit sharing. Read-only users do not receive mutation policies.

Temporary simplification: billing users use the same matter-access function for this phase, and field-level confidentiality for `internal_notes` is enforced by data-access discipline. Before production with confidential data, add restricted views or RPCs that omit strategy fields for billing and read-only pathways.

## Database Tables

The migration creates:

- `profiles`
- `carriers`
- `carrier_contacts`
- `organizations`
- `contacts`
- `matters`
- `matter_parties`
- `matter_assignments`
- `evidence_items`
- `tasks`
- `deadlines`
- `matter_events`
- `activity_logs`
- `saved_views`
- `external_references`
- `client_updates`

All tables use UUID primary keys, timestamps, indexes, and RLS. Currency fields use `numeric(14,2)`, not floats. Operational timestamps use `timestamptz`.

## Matter Events vs. Activity Logs

`matter_events` record meaningful legal-matter events, such as demand sent, response received, authority received, recovery received, or matter closed.

`activity_logs` record software audit history: who changed which entity, with previous and new values. Ordinary users may insert audit records through the application path but cannot update or delete them.

## Lifecycle Timestamps

The migration preserves first-occurrence lifecycle timestamps. Stage changes can set first review, investigation, demand-ready, negotiation, recovery, and close timestamps only when the original value is empty.

`matter_events` update lifecycle values for substantive events such as `demand_sent`, `offer_received`, `recovery_received`, and `matter_closed`.

## Stale-Matter Logic

`last_substantive_activity_at` updates for meaningful activity:

- Matter event created for substantive event types
- Task completed
- Demand sent
- Response or offer received
- Authority requested or received
- Litigation or arbitration filed
- Recovery recorded
- Matter closed

It does not update for opening pages, saving personal views, or cosmetic preference changes.

The database function `get_follow_up_matters(stale_days integer default 30)` identifies overdue next actions, missing next actions, stale matters, and unverified statute deadlines. UI mock helpers mirror those categories during development.

## Saved Views

The `saved_views` table stores personal and shared matter views with JSONB `filter_configuration`. The Matters page includes a visual control and a server action for creating personal saved views once Supabase is configured.

## External References

`external_references` stores future integration references for systems such as Clio, Filevine, Litify, DMS tools, or carrier claim systems. No integration is implemented in this phase.

## Client Updates

`client_updates` prepares an approval workflow for future external updates. Records do not become client-published unless approval and publishing fields are present. No external portal is exposed.

## First Administrator

Create the first user through Supabase Auth, then update that profile directly in a trusted SQL session:

```sql
update public.profiles
set role = 'admin', is_active = true
where email = 'admin@example.com';
```

Do not expose this action in public UI.

## MFA Readiness

Supabase supports MFA policies and factors, but this phase does not add a full MFA UI. Future production roles that should require MFA include admins, partners, and any future external users. Production handling of confidential legal data should require MFA, stricter session policies, and additional audit review.

## Deferred

The phase intentionally does not build the Add Matter wizard, Recovery Score, AI features, carrier portal, document uploads, billing, trust accounting, legal deadline calculation, or external integrations.
