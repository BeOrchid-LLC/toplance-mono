/**
 * Hand-written to match supabase/migrations/20260821120000_init.sql.
 *
 * Docker was not available in the environment that scaffolded this, so
 * these types could not be generated. Once you have run
 * `npx supabase start`, regenerate them and this file is overwritten
 * with the canonical output:
 *
 *   npm run db:types
 *
 * Do that before trusting these by hand — if the migration and this
 * file ever disagree, the migration is right.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          country_iso: string;
          locale: string;
          role: AppRole;
          staff_role: StaffRole | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email: string;
          phone?: string | null;
          country_iso?: string;
          locale?: string;
          role?: AppRole;
          staff_role?: StaffRole | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      organisations: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          seats_purchased: number;
          billing_contact: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain?: string | null;
          seats_purchased?: number;
          billing_contact?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["organisations"]["Insert"]>;
        Relationships: [];
      };
      org_members: {
        Row: { org_id: string; user_id: string; role: OrgRole; created_at: string };
        Insert: { org_id: string; user_id: string; role?: OrgRole };
        Update: Partial<Database["public"]["Tables"]["org_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          full_name: string;
          job_title: string | null;
          destination_iso: string | null;
          purpose: TravelPurpose | null;
          status: InvitationStatus;
          token: string;
          invited_by: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          full_name?: string;
          job_title?: string | null;
          destination_iso?: string | null;
          purpose?: TravelPurpose | null;
          status?: InvitationStatus;
          invited_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
        Relationships: [];
      };
      corridors: {
        Row: {
          id: string;
          nationality_iso: string;
          destination_iso: string;
          purpose: TravelPurpose;
          visa_name: string;
          version: number;
          effective_from: string;
          source_name: string | null;
          source_url: string | null;
          processing_weeks_min: number | null;
          processing_weeks_max: number | null;
          government_fee_minor: number | null;
          government_fee_currency: string | null;
          is_live: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nationality_iso: string;
          destination_iso: string;
          purpose: TravelPurpose;
          visa_name: string;
          version?: number;
          effective_from?: string;
          source_name?: string | null;
          source_url?: string | null;
          processing_weeks_min?: number | null;
          processing_weeks_max?: number | null;
          government_fee_minor?: number | null;
          government_fee_currency?: string | null;
          is_live?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["corridors"]["Insert"]>;
        Relationships: [];
      };
      corridor_requirements: {
        Row: {
          id: string;
          corridor_id: string;
          doc_key: string;
          name: string;
          description: string | null;
          category: string;
          is_required: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          corridor_id: string;
          doc_key: string;
          name: string;
          description?: string | null;
          category?: string;
          is_required?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["corridor_requirements"]["Insert"]>;
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          case_ref: string;
          traveler_id: string;
          org_id: string | null;
          corridor_id: string | null;
          status: ApplicationStatus;
          assignee_id: string | null;
          intake_complete: boolean;
          submitted_at: string | null;
          decided_at: string | null;
          sla_due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_ref?: string;
          traveler_id: string;
          org_id?: string | null;
          corridor_id?: string | null;
          status?: ApplicationStatus;
          assignee_id?: string | null;
          intake_complete?: boolean;
          submitted_at?: string | null;
          decided_at?: string | null;
          sla_due_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
        // Embedded selects (`.select("*, profiles(...)")`) resolve through
        // these. `supabase gen types` emits the same shape.
        Relationships: [
          {
            foreignKeyName: "applications_traveler_id_fkey";
            columns: ["traveler_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_corridor_id_fkey";
            columns: ["corridor_id"];
            isOneToOne: false;
            referencedRelation: "corridors";
            referencedColumns: ["id"];
          },
        ];
      };
      intake_answers: {
        Row: {
          id: string;
          application_id: string;
          question_key: string;
          value: string;
          answered_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          question_key: string;
          value: string;
        };
        Update: Partial<Database["public"]["Tables"]["intake_answers"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          application_id: string;
          doc_key: string;
          name: string;
          state: DocumentState;
          storage_path: string | null;
          reason: string | null;
          attempts: number;
          is_required: boolean;
          sort_order: number;
          checked_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          doc_key: string;
          name: string;
          state?: DocumentState;
          storage_path?: string | null;
          reason?: string | null;
          attempts?: number;
          is_required?: boolean;
          sort_order?: number;
          checked_at?: string | null;
          verified_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          application_id: string;
          sender_id: string | null;
          sender_role: AppRole;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          application_id: string;
          sender_id?: string | null;
          sender_role: AppRole;
          body: string;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      status_events: {
        Row: {
          id: string;
          application_id: string;
          from_status: ApplicationStatus | null;
          to_status: ApplicationStatus;
          message: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          from_status?: ApplicationStatus | null;
          to_status: ApplicationStatus;
          message?: string | null;
          actor_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["status_events"]["Insert"]>;
        Relationships: [];
      };
      itineraries: {
        Row: {
          id: string;
          application_id: string;
          payload: Json;
          generated_at: string;
        };
        Insert: { id?: string; application_id: string; payload?: Json };
        Update: Partial<Database["public"]["Tables"]["itineraries"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          subject_type: string;
          subject_id: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          actor_id?: string | null;
          action: string;
          subject_type: string;
          subject_id?: string | null;
          meta?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      /**
       * Everything an employer may see about a sponsored application.
       * There is no document column here, and there must never be one.
       */
      org_application_progress: {
        Row: {
          id: string | null;
          case_ref: string | null;
          org_id: string | null;
          full_name: string | null;
          email: string | null;
          status: ApplicationStatus | null;
          destination_iso: string | null;
          visa_name: string | null;
          submitted_at: string | null;
          updated_at: string | null;
          documents_total: number | null;
          documents_verified: number | null;
          completion_pct: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      application_completion: {
        Args: { app_id: string };
        Returns: { total: number; verified: number; pct: number }[];
      };
    };
    Enums: {
      app_role: AppRole;
      staff_role: StaffRole;
      org_role: OrgRole;
      application_status: ApplicationStatus;
      document_state: DocumentState;
      travel_purpose: TravelPurpose;
      invitation_status: InvitationStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};

type AppRole = "traveler" | "org_member" | "staff";
type StaffRole = "reviewer" | "owner";
type OrgRole = "hr_admin" | "owner";
type ApplicationStatus =
  | "draft"
  | "collecting_documents"
  | "submitted"
  | "under_review"
  | "additional_documents"
  | "approved"
  | "rejected";
type DocumentState =
  | "not_started"
  | "uploaded"
  | "checking"
  | "verified"
  | "flagged"
  | "failed";
type TravelPurpose = "tourism" | "work" | "study" | "medical" | "relocation";
type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
