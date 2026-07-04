export type IntakeCarrier = {
  id: string;
  name: string;
  shortName?: string | null;
};

export type IntakeCarrierContact = {
  id: string;
  carrierId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  contactType: "adjuster" | "supervisor" | "claims_manager" | "billing_contact" | "other";
  supervisorContactId?: string | null;
};

export type IntakeUser = {
  id: string;
  fullName: string;
  role: "admin" | "partner" | "attorney" | "staff" | "billing" | "read_only";
  jobTitle?: string | null;
};

export type IntakeOptions = {
  carriers: IntakeCarrier[];
  carrierContacts: IntakeCarrierContact[];
  users: IntakeUser[];
  contacts: Array<{ id: string; firstName: string; lastName: string; organizationId?: string | null }>;
  organizations: Array<{ id: string; name: string; organizationType: string }>;
  permission: {
    canCreateMatter: boolean;
    canVerifyDeadline: boolean;
    canAddCarrier: boolean;
    canAddCarrierContact: boolean;
  };
  mode: "database" | "development";
};

export function filterContactsByCarrier(contacts: IntakeCarrierContact[], carrierId: string, type?: IntakeCarrierContact["contactType"]) {
  return contacts.filter((contact) => contact.carrierId === carrierId && (!type || contact.contactType === type));
}
