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
export type GolfWatchStatus = "active" | "processing" | "matched" | "expired" | "cancelled";
export type MorningBriefSourceType = "rss" | "api" | "web_metadata" | "manual" | "official" | "other";
export type MorningBriefContentType = "breaking_news" | "news" | "analysis" | "opinion" | "explainer" | "long_read";
export type MorningBriefAccessType = "public" | "subscription" | "unknown";
export type MorningBriefAssetType = "fund" | "equity" | "bond" | "loan_fund" | "credit_strategy" | "other";
export type MorningBriefSection = "top_5" | "vietnam" | "credit" | "finland" | "markets" | "politics" | "emerging_frontier" | "vc_pe" | "world" | "worth_reading";

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
          member_plus_union_id: string | null;
          member_plus_union_name: string | null;
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
          member_plus_union_id?: string | null;
          member_plus_union_name?: string | null;
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
          member_plus_union_id?: string | null;
          member_plus_union_name?: string | null;
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
      golf_watches: {
        Row: {
          id: string; user_id: string; courses: string[]; search_all_supported: boolean;
          date: string; time_from: string | null; time_to: string | null; players: number;
          status: GolfWatchStatus; created_at: string; updated_at: string;
          last_checked_at: string | null; next_check_at: string | null; expires_at: string;
          processing_started_at: string | null; matched_at: string | null;
          matched_course: string | null; matched_time: string | null;
          matched_available_spots: number | null; matched_payload: Record<string, unknown> | null;
          [key: string]: unknown;
        };
        Insert: {
          id?: string; user_id: string; courses: string[]; search_all_supported?: boolean;
          date: string; time_from?: string | null; time_to?: string | null; players: number;
          status?: GolfWatchStatus; last_checked_at?: string | null; next_check_at?: string | null;
          expires_at: string; processing_started_at?: string | null; matched_at?: string | null;
          matched_course?: string | null; matched_time?: string | null;
          matched_available_spots?: number | null; matched_payload?: Record<string, unknown> | null;
          [key: string]: unknown;
        };
        Update: {
          courses?: string[]; search_all_supported?: boolean; date?: string;
          time_from?: string | null; time_to?: string | null; players?: number;
          status?: GolfWatchStatus; last_checked_at?: string | null; next_check_at?: string | null;
          expires_at?: string; processing_started_at?: string | null; matched_at?: string | null;
          matched_course?: string | null; matched_time?: string | null;
          matched_available_spots?: number | null; matched_payload?: Record<string, unknown> | null;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      notification_outbox: {
        Row: {
          id: string; user_id: string; event_type: string; source_type: string; source_id: string;
          payload: Record<string, unknown>; status: string; created_at: string; processed_at: string | null;
          channel: string | null; delivery_attempts: number; last_error: string | null;
          processing_started_at: string | null; provider_message_id: string | null; [key: string]: unknown;
        };
        Insert: {
          id?: string; user_id: string; event_type: string; source_type: string; source_id: string;
          payload: Record<string, unknown>; status?: string; processed_at?: string | null;
          channel?: string | null; delivery_attempts?: number; last_error?: string | null;
          processing_started_at?: string | null; provider_message_id?: string | null; [key: string]: unknown;
        };
        Update: { status?: string; processed_at?: string | null; channel?: string | null; delivery_attempts?: number; last_error?: string | null; processing_started_at?: string | null; provider_message_id?: string | null; [key: string]: unknown; };
        Relationships: [];
      };
      player_watches: {
        Row: { id: string; user_id: string; player_name: string; player_name_normalized: string; courses: string[]; search_all_supported: boolean; date_from: string; date_to: string; status: "active" | "processing" | "expired" | "cancelled"; consent_status: string; consent_reference: string | null; consented_at: string | null; created_at: string; updated_at: string; last_checked_at: string | null; next_check_at: string | null; expires_at: string; processing_started_at: string | null; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; player_name: string; player_name_normalized: string; courses: string[]; search_all_supported?: boolean; date_from: string; date_to: string; status?: "active" | "processing" | "expired" | "cancelled"; consent_status?: string; consent_reference?: string | null; consented_at?: string | null; expires_at: string; last_checked_at?: string | null; next_check_at?: string | null; processing_started_at?: string | null; [key: string]: unknown; };
        Update: { status?: "active" | "processing" | "expired" | "cancelled"; last_checked_at?: string | null; next_check_at?: string | null; processing_started_at?: string | null; [key: string]: unknown; }; Relationships: [];
      };
      player_watch_matches: {
        Row: { id: string; watch_id: string; course: string; date: string; tee_time: string; player_name: string; player_name_normalized: string; first_seen_at: string; notified_at: string | null; [key: string]: unknown; };
        Insert: { id?: string; watch_id: string; course: string; date: string; tee_time: string; player_name: string; player_name_normalized: string; notified_at?: string | null; [key: string]: unknown; };
        Update: { notified_at?: string | null; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_sources: {
        Row: { id: string; slug: string; name: string; base_url: string | null; source_type: MorningBriefSourceType; default_language: string | null; enabled: boolean; default_content_type: MorningBriefContentType | null; metadata_json: Record<string, unknown>; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; slug: string; name: string; base_url?: string | null; source_type: MorningBriefSourceType; default_language?: string | null; enabled?: boolean; default_content_type?: MorningBriefContentType | null; metadata_json?: Record<string, unknown>; [key: string]: unknown; };
        Update: { slug?: string; name?: string; base_url?: string | null; source_type?: MorningBriefSourceType; default_language?: string | null; enabled?: boolean; default_content_type?: MorningBriefContentType | null; metadata_json?: Record<string, unknown>; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_articles: {
        Row: { id: string; source_id: string; source_article_id: string | null; title: string; subtitle: string | null; excerpt: string | null; body_text: string | null; canonical_url: string; author: string | null; published_at: string; fetched_at: string; language: string | null; content_type: MorningBriefContentType; access_type: MorningBriefAccessType; image_url: string | null; image_alt: string | null; image_source: string | null; raw_metadata_json: Record<string, unknown>; content_hash: string | null; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; source_id: string; source_article_id?: string | null; title: string; subtitle?: string | null; excerpt?: string | null; body_text?: string | null; canonical_url: string; author?: string | null; published_at: string; fetched_at?: string; language?: string | null; content_type?: MorningBriefContentType; access_type?: MorningBriefAccessType; image_url?: string | null; image_alt?: string | null; image_source?: string | null; raw_metadata_json?: Record<string, unknown>; content_hash?: string | null; [key: string]: unknown; };
        Update: Partial<Database["public"]["Tables"]["morning_brief_articles"]["Insert"]>; Relationships: [];
      };
      morning_brief_article_classifications: {
        Row: { id: string; article_id: string; countries: string[]; regions: string[]; categories: string[]; topics: string[]; sectors: string[]; companies: string[]; people: string[]; asset_classes: string[]; funds: string[]; event_type: string | null; significance: number | null; consequence: number | null; scope: number | null; confidence: number | null; primary_section: MorningBriefSection | null; summary: string | null; why_it_matters: string | null; classification_version: string; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; article_id: string; countries?: string[]; regions?: string[]; categories?: string[]; topics?: string[]; sectors?: string[]; companies?: string[]; people?: string[]; asset_classes?: string[]; funds?: string[]; event_type?: string | null; significance?: number | null; consequence?: number | null; scope?: number | null; confidence?: number | null; primary_section?: MorningBriefSection | null; summary?: string | null; why_it_matters?: string | null; classification_version: string; [key: string]: unknown; };
        Update: Partial<Database["public"]["Tables"]["morning_brief_article_classifications"]["Insert"]>; Relationships: [];
      };
      morning_brief_article_embeddings: {
        /** pgvector values are sent to PostgREST as a vector literal string, e.g. "[0.1,0.2]". */
        Row: { id: string; article_id: string; embedding: string; embedding_model: string; embedding_version: string; input_hash: string; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; article_id: string; embedding: string; embedding_model: string; embedding_version: string; input_hash: string; [key: string]: unknown; };
        Update: { embedding?: string; embedding_model?: string; embedding_version?: string; input_hash?: string; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_story_clusters: {
        Row: { id: string; primary_article_id: string | null; canonical_headline: string | null; canonical_summary: string | null; event_key: string | null; display_image_url: string | null; display_image_alt: string | null; display_image_source: string | null; first_published_at: string | null; latest_published_at: string | null; source_count: number; cluster_version: string; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; primary_article_id?: string | null; canonical_headline?: string | null; canonical_summary?: string | null; event_key?: string | null; display_image_url?: string | null; display_image_alt?: string | null; display_image_source?: string | null; first_published_at?: string | null; latest_published_at?: string | null; source_count?: number; cluster_version?: string; [key: string]: unknown; };
        Update: Partial<Database["public"]["Tables"]["morning_brief_story_clusters"]["Insert"]>; Relationships: [];
      };
      morning_brief_cluster_articles: {
        Row: { cluster_id: string; article_id: string; relation_type: "primary" | "same_event" | "analysis" | "local_perspective" | "follow_up"; similarity: number | null; source_priority: number | null; created_at: string; [key: string]: unknown; };
        Insert: { cluster_id: string; article_id: string; relation_type: "primary" | "same_event" | "analysis" | "local_perspective" | "follow_up"; similarity?: number | null; source_priority?: number | null; [key: string]: unknown; };
        Update: { relation_type?: "primary" | "same_event" | "analysis" | "local_perspective" | "follow_up"; similarity?: number | null; source_priority?: number | null; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_story_briefings: {
        Row: { id: string; story_cluster_id: string; user_id: string | null; input_hash: string | null; paragraphs_json: string[]; why_it_matters: string; key_takeaways_json: string[]; exposure_path_json: string[] | null; evidence_note: string | null; generated_from_article_ids: string[]; generation_version: string; generated_at: string; created_at: string; [key: string]: unknown; };
        Insert: { id?: string; story_cluster_id: string; user_id?: string | null; input_hash?: string | null; paragraphs_json?: string[]; why_it_matters: string; key_takeaways_json?: string[]; exposure_path_json?: string[] | null; evidence_note?: string | null; generated_from_article_ids?: string[]; generation_version: string; generated_at?: string; [key: string]: unknown; };
        Update: { user_id?: string | null; input_hash?: string | null; paragraphs_json?: string[]; why_it_matters?: string; key_takeaways_json?: string[]; exposure_path_json?: string[] | null; evidence_note?: string | null; generated_from_article_ids?: string[]; generation_version?: string; generated_at?: string; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_portfolio_assets: {
        Row: { id: string; user_id: string; name: string; slug: string; asset_type: MorningBriefAssetType; priority: number; active: boolean; metadata_json: Record<string, unknown>; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; name: string; slug: string; asset_type: MorningBriefAssetType; priority?: number; active?: boolean; metadata_json?: Record<string, unknown>; [key: string]: unknown; };
        Update: { name?: string; slug?: string; asset_type?: MorningBriefAssetType; priority?: number; active?: boolean; metadata_json?: Record<string, unknown>; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_portfolio_exposures: {
        Row: { id: string; user_id: string; portfolio_asset_id: string; exposure_type: "country" | "company" | "sector" | "asset_class" | "topic" | "region"; exposure_key: string; weight: number | null; relevance_strength: number; valid_from: string | null; valid_to: string | null; metadata_json: Record<string, unknown>; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; portfolio_asset_id: string; exposure_type: "country" | "company" | "sector" | "asset_class" | "topic" | "region"; exposure_key: string; weight?: number | null; relevance_strength?: number; valid_from?: string | null; valid_to?: string | null; metadata_json?: Record<string, unknown>; [key: string]: unknown; };
        Update: { portfolio_asset_id?: string; exposure_type?: "country" | "company" | "sector" | "asset_class" | "topic" | "region"; exposure_key?: string; weight?: number | null; relevance_strength?: number; valid_from?: string | null; valid_to?: string | null; metadata_json?: Record<string, unknown>; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_user_preferences: {
        Row: { id: string; user_id: string; dimension_type: "category" | "topic" | "country" | "region" | "sector" | "source" | "content_type"; dimension_key: string; explicit_weight: number; pinned: boolean; metadata_json: Record<string, unknown>; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; dimension_type: "category" | "topic" | "country" | "region" | "sector" | "source" | "content_type"; dimension_key: string; explicit_weight?: number; pinned?: boolean; metadata_json?: Record<string, unknown>; [key: string]: unknown; };
        Update: { dimension_type?: "category" | "topic" | "country" | "region" | "sector" | "source" | "content_type"; dimension_key?: string; explicit_weight?: number; pinned?: boolean; metadata_json?: Record<string, unknown>; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_feedback: {
        Row: { id: string; user_id: string; article_id: string | null; story_cluster_id: string | null; event_type: string; signal_strength: number | null; metadata_json: Record<string, unknown>; created_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; article_id?: string | null; story_cluster_id?: string | null; event_type: string; signal_strength?: number | null; metadata_json?: Record<string, unknown>; [key: string]: unknown; };
        Update: never; Relationships: [];
      };
      morning_brief_imports: {
        Row: { id: string; user_id: string; original_url: string; normalized_url: string; linked_article_id: string | null; status: "pending" | "processing" | "completed" | "failed"; error_message: string | null; import_strength: number | null; created_at: string; processed_at: string | null; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; original_url: string; normalized_url: string; linked_article_id?: string | null; status?: "pending" | "processing" | "completed" | "failed"; error_message?: string | null; import_strength?: number | null; processed_at?: string | null; [key: string]: unknown; };
        Update: { status?: "pending" | "processing" | "completed" | "failed"; error_message?: string | null; import_strength?: number | null; processed_at?: string | null; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_learned_interests: {
        Row: { id: string; user_id: string; dimension_type: string; dimension_key: string; affinity_score: number; positive_signal_count: number; negative_signal_count: number; last_signal_at: string | null; model_version: string; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; dimension_type: string; dimension_key: string; affinity_score: number; positive_signal_count?: number; negative_signal_count?: number; last_signal_at?: string | null; model_version: string; [key: string]: unknown; };
        Update: { affinity_score?: number; positive_signal_count?: number; negative_signal_count?: number; last_signal_at?: string | null; model_version?: string; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_scores: {
        Row: { id: string; user_id: string; article_id: string | null; story_cluster_id: string | null; portfolio_relevance: number; learned_preference: number; importance_score: number; explicit_interest: number; freshness_score: number; source_fit: number; liked_similarity: number; novelty_score: number; exploration_score: number; final_score: number; score_explanation_json: Record<string, unknown>; algorithm_version: string; created_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; article_id?: string | null; story_cluster_id?: string | null; portfolio_relevance?: number; learned_preference?: number; importance_score?: number; explicit_interest?: number; freshness_score?: number; source_fit?: number; liked_similarity?: number; novelty_score?: number; exploration_score?: number; final_score: number; score_explanation_json?: Record<string, unknown>; algorithm_version: string; [key: string]: unknown; };
        Update: never; Relationships: [];
      };
      morning_briefs: {
        Row: { id: string; user_id: string; brief_date: string; brief_version: number; generated_at: string; status: "generating" | "ready" | "failed" | "archived"; summary_text: string | null; algorithm_version: string; classification_version: string | null; estimated_read_minutes: number | null; metadata_json: Record<string, unknown>; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; brief_date: string; brief_version?: number; generated_at?: string; status?: "generating" | "ready" | "failed" | "archived"; summary_text?: string | null; algorithm_version: string; classification_version?: string | null; estimated_read_minutes?: number | null; metadata_json?: Record<string, unknown>; [key: string]: unknown; };
        Update: { status?: "generating" | "ready" | "failed" | "archived"; summary_text?: string | null; classification_version?: string | null; estimated_read_minutes?: number | null; metadata_json?: Record<string, unknown>; [key: string]: unknown; }; Relationships: [];
      };
      morning_brief_items: {
        Row: { id: string; brief_id: string; story_cluster_id: string | null; article_id: string | null; section: MorningBriefSection; rank: number; score: number | null; score_explanation_json: Record<string, unknown> | null; created_at: string; [key: string]: unknown; };
        Insert: { id?: string; brief_id: string; story_cluster_id?: string | null; article_id?: string | null; section: MorningBriefSection; rank: number; score?: number | null; score_explanation_json?: Record<string, unknown> | null; [key: string]: unknown; };
        Update: never; Relationships: [];
      };
      kide_agent_devices: {
        Row: { id: string; user_id: string; name: string; token_hash: string; created_at: string; last_seen_at: string | null; revoked_at: string | null; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; name: string; token_hash: string; last_seen_at?: string | null; revoked_at?: string | null; [key: string]: unknown; };
        Update: { name?: string; last_seen_at?: string | null; revoked_at?: string | null; [key: string]: unknown; }; Relationships: [];
      };
      kide_agent_pairings: {
        Row: { id: string; user_id: string; pairing_code_hash: string; expires_at: string; used_at: string | null; created_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; pairing_code_hash: string; expires_at: string; used_at?: string | null; [key: string]: unknown; };
        Update: { used_at?: string | null; expires_at?: string; [key: string]: unknown; }; Relationships: [];
      };
      kide_watches: {
        Row: { id: string; user_id: string; event_id: string; event_url: string | null; event_name: string | null; target_mode: string; exact_variant_name: string | null; max_price_cents: number | null; quantity: number; sale_start_at: string; expires_at: string; status: string; armed_at: string | null; disarmed_at: string | null; reservation_attempted: boolean; selected_variant_name: string | null; selected_price_cents: number | null; last_agent_update_at: string | null; safe_error: string | null; created_at: string; updated_at: string; [key: string]: unknown; };
        Insert: { id?: string; user_id: string; event_id: string; event_url?: string | null; event_name?: string | null; target_mode: string; exact_variant_name?: string | null; max_price_cents?: number | null; quantity?: number; sale_start_at: string; expires_at: string; status?: string; armed_at?: string | null; disarmed_at?: string | null; reservation_attempted?: boolean; selected_variant_name?: string | null; selected_price_cents?: number | null; last_agent_update_at?: string | null; safe_error?: string | null; [key: string]: unknown; };
        Update: { event_url?: string | null; event_name?: string | null; target_mode?: string; exact_variant_name?: string | null; max_price_cents?: number | null; sale_start_at?: string; expires_at?: string; status?: string; armed_at?: string | null; disarmed_at?: string | null; reservation_attempted?: boolean; selected_variant_name?: string | null; selected_price_cents?: number | null; last_agent_update_at?: string | null; safe_error?: string | null; updated_at?: string; [key: string]: unknown; }; Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      take_golf_rate_limit: {
        Args: { p_user_hash: string };
        Returns: { allowed: boolean; retry_after_seconds: number }[];
      };
      claim_due_golf_watches: { Args: { p_limit?: number }; Returns: Database["public"]["Tables"]["golf_watches"]["Row"][] };
      complete_golf_watch_match: { Args: { p_watch_id: string; p_course: string; p_time: string; p_available_spots: number; p_payload: Record<string, unknown> }; Returns: boolean };
      claim_pending_notification_outbox: { Args: { p_limit?: number }; Returns: Database["public"]["Tables"]["notification_outbox"]["Row"][] };
      claim_due_player_watches: { Args: { p_limit?: number }; Returns: Database["public"]["Tables"]["player_watches"]["Row"][] };
      record_player_watch_match: { Args: { p_watch_id: string; p_course: string; p_date: string; p_time: string; p_player_name: string; p_player_name_normalized: string }; Returns: string | null };
      consume_kide_agent_pairing: { Args: { p_pairing_code_hash: string }; Returns: string | null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
