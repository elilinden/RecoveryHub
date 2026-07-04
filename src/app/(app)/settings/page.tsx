import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Bell, FileText, GitBranch, LockKeyhole, Scale, UserRound, Users } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { RecoveryAssessmentSettings } from "@/components/settings/recovery-assessment-settings";
import { DocumentTemplateSettings } from "@/components/settings/document-template-settings";
import { TriageSettingsForm } from "@/components/settings/triage-settings-form";
import { UserManagementSettings } from "@/components/settings/user-management-settings";
import { Card, CardContent } from "@/components/ui/card";
import { requireActiveProfile } from "@/lib/auth/session";
import { loadDocumentTemplates } from "@/lib/documents-packages/data";
import { loadTriageSettings } from "@/lib/triage/data";
import { listManagedUsers } from "@/lib/users/service";
import { cn } from "@/lib/utils";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type SettingsSection = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  adminOnly?: boolean;
};

const settingsSections: SettingsSection[] = [
  { slug: "profile", title: "Profile", description: "Your name, role, and account details.", icon: UserRound },
  { slug: "workflow", title: "Workflow & Triage", description: "Set the timing rules that decide when a matter gets flagged for attention.", icon: GitBranch },
  { slug: "assessment", title: "Recovery Assessment", description: "The scoring model used to assess recovery matters.", icon: Scale },
  { slug: "documents", title: "Document Templates", description: "Approved templates used to prepare packages.", icon: FileText },
  { slug: "users", title: "User Management", description: "Invite users, assign roles, and manage firm access.", icon: Users, adminOnly: true },
  { slug: "notifications", title: "Notifications", description: "Deadline reminders, missing-information nudges, and referral alerts.", icon: Bell, comingSoon: true },
  { slug: "security", title: "Security", description: "Authentication and session controls.", icon: LockKeyhole, comingSoon: true },
];

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = (await searchParams) ?? {};
  const { profile } = await requireActiveProfile();
  const isAdmin = profile.role === "admin";
  const visibleSections = settingsSections.filter((section) => !section.adminOnly || isAdmin);
  const [triageSettings, documentTemplates] = await Promise.all([loadTriageSettings(profile), loadDocumentTemplates(profile)]);

  const activeSlug = readParam(params.section);
  const active = visibleSections.find((section) => section.slug === activeSlug) ?? visibleSections[0];
  const ActiveIcon = active.icon;
  const managedUsers = active.slug === "users" && isAdmin ? await listManagedUsers() : null;

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Manage your profile, workflow rules, and firm configuration." title="Settings" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto pb-1 lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            const isActive = section.slug === active.slug;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
                href={`/settings?section=${section.slug}`}
                key={section.slug}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{section.title}</span>
                {section.comingSoon ? <span className="ml-auto shrink-0 text-[11px] font-normal text-muted-foreground">Soon</span> : null}
              </Link>
            );
          })}
        </nav>

        <Card className="min-w-0 flex-1 border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{active.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{active.description}</p>
            </div>

            {active.slug === "profile" ? <ProfileSettingsForm profile={profile} /> : null}
            {active.slug === "workflow" ? <TriageSettingsForm result={triageSettings} /> : null}
            {active.slug === "assessment" ? <RecoveryAssessmentSettings profile={profile} /> : null}
            {active.slug === "documents" ? <DocumentTemplateSettings profile={profile} templates={documentTemplates} /> : null}
            {active.slug === "users" && isAdmin ? <UserManagementSettings currentAdminId={profile.id} users={managedUsers} /> : null}
            {active.comingSoon ? (
              <div className="mt-5 flex items-center gap-3 rounded-lg bg-secondary/60 px-4 py-4 text-sm text-muted-foreground">
                <ActiveIcon aria-hidden="true" className="size-5 shrink-0" />
                <span>{active.title} is coming soon. This section will appear here once it&apos;s available.</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
