import {
  FileText,
  Gauge,
  PackageCheck,
  Scale,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type HelpImage = {
  src: string;
  alt: string;
};

// Intrinsic pixel dimensions for each screenshot, required by next/image.
export const helpImageDimensions: Record<string, { width: number; height: number }> = {
  "/help/dashboard-action-center.png": { width: 2940, height: 1398 },
  "/help/dashboard-insights.png": { width: 2940, height: 1388 },
  "/help/matters-list.png": { width: 2940, height: 1396 },
  "/help/packages.png": { width: 2940, height: 1396 },
  "/help/matter-detail-header.png": { width: 2940, height: 1388 },
  "/help/matter-tasks-deadlines.png": { width: 2940, height: 1392 },
  "/help/matter-financials.png": { width: 2940, height: 1394 },
  "/help/matter-documents.png": { width: 2940, height: 1396 },
  "/help/matter-assessment.png": { width: 2940, height: 1394 },
};

export type HelpBlock = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  image?: HelpImage;
};

export type HelpSection = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  blocks: HelpBlock[];
};

export const helpSections: HelpSection[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "What Recovery Hub is and how access works.",
    icon: ShieldCheck,
    blocks: [
      {
        paragraphs: [
          "Recovery Hub is the firm's internal workspace for tracking subrogation and recovery matters end to end: intake, investigation, demand preparation, negotiation, and closing.",
          "There is no public sign-up. An administrator invites every user by email from Settings → User Management. You'll receive an email with a link to accept the invitation and set your password.",
          "Every account has a role that determines what you can see and do: Admin, Partner, Attorney, Staff, Billing, or Read Only. If something in this guide describes an action you can't find, your role likely doesn't include it — ask an administrator.",
          "New accounts start inactive until an administrator activates them, and admins can deactivate an account at any time without deleting it. If you're signed out unexpectedly and told your account is inactive, contact an administrator.",
        ],
      },
    ],
  },
  {
    slug: "dashboard",
    title: "Dashboard",
    description: "Your daily starting point — what needs attention right now.",
    icon: Gauge,
    blocks: [
      {
        heading: "My Work vs. Firm Overview",
        paragraphs: [
          "The toggle near the top switches between \"My Work\" (matters assigned to or responsible-person'd to you) and \"Firm Overview\" (everything the firm is tracking). Firm Overview is only available to admins and partners.",
          "The four tiles at the top (Urgent matters, Tasks due, Deadlines approaching, Ready for demand) are quick counts — click into Matters and filter if you want the full list behind any of them.",
        ],
      },
      {
        heading: "Action Center",
        paragraphs: [
          "This is the main thing to check every day. It's organized into tabs — Urgent, My Tasks, Deadlines, Follow-Up — each a queue of matters that need a decision, not just information.",
          "Each card shows why the matter is flagged (e.g. \"Urgent statute deadline\"), who's responsible, when it's due, and the dollar amount at stake, with a direct \"Open Matter\" button.",
        ],
        image: { src: "/help/dashboard-action-center.png", alt: "Dashboard Action Center showing the Urgent tab with flagged matters" },
      },
      {
        heading: "Insights",
        paragraphs: [
          "Below the Action Center, Insights holds lower-priority information worth checking when you have time but that doesn't need immediate action — Ready for Demand, High-Value Opportunities, Assessment Needed, New Referrals, and Recent Activity.",
          "Click \"Refresh\" in the top-right at any time to re-run the flagging rules — useful if you just made a change elsewhere and want the dashboard to reflect it immediately.",
        ],
        image: { src: "/help/dashboard-insights.png", alt: "Dashboard Insights section with Ready for Demand and other tabs" },
      },
    ],
  },
  {
    slug: "matters",
    title: "Matters",
    description: "The list of every recovery matter, with search, filters, and saved views.",
    icon: Scale,
    blocks: [
      {
        paragraphs: [
          "The Matters page is a searchable, filterable table of every matter you have access to. Search by matter name, claim number, carrier, party, or assignee. The dropdown next to search switches between preset sorts like \"Needs attention.\"",
          "\"Filters\" opens a detailed panel (carrier, adjuster, matter type, stage, priority, financial thresholds, deadline windows, and more) for narrowing the list precisely. \"Saved Views\" lets you save a combination of filters to return to later — personal by default, or shared with the firm if you're a partner or admin.",
          "Click \"Add Matter\" to start the intake wizard for a brand-new matter, which walks through the required fields step by step and autosaves your progress as a draft.",
          "Each row shows the current stage, next action and its due date, and a \"Primary issue\" badge (e.g. Action overdue, Missing information) so you can triage the list at a glance without opening every matter.",
        ],
        image: { src: "/help/matters-list.png", alt: "Matters list with search, filters, and a table of matters" },
      },
    ],
  },
  {
    slug: "matter-detail",
    title: "Matter Detail",
    description: "Everything about one matter, organized into tabs.",
    icon: FileText,
    blocks: [
      {
        heading: "Header, status, and open issues",
        paragraphs: [
          "The top of a matter page always shows the matter name, carrier, claim number, and responsible attorney, plus status badges (priority, stage, and any critical warnings) and quick actions like Edit Status, Add Task, and Add Deadline.",
          "Below that, an \"open issues\" panel lists anything automatically flagged for this specific matter — the same rules that power the Dashboard's Action Center, but scoped to this one matter.",
        ],
        image: { src: "/help/matter-detail-header.png", alt: "Matter detail page header with status, open issues, and tabs" },
      },
      {
        heading: "Overview tab",
        paragraphs: [
          "A read-through summary of the matter: parties involved, insurance status, jurisdiction, liability and collectability assessments, and the current status summary — the fastest way to get oriented on a matter you haven't looked at before.",
        ],
      },
      {
        heading: "Work tab — Tasks and Deadlines",
        paragraphs: [
          "Tasks are the concrete to-do items for a matter — title, priority, due date, status, and a longer description. Edit an existing task inline and click Save, or fill in the blank row at the bottom and click Add Task.",
          "Deadlines are date-sensitive commitments (statute of limitations, filing deadlines, etc.) with an optional reminder date and a Verified checkbox — mark a deadline verified once you've personally confirmed the date is correct, since unverified statute deadlines are treated as a critical open issue.",
        ],
        image: { src: "/help/matter-tasks-deadlines.png", alt: "Work tab showing Tasks and Deadlines forms" },
      },
      {
        heading: "Financials tab",
        paragraphs: [
          "The left side is a read-only summary (amount sought, recovered, remaining, expected net value). The right side is the editable form for the underlying figures — amount paid by the carrier, deductible, additional payments, recoverable expenses, amount sought, estimated legal cost, and amount recovered. Update the figures and click \"Update Financials\" to save.",
        ],
        image: { src: "/help/matter-financials.png", alt: "Financials tab with summary and an editable financial figures form" },
      },
      {
        heading: "Evidence tab",
        paragraphs: [
          "Tracks the supporting evidence a matter needs — police or incident reports, photographs, witness statements, repair estimates, medical records, and similar — each with a status (Received, Requested, Missing, Not Available, or Not Applicable) and dates requested/received.",
          "This is separate from the Documents & Packages tab: Evidence tracks whether you *have* something, while Documents stores the actual files. You can link an uploaded document to an evidence item so the two stay connected.",
        ],
      },
      {
        heading: "Documents & Packages tab",
        paragraphs: [
          "The Documents sub-tab is the matter's file library. Drag files in or choose them, then fill in a title, document type, optional date, visibility level, and optionally link the upload to an evidence item. Supported types are PDF, DOCX, XLSX, JPG, and PNG, up to 25 MB each.",
          "Every upload is scanned for malware before it becomes downloadable — a newly uploaded file shows as \"processing\" briefly while that happens, which is expected and not an error.",
          "The Packages sub-tab is where you assemble an outbound package (e.g. a demand package) from one or more documents, track its review/approval status, and record recipients. Recovery Hub currently prepares and approves packages but does not send them — see the notice on the Packages page for details.",
        ],
        image: { src: "/help/matter-documents.png", alt: "Documents & Packages tab showing the Document Library upload form" },
      },
      {
        heading: "Assessment tab",
        paragraphs: [
          "Summarizes the matter's Recovery Assessment: recovery viability (0–100), expected net value, data completeness, and urgency. Click \"Open Assessment\" to fill in or update the underlying scoring factors, which are configured per matter type in Settings → Recovery Assessment.",
          "The assessment score never changes a matter's stage automatically — it's informational, to help attorneys and partners prioritize their time.",
        ],
        image: { src: "/help/matter-assessment.png", alt: "Assessment tab showing recovery viability, expected net value, and data completeness" },
      },
      {
        heading: "Activity tab",
        paragraphs: [
          "A combined timeline of manually logged events (demand sent, response received, etc.) and system-generated activity (uploads, status changes) for the matter, newest first.",
          "To add an entry: pick an event type, optionally set a time (it defaults to right now — if the event actually happened earlier or on a different day, just say so in the description), write a short description, and click Add Event.",
          "You can strike through your own manually added entries at any point using the \"⋯\" menu on that entry — the entry stays visible with a line through it rather than disappearing, so the record is preserved. Administrators can strike through or permanently delete any entry. System-generated activity (uploads, status changes) can never be struck through or deleted by anyone — it's a permanent audit trail.",
        ],
      },
    ],
  },
  {
    slug: "packages",
    title: "Packages",
    description: "Preparing, reviewing, and approving outbound packages.",
    icon: PackageCheck,
    blocks: [
      {
        paragraphs: [
          "This page is a firm-wide queue across every matter's packages, organized into quick-filter tiles (My Drafts, Needs Validation, Ready for Review, Changes Requested, Approved for Send, Unverified Recipients, Missing Attachments, Upcoming Response Deadlines) plus a searchable, filterable table below.",
          "A package moves through a review workflow: assembled as a draft, submitted for review, either sent back with \"Changes Requested\" or approved. Only an attorney, partner, or administrator can give final approval.",
          "The banner near the top — \"Delivery not enabled\" — is a reminder that Recovery Hub currently stops at approval. Packages are not emailed or otherwise sent from inside the app yet; approved packages still need to be delivered through your normal outside-the-app process. You can dismiss that banner for your current session.",
        ],
        image: { src: "/help/packages.png", alt: "Packages page with quick-filter tiles and the Package Queue table" },
      },
    ],
  },
  {
    slug: "settings",
    title: "Settings",
    description: "Your profile, firm configuration, and (for admins) user access.",
    icon: Settings,
    blocks: [
      {
        heading: "Profile",
        paragraphs: [
          "Your own name, job title, and avatar URL. Your role and active status are shown for reference but can't be changed here — only an administrator can change those, from User Management."],
      },
      {
        heading: "Workflow & Triage",
        paragraphs: [
          "Configures the timing rules that decide when a matter gets automatically flagged for attention on the Dashboard and in Matter Detail — for example, how many days without activity counts as \"stale,\" or how close to a deadline counts as \"urgent.\" Changes here affect flags firm-wide."],
      },
      {
        heading: "Recovery Assessment",
        paragraphs: [
          "Defines the scoring model used by the Assessment tab on each matter — the factors, weights, and options that produce a matter's viability score, expected value, and completeness percentage. Models can differ by matter type."],
      },
      {
        heading: "Document Templates",
        paragraphs: [
          "Approved templates used when preparing outbound packages (e.g. a standard demand letter template). Templates are versioned; a partner or administrator must approve a new version before it can be used in a real package."],
      },
      {
        heading: "User Management (administrators only)",
        paragraphs: [
          "Only visible to admins. Invite new users by email, assign their role and job title, and choose whether their account is active immediately or held for later activation.",
          "From the actions menu on any user you can edit their details, deactivate or reactivate their access, resend an invitation that hasn't been accepted yet, or remove their access entirely (which deactivates them — it does not delete their account or history). An administrator can never deactivate or demote their own account, and the system won't allow the firm's last active administrator to be removed."],
      },
    ],
  },
  {
    slug: "roles",
    title: "Roles & Access",
    description: "What each role can see and do.",
    icon: ShieldCheck,
    blocks: [
      {
        paragraphs: [
          "Recovery Hub reads your permissions from your assigned role, not anything you can change yourself. Roughly, from most to least access:",
        ],
        bullets: [
          "Admin — full access to every matter, all settings, and User Management. The only role that can invite users, change roles, or permanently delete an activity entry.",
          "Partner — full access to every matter and most settings (excluding User Management); can approve packages, manage shared saved views, and access Firm Overview on the Dashboard.",
          "Attorney — full access to assigned or shared matters, including editing financials, approving packages, and managing tasks, deadlines, and evidence.",
          "Staff — can edit assigned or shared matters (tasks, evidence, documents, events) but cannot give final package approval or manage firm-wide settings.",
          "Billing — primarily read access to matters they're assigned or shared on, focused on financial information; cannot edit case-strategy fields like internal notes.",
          "Read Only — view-only access to matters they're assigned or shared on; cannot add events, upload documents, or edit anything.",
        ],
      },
      {
        paragraphs: [
          "If a button or field described elsewhere in this guide doesn't appear for you, that's almost always your role — not a bug. Ask an administrator if you believe your access should be different.",
        ],
      },
    ],
  },
];
