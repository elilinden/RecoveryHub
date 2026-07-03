import { describe, expect, it } from "vitest";

import { extractMergeFields, renderTemplate, sanitizeTemplateText } from "@/lib/documents-packages/template-renderer";
import type { DocumentTemplateVersion } from "@/lib/documents-packages/types";

const version: DocumentTemplateVersion = {
  id: "version-1",
  templateId: "template-1",
  versionNumber: 1,
  name: "Approved demand",
  subjectTemplate: "Demand - {{ carrier_claim_number }}",
  bodyTemplate: "Amount: {{amount_demanded}}. Missing: {{response_deadline}}.",
  footerTemplate: "Attorney: {{assigned_attorney}}",
  mergeFieldSchema: {
    required: ["carrier_claim_number", "amount_demanded", "response_deadline"],
    optional: ["assigned_attorney"],
  },
  status: "approved",
  approvedByName: "Eli Linden",
  approvedAt: "2026-07-03T12:00:00.000Z",
  createdAt: "2026-07-03T12:00:00.000Z",
};

describe("template renderer", () => {
  it("renders merge fields without undefined or null text", () => {
    const rendered = renderTemplate(version, {
      carrier_claim_number: "ABC-123",
      amount_demanded: "$12,000",
      response_deadline: null,
      assigned_attorney: undefined,
    });

    expect(rendered.subject).toBe("Demand - ABC-123");
    expect(rendered.body).toBe("Amount: $12,000. Missing: .");
    expect(rendered.footer).toBe("Attorney: ");
    expect(rendered.missingRequired).toEqual(["response_deadline"]);
    expect(rendered.body).not.toContain("undefined");
    expect(rendered.body).not.toContain("null");
  });

  it("extracts and sanitizes template content", () => {
    expect(extractMergeFields("{{matter_name}} {{ amount_demanded }}")).toEqual(["matter_name", "amount_demanded"]);
    expect(sanitizeTemplateText("<p onclick=\"bad()\">Safe</p><script>alert(1)</script>")).toBe("<p>Safe</p>");
  });
});
