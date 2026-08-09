export type TripStatus = "planning" | "active" | "booked" | "completed" | "archived";

export type TripAiOutputType =
  | "structured_plan"
  | "brief"
  | "itinerary"
  | "budget"
  | "email_draft"
  | "accommodation_ideas"
  | "activity_ideas"
  | "flight_notes";

export type TripAiOutputStatus = "draft" | "approved" | "archived";

export type ProfileStatus = "pending" | "approved" | "rejected";
export type ProfileRole = "owner" | "family" | "user";

export type CalendarConnectionProvider = "google" | "airbnb";
export type CalendarConnectionStatus = "connected" | "syncing" | "error" | "disconnected";
/** DB-level source — narrower than the client's CalendarEventSource: 'trip' is
 * never stored here, it's synthesized at the query layer from the trips table. */
export type CalendarEventDbSource = "manual" | "airbnb" | "google";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          status: ProfileStatus;
          role: ProfileRole;
          approved_by: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          status?: ProfileStatus;
          role?: ProfileRole;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          [key: string]: unknown;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          status?: ProfileStatus;
          role?: ProfileRole;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          destination: string;
          departure_city: string | null;
          date_window: string | null;
          duration_days: number | null;
          travelers: number;
          budget_min: number | null;
          budget_max: number | null;
          currency: string;
          interests: string[];
          travel_style: string | null;
          notes: string | null;
          raw_plan: string | null;
          status: TripStatus;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          destination: string;
          departure_city?: string | null;
          date_window?: string | null;
          duration_days?: number | null;
          travelers?: number;
          budget_min?: number | null;
          budget_max?: number | null;
          currency?: string;
          interests?: string[];
          travel_style?: string | null;
          notes?: string | null;
          raw_plan?: string | null;
          status?: TripStatus;
          [key: string]: unknown;
        };
        Update: {
          title?: string;
          destination?: string;
          departure_city?: string | null;
          date_window?: string | null;
          duration_days?: number | null;
          travelers?: number;
          budget_min?: number | null;
          budget_max?: number | null;
          currency?: string;
          interests?: string[];
          travel_style?: string | null;
          notes?: string | null;
          raw_plan?: string | null;
          status?: TripStatus;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      trip_ai_outputs: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          type: TripAiOutputType;
          title: string;
          content: Record<string, unknown>;
          metadata: Record<string, unknown>;
          status: TripAiOutputStatus;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          type: TripAiOutputType;
          title: string;
          content?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          status?: TripAiOutputStatus;
          [key: string]: unknown;
        };
        Update: {
          title?: string;
          content?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          status?: TripAiOutputStatus;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      ai_cost_logs: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string | null;
          feature: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          estimated_cost_usd: number;
          created_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id?: string | null;
          feature: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          estimated_cost_usd: number;
          [key: string]: unknown;
        };
        Update: {
          feature?: string;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          estimated_cost_usd?: number;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: string;
          user_id: string;
          default_model: string;
          currency: string;
          language: string;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_model?: string;
          currency?: string;
          language?: string;
          [key: string]: unknown;
        };
        Update: {
          default_model?: string;
          currency?: string;
          language?: string;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: CalendarConnectionProvider;
          status: CalendarConnectionStatus;
          last_synced_at: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: CalendarConnectionProvider;
          status?: CalendarConnectionStatus;
          last_synced_at?: string | null;
          error?: string | null;
          [key: string]: unknown;
        };
        Update: {
          status?: CalendarConnectionStatus;
          last_synced_at?: string | null;
          error?: string | null;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          connection_id: string | null;
          source: CalendarEventDbSource;
          external_id: string | null;
          title: string;
          description: string | null;
          location: string | null;
          start_at: string;
          end_at: string;
          all_day: boolean;
          trip_id: string | null;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: {
          id?: string;
          user_id: string;
          connection_id?: string | null;
          source: CalendarEventDbSource;
          external_id?: string | null;
          title: string;
          description?: string | null;
          location?: string | null;
          start_at: string;
          end_at: string;
          all_day?: boolean;
          trip_id?: string | null;
          [key: string]: unknown;
        };
        Update: {
          title?: string;
          description?: string | null;
          location?: string | null;
          start_at?: string;
          end_at?: string;
          all_day?: boolean;
          trip_id?: string | null;
          [key: string]: unknown;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
