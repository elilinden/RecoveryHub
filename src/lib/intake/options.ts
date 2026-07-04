import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { IntakeCarrierContact, IntakeOptions, IntakeUser } from "@/lib/intake/types";

const developmentOptions: IntakeOptions = {
  mode: "development",
  carriers: [
    { id: "10000000-0000-4000-8000-000000000001", name: "Northstar Mutual", shortName: "Northstar" },
    { id: "10000000-0000-4000-8000-000000000002", name: "Summit Casualty", shortName: "Summit" },
    { id: "10000000-0000-4000-8000-000000000003", name: "Evergreen Indemnity", shortName: "Evergreen" },
    { id: "10000000-0000-4000-8000-000000000004", name: "Pioneer Risk", shortName: "Pioneer" },
  ],
  carrierContacts: [
    {
      id: "11000000-0000-4000-8000-000000000001",
      carrierId: "10000000-0000-4000-8000-000000000001",
      fullName: "Renee Hollis",
      email: "renee.hollis@example.test",
      phone: "555-0101",
      jobTitle: "Claims Adjuster",
      department: "Auto Recovery",
      contactType: "adjuster",
      supervisorContactId: "11000000-0000-4000-8000-000000000002",
    },
    {
      id: "11000000-0000-4000-8000-000000000002",
      carrierId: "10000000-0000-4000-8000-000000000001",
      fullName: "Graham Porter",
      email: "graham.porter@example.test",
      phone: "555-0102",
      jobTitle: "Claims Supervisor",
      department: "Recovery",
      contactType: "supervisor",
    },
    {
      id: "11000000-0000-4000-8000-000000000003",
      carrierId: "10000000-0000-4000-8000-000000000002",
      fullName: "Owen Mercer",
      email: "owen.mercer@example.test",
      phone: "555-0103",
      jobTitle: "Property Adjuster",
      department: "Property",
      contactType: "adjuster",
      supervisorContactId: "11000000-0000-4000-8000-000000000004",
    },
    {
      id: "11000000-0000-4000-8000-000000000004",
      carrierId: "10000000-0000-4000-8000-000000000002",
      fullName: "Lena Ortiz",
      email: "lena.ortiz@example.test",
      phone: "555-0104",
      jobTitle: "Claims Supervisor",
      department: "Property",
      contactType: "supervisor",
    },
  ],
  users: [
    { id: "00000000-0000-4000-8000-000000000001", fullName: "Ava Chen", role: "admin", jobTitle: "Operations Administrator" },
    { id: "00000000-0000-4000-8000-000000000002", fullName: "Peter Lawson", role: "partner", jobTitle: "Partner" },
    { id: "00000000-0000-4000-8000-000000000003", fullName: "Eli Linden", role: "attorney", jobTitle: "Attorney" },
    { id: "00000000-0000-4000-8000-000000000004", fullName: "Maya Patel", role: "staff", jobTitle: "Recovery Specialist" },
    { id: "00000000-0000-4000-8000-000000000005", fullName: "Blair Monroe", role: "billing", jobTitle: "Billing Analyst" },
  ],
  contacts: [
    { id: "13000000-0000-4000-8000-000000000001", firstName: "Nolan", lastName: "Reed" },
    { id: "13000000-0000-4000-8000-000000000003", firstName: "Drew", lastName: "Hale" },
  ],
  organizations: [
    { id: "12000000-0000-4000-8000-000000000001", name: "Cedar Ridge Apartments", organizationType: "business" },
    { id: "12000000-0000-4000-8000-000000000003", name: "Fairlane Repair Group", organizationType: "repair_facility" },
  ],
  permission: {
    canCreateMatter: true,
    canVerifyDeadline: true,
    canAddCarrier: true,
    canAddCarrierContact: true,
  },
};

function getRolePermissions(role?: IntakeUser["role"]) {
  const canCreateMatter = role ? ["admin", "partner", "attorney", "staff"].includes(role) : false;
  return {
    canCreateMatter,
    canVerifyDeadline: role ? ["admin", "partner", "attorney"].includes(role) : false,
    canAddCarrier: canCreateMatter,
    canAddCarrierContact: canCreateMatter,
  };
}

export async function getIntakeOptions(): Promise<IntakeOptions> {
  if (!isSupabaseConfigured()) {
    return developmentOptions;
  }

  const supabase = await createClient();

  const [
    { data: profile },
    { data: carriers },
    { data: contacts },
    { data: users },
    { data: people },
    { data: organizations },
  ] = await Promise.all([
    supabase.from("profiles").select("id,role").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle(),
    supabase.from("carriers").select("id,name,short_name").eq("is_active", true).order("name"),
    supabase
      .from("carrier_contacts")
      .select("id,carrier_id,full_name,email,phone,job_title,department,contact_type,supervisor_contact_id")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("profiles")
      .select("id,full_name,role,job_title")
      .eq("is_active", true)
      .in("role", ["admin", "partner", "attorney", "staff", "billing"])
      .order("full_name"),
    supabase.from("contacts").select("id,first_name,last_name,organization_id").order("last_name"),
    supabase.from("organizations").select("id,name,organization_type").order("name"),
  ]);

  const role = (profile as { role?: IntakeUser["role"] } | null)?.role;

  return {
    mode: "database",
    carriers:
      carriers?.map((carrier) => ({
        id: String(carrier.id),
        name: String(carrier.name),
        shortName: carrier.short_name ? String(carrier.short_name) : null,
      })) ?? [],
    carrierContacts:
      contacts?.map((contact) => ({
        id: String(contact.id),
        carrierId: String(contact.carrier_id),
        fullName: String(contact.full_name),
        email: contact.email ? String(contact.email) : null,
        phone: contact.phone ? String(contact.phone) : null,
        jobTitle: contact.job_title ? String(contact.job_title) : null,
        department: contact.department ? String(contact.department) : null,
        contactType: contact.contact_type as IntakeCarrierContact["contactType"],
        supervisorContactId: contact.supervisor_contact_id ? String(contact.supervisor_contact_id) : null,
      })) ?? [],
    users:
      users?.map((user) => ({
        id: String(user.id),
        fullName: String(user.full_name),
        role: user.role as IntakeUser["role"],
        jobTitle: user.job_title ? String(user.job_title) : null,
      })) ?? [],
    contacts:
      people?.map((person) => ({
        id: String(person.id),
        firstName: String(person.first_name),
        lastName: String(person.last_name),
        organizationId: person.organization_id ? String(person.organization_id) : null,
      })) ?? [],
    organizations:
      organizations?.map((organization) => ({
        id: String(organization.id),
        name: String(organization.name),
        organizationType: String(organization.organization_type),
      })) ?? [],
    permission: getRolePermissions(role),
  };
}
