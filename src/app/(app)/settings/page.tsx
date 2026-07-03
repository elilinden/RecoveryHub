import { Bell, Building2, GitBranch, LockKeyhole, Scale, UserRound } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { RecoveryAssessmentSettings } from "@/components/settings/recovery-assessment-settings";
import { TriageSettingsForm } from "@/components/settings/triage-settings-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireActiveProfile } from "@/lib/auth/session";
import { loadTriageSettings } from "@/lib/triage/data";

const settingsSections = [
  {
    title: "Profile",
    description: "Name, role, and internal account details.",
    icon: UserRound,
  },
  {
    title: "Firm preferences",
    description: "Default matter views, currency display, and work queue settings.",
    icon: Building2,
  },
  {
    title: "Workflow & Triage",
    description: "Operational thresholds that drive rule-based attention flags.",
    icon: GitBranch,
  },
  {
    title: "Recovery Assessment",
    description: "Versioned scoring models and recommendation bands.",
    icon: Scale,
  },
  {
    title: "Notifications",
    description: "Deadline reminders, missing information nudges, and referral alerts.",
    icon: Bell,
  },
  {
    title: "Security",
    description: "Authentication and session controls will be connected later.",
    icon: LockKeyhole,
  },
];

export default async function SettingsPage() {
  const { profile } = await requireActiveProfile();
  const triageSettings = await loadTriageSettings(profile);

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Nonfunctional placeholders for future firm and account controls." title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;

          return (
            <Card className="border-border bg-card shadow-sm" key={section.title}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <SectionHeader description={section.description} title={section.title} />
                    {section.title === "Profile" ? (
                      <ProfileSettingsForm profile={profile} />
                    ) : section.title === "Workflow & Triage" ? (
                      <TriageSettingsForm result={triageSettings} />
                    ) : section.title === "Recovery Assessment" ? (
                      <RecoveryAssessmentSettings profile={profile} />
                    ) : (
                      <div className="mt-5 rounded-lg border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
                        Configuration controls will be added in a later phase.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
