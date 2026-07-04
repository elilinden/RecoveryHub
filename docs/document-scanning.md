# Recovery Hub Document Scanning

Uploaded documents are never immediately downloadable. They land with `status = 'processing'` and `scan_status = 'pending'`, and only become downloadable once a scan marks them `status = 'available'` and `scan_status = 'clean'`. This is enforced in the database, not just the application: `can_download_document()` and the `matter-documents` storage policies both require it directly (`supabase/migrations/202607040001_document_quarantine_enforcement.sql`), so it holds even if a client calls the Supabase Storage API directly with a valid signed URL.

External links (`source_type = 'external_link'`) have no file of ours to scan and are exempt from the `scan_status` check, but still require `status = 'available'`.

## Storage Path Enforcement

Uploads must land at `<matter-id>/<document-id>/<filename>`, where `<matter-id>` is a matter the uploader can access. This is enforced by the `matter_document_objects_insert_authorized` storage policy, not just by application code — a client cannot upload to an arbitrary path or a matter it does not have access to, even by calling the Storage API directly.

`document-id` must be the `matter_documents` row's own `id`. The application generates this id before uploading (`createDocumentId()` in `src/lib/documents-packages/storage.ts`) so the storage path and the metadata row stay in sync, and passes it explicitly on insert.

If metadata creation fails after a successful upload, the application deletes the just-uploaded storage object (`deleteOrphanedUpload` in `src/lib/documents-packages/actions.ts`) using the service-role client, so failed uploads do not leave orphaned files in the bucket. This requires `SUPABASE_SERVICE_ROLE_KEY` to be configured; without it, a failed metadata write cannot be cleaned up automatically (there is no client-role delete policy on `storage.objects`).

## Malware Scanning

Scanning uses the [VirusTotal](https://www.virustotal.com/) file-analysis API. Set:

```bash
VIRUSTOTAL_API_KEY=
```

Without it, `scanFileForMalware()` returns `"pending"` rather than pretending to have scanned the file — uploaded documents simply stay unavailable until a real scan resolves them.

The upload action attempts an inline scan immediately after a successful upload as a best-effort fast path. If VirusTotal has not finished analyzing the file within a short poll window, the document is left `scan_status = 'pending'` for the scheduled endpoint below to pick up later — uploads are not held open waiting on a slow scan.

### Prepared Scheduled Endpoint

`POST /api/documents/scan`

Headers:

- `x-document-scan-secret: <DOCUMENT_SCAN_SECRET>`

Environment:

- `DOCUMENT_SCAN_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (required — the route downloads file bytes and updates status using the service-role client)
- `VIRUSTOTAL_API_KEY`

Each call scans up to 20 documents left in `scan_status` `pending` or `scan_failed`, downloads their bytes from storage, submits them to VirusTotal, and updates `status`/`scan_status` accordingly. Flagged documents are quarantined and logged to `activity_logs` as `document_flagged`.

Like `/api/triage/recalculate`, this endpoint is prepared for a secure scheduler but local development does not include a service-role job runner. Do not expose a service-role key to the browser.
