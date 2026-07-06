import type { Database, TripAiOutputType, TripAiOutputStatus, TripStatus } from "@/types/database";

export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type TripInsert = Database["public"]["Tables"]["trips"]["Insert"];
export type TripUpdate = Database["public"]["Tables"]["trips"]["Update"];

export type TripAiOutput = Database["public"]["Tables"]["trip_ai_outputs"]["Row"];
export type AiCostLog = Database["public"]["Tables"]["ai_cost_logs"]["Row"];
export type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];

export type { TripAiOutputType, TripAiOutputStatus, TripStatus };

export const TRIP_AI_OUTPUT_LABELS: Record<TripAiOutputType, string> = {
  structured_plan: "Parsed plan",
  brief: "Trip brief",
  itinerary: "Itinerary",
  budget: "Budget estimate",
  email_draft: "Email draft",
  accommodation_ideas: "Accommodation ideas",
  activity_ideas: "Activity ideas",
  flight_notes: "Flight notes",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  planning: "Planning",
  active: "Active",
  booked: "Booked",
  completed: "Completed",
  archived: "Archived",
};
