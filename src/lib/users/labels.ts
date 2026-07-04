import type { ProfileRole } from "@/lib/data/profiles";

export const roleLabels: Record<ProfileRole, string> = {
  admin: "Admin",
  partner: "Partner",
  attorney: "Attorney",
  staff: "Staff",
  billing: "Billing",
  read_only: "Read Only",
};

export const profileRoleValues = ["admin", "partner", "attorney", "staff", "billing", "read_only"] as const;
