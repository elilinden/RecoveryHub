export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "partner" | "attorney" | "staff" | "billing" | "read_only";
          job_title: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          role?: "admin" | "partner" | "attorney" | "staff" | "billing" | "read_only";
          job_title?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          job_title?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          role?: "admin" | "partner" | "attorney" | "staff" | "billing" | "read_only";
          updated_at?: string;
        };
        Relationships: [];
      };
      carriers: GenericTable;
      carrier_contacts: GenericTable;
      organizations: GenericTable;
      contacts: GenericTable;
      matters: {
        Row: {
          id: string;
          matter_name: string;
          carrier_id: string | null;
          assigned_adjuster_id: string | null;
          carrier_supervisor_id: string | null;
          carrier_claim_number: string | null;
          firm_matter_number: string | null;
          matter_type: string;
          matter_specific_data: Json;
          date_referred: string | null;
          date_of_loss: string | null;
          jurisdiction: string | null;
          venue: string | null;
          insurance_status: string;
          amount_paid: string | null;
          deductible: string | null;
          anticipated_additional_payments: string | null;
          recoverable_expenses: string | null;
          amount_sought: string | null;
          amount_recovered: string | null;
          estimated_legal_cost: string | null;
          liability_assessment: string;
          collectability_assessment: string;
          stage: string;
          priority: string;
          next_action: string | null;
          next_action_due_date: string | null;
          statute_deadline: string | null;
          statute_deadline_verified: boolean;
          statute_deadline_verified_by: string | null;
          statute_deadline_verified_at: string | null;
          assigned_attorney_id: string | null;
          assigned_staff_id: string | null;
          internal_notes: string | null;
          is_archived: boolean;
          closed_reason: string | null;
          closed_by: string | null;
          archived_at: string | null;
          archived_by: string | null;
          current_status_summary: string | null;
          status_summary_updated_at: string | null;
          status_summary_updated_by: string | null;
          created_by: string | null;
          intake_status: "draft" | "in_progress" | "complete";
          current_intake_step: number;
          last_autosaved_at: string | null;
          referral_received_at: string | null;
          initial_review_completed_at: string | null;
          investigation_started_at: string | null;
          demand_ready_at: string | null;
          demand_sent_at: string | null;
          negotiation_started_at: string | null;
          recovery_received_at: string | null;
          closed_at: string | null;
          last_substantive_activity_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      matter_parties: GenericTable;
      matter_assignments: GenericTable;
      evidence_items: GenericTable;
      tasks: GenericTable;
      deadlines: GenericTable;
      matter_events: GenericTable;
      activity_logs: GenericTable;
      saved_views: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          page: string;
          filter_configuration: Json;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          page: string;
          filter_configuration?: Json;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          filter_configuration?: Json;
          is_shared?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      triage_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: Json;
          description: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value: Json;
          description: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          setting_value?: Json;
          description?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      matter_flags: {
        Row: {
          id: string;
          matter_id: string;
          flag_type: string;
          rule_key: string;
          severity: "critical" | "high" | "medium" | "low" | "informational";
          category: string;
          title: string;
          description: string;
          suggested_action: string | null;
          relevant_date: string | null;
          relevant_user_id: string | null;
          detected_at: string;
          last_evaluated_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_reason: string | null;
          dismissed_until: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      matter_flag_overrides: {
        Row: {
          id: string;
          matter_flag_id: string;
          matter_id: string;
          rule_key: string;
          reason: string;
          expires_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      recovery_assessment_models: GenericTable;
      recovery_assessment_factors: GenericTable;
      recovery_assessment_factor_options: GenericTable;
      recovery_assessments: GenericTable;
      recovery_assessment_responses: GenericTable;
      recovery_assessment_overrides: GenericTable;
      matter_documents: GenericTable;
      evidence_document_links: GenericTable;
      document_templates: GenericTable;
      document_template_versions: GenericTable;
      outbound_packages: GenericTable;
      outbound_package_recipients: GenericTable;
      outbound_package_documents: GenericTable;
      outbound_package_validations: GenericTable;
      outbound_package_reviews: GenericTable;
      external_references: GenericTable;
      client_updates: GenericTable;
    };
    Views: Record<string, never>;
    Functions: {
      can_access_matter: { Args: { matter_uuid: string }; Returns: boolean };
      can_access_document: { Args: { document_uuid: string }; Returns: boolean };
      can_access_package: { Args: { package_uuid: string }; Returns: boolean };
      is_admin: { Args: { user_uuid?: string }; Returns: boolean };
      is_partner_or_admin: { Args: { user_uuid?: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
