import { NextResponse } from "next/server";

import { requireActiveProfile } from "@/lib/auth/session";
import { createSignedDocumentAccessUrl } from "@/lib/documents-packages/file-access";

type DownloadRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: DownloadRouteProps) {
  await requireActiveProfile();
  const { id } = await params;
  const access = await createSignedDocumentAccessUrl(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }
  return NextResponse.redirect(access.url, {
    headers: {
      "Cache-Control": "no-store",
      "X-Recovery-Hub-Signed-Access-Seconds": String(access.expiresInSeconds),
    },
  });
}
