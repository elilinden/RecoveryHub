import { FileText } from "lucide-react";

import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { submitApproveTemplateVersionAction } from "@/lib/documents-packages/actions";
import { templateTypeLabels, templateVersionStatusLabels } from "@/lib/documents-packages/labels";
import type { DocumentTemplate } from "@/lib/documents-packages/types";
import type { Profile } from "@/lib/data/profiles";
import { permissionsForRole } from "@/lib/documents-packages/types";

type DocumentTemplateSettingsProps = {
  profile: Profile;
  templates: DocumentTemplate[];
};

export function DocumentTemplateSettings({ profile, templates }: DocumentTemplateSettingsProps) {
  const permissions = permissionsForRole(profile.role);
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
        Templates are non-AI, versioned, and approved before package use. Approved versions are preserved for historical packages.
      </div>
      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
          No approved template is available. An authorized user must approve a template before the package can be finalized.
        </div>
      ) : (
        templates.map((template) => (
          <Card className="border-border bg-card shadow-sm" key={template.id}>
            <CardContent className="space-y-4 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <FileText aria-hidden="true" className="size-4" />
                </div>
                <div className="min-w-0">
                  <SectionHeader
                    description={`${templateTypeLabels[template.templateType]}${template.matterType ? ` · ${template.matterType.replaceAll("_", " ")}` : ""}`}
                    title={template.name}
                  />
                  {template.description ? <p className="mt-2 text-sm text-muted-foreground">{template.description}</p> : null}
                </div>
              </div>
              <div className="grid gap-3">
                {template.versions.map((version) => (
                  <div className="rounded-lg border border-border bg-background p-3" key={version.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">v{version.versionNumber}: {version.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {templateVersionStatusLabels[version.status]}
                          {version.approvedAt ? ` · Approved ${version.approvedAt.slice(0, 10)} by ${version.approvedByName ?? "authorized user"}` : ""}
                        </p>
                      </div>
                      {permissions.canManageTemplates && version.status === "draft" ? (
                        <form action={submitApproveTemplateVersionAction}>
                          <input name="versionId" type="hidden" value={version.id} />
                          <Button size="sm" type="submit">Approve Version</Button>
                        </form>
                      ) : null}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-foreground">Preview merge fields</summary>
                      <div className="mt-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
                        <p><span className="font-medium text-foreground">Required:</span> {version.mergeFieldSchema.required.join(", ") || "None"}</p>
                        <p className="mt-1"><span className="font-medium text-foreground">Optional:</span> {version.mergeFieldSchema.optional.join(", ") || "None"}</p>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
