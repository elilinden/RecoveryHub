# Recovery Hub Triage Recalculation

Recovery Hub evaluates matter attention flags with transparent server-side rules. The rules do not assign a Recovery Score and do not make legal decisions.

## Manual Refresh

Users with access to the Dashboard can use **Refresh Triage** to re-evaluate permitted matters. The refresh action:

- evaluates the centralized rule set;
- updates matching active flags instead of creating duplicates;
- resolves active flags when their rule no longer applies;
- preserves resolved flag history.

Matter Detail also includes **Recheck Matter** for a single permitted matter.

## Prepared Scheduled Endpoint

`POST /api/triage/recalculate`

Headers:

- `x-triage-secret: <TRIAGE_RECALCULATION_SECRET>`

Environment:

- `TRIAGE_RECALCULATION_SECRET`

The endpoint is prepared for a secure scheduler, but local development does not include a service-role job runner. In its current form it requires an authenticated admin or partner session, so production scheduling should either:

- call it from a trusted authenticated job context, or
- replace the session lookup with an explicitly reviewed service-role Supabase function.

Do not expose a service-role key to the browser.

## Time-Based Rules

Scheduled or manual recalculation keeps these flags current:

- urgent and upcoming statute deadlines;
- overdue next actions;
- stale matters using `last_substantive_activity_at`;
- overdue tasks and deadlines;
- awaiting response and awaiting carrier instruction;
- draft intake age.

Autosaves are not substantive matter activity.
