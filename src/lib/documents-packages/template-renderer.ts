import type { DocumentTemplateVersion } from "@/lib/documents-packages/types";

export type MergeFieldValues = Record<string, string | number | null | undefined>;

export type RenderedTemplate = {
  subject: string;
  body: string;
  footer: string | null;
  missingRequired: string[];
  renderedValues: Record<string, string>;
};

const mergeFieldPattern = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function renderTemplate(version: DocumentTemplateVersion, values: MergeFieldValues): RenderedTemplate {
  const renderedValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, formatMergeValue(value)])
  );
  const missingRequired = version.mergeFieldSchema.required.filter((field) => !renderedValues[field]);
  return {
    subject: replaceMergeFields(version.subjectTemplate, renderedValues),
    body: replaceMergeFields(version.bodyTemplate, renderedValues),
    footer: version.footerTemplate ? replaceMergeFields(version.footerTemplate, renderedValues) : null,
    missingRequired,
    renderedValues,
  };
}

export function replaceMergeFields(template: string, values: Record<string, string>) {
  return sanitizeTemplateText(template).replace(mergeFieldPattern, (_match, field: string) => values[field] ?? "");
}

export function extractMergeFields(template: string) {
  return Array.from(template.matchAll(mergeFieldPattern)).map((match) => match[1]);
}

export function sanitizeTemplateText(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .trim();
}

function formatMergeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return value.trim();
}
