"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

import { submitUploadMatterDocumentsAction } from "@/lib/documents-packages/actions";
import { documentTypeLabels, visibilityLabels } from "@/lib/documents-packages/labels";
import { packageEligibleDocumentTypes } from "@/lib/documents-packages/storage";
import type { EvidenceItem } from "@/lib/matters-workspace/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DocumentUploadPanelProps = {
  matterId: string;
  evidence: EvidenceItem[];
};

export function DocumentUploadPanel({ matterId, evidence }: DocumentUploadPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFiles = files.length > 0;

  useEffect(() => {
    if (!hasFiles) return;
    const listener = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [hasFiles]);

  const fileSummary = useMemo(() => files.map((file) => `${file.name} (${formatBytes(file.size)})`).join(", "), [files]);

  return (
    <form action={submitUploadMatterDocumentsAction} className="space-y-4 rounded-lg border border-border bg-background p-4">
      <input name="matterId" type="hidden" value={matterId} />
      <div
        className={`rounded-lg border border-dashed p-5 text-center transition-colors ${isDragging ? "border-primary bg-[var(--info-muted)]" : "border-border bg-card"}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const droppedFiles = Array.from(event.dataTransfer.files);
          if (inputRef.current) {
            const transfer = new DataTransfer();
            droppedFiles.forEach((file) => transfer.items.add(file));
            inputRef.current.files = transfer.files;
          }
          setFiles(droppedFiles);
        }}
      >
        <UploadCloud aria-hidden="true" className="mx-auto size-8 text-primary" />
        <label className="mt-3 block cursor-pointer text-sm font-medium text-foreground">
          <span>Drop files here or choose files</span>
          <input
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
            className="sr-only"
            multiple
            name="files"
            ref={inputRef}
            type="file"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>
        <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX, XLSX, JPG, JPEG, and PNG up to 25 MB each.</p>
      </div>

      {hasFiles ? (
        <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <p className="min-w-0 truncate text-muted-foreground" title={fileSummary}>{fileSummary}</p>
          <Button aria-label="Clear selected files" className="size-8 shrink-0" size="icon" type="button" variant="ghost" onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
            setFiles([]);
          }}>
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>Document title</span>
          <Input name="title" placeholder="Payment ledger" required />
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>Document type</span>
          <select className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="documentType" defaultValue="proof_of_payment">
            {packageEligibleDocumentTypes.map((type) => (
              <option key={type} value={type}>{documentTypeLabels[type]}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>Document date</span>
          <Input name="documentDate" type="date" />
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>Visibility</span>
          <select className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="visibility" defaultValue="package_eligible">
            {Object.entries(visibilityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground lg:col-span-2">
          <span>Link to evidence</span>
          <select className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="evidenceItemId" defaultValue="">
            <option value="">Do not link now</option>
            {evidence.map((item) => (
              <option key={item.id} value={item.id}>{item.evidenceType.replaceAll("_", " ")} - {item.status}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground lg:col-span-2">
          <span>Description</span>
          <textarea className="min-h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" name="description" />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status">New files remain marked not scanned until a real scanning service updates them.</p>
        <Button disabled={!hasFiles} type="submit">Upload documents</Button>
      </div>
    </form>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
