// Shapes stored in trip_ai_outputs.content (jsonb), one per output type.
// Shared between the Claude action prompts (lib/claude/actions.ts) and the
// rendering logic in components/ai/AiOutputCard.tsx.

export interface StructuredPlanContent {
  summary: string;
  sections: { heading: string; items: string[] }[];
}

export interface BriefContent {
  summary: string;
  highlights: string[];
}

export interface ItineraryDay {
  day: number;
  date?: string;
  title: string;
  items: string[];
}

export interface ItineraryContent {
  days: ItineraryDay[];
}

export interface BudgetLineItem {
  label: string;
  estimate: number;
  notes?: string;
}

export interface BudgetContent {
  currency: string;
  items: BudgetLineItem[];
  total: number;
}

export interface EmailDraftContent {
  to?: string;
  subject: string;
  body: string;
  language?: string;
  tone?: string;
}

export interface AccommodationOption {
  name: string;
  area?: string;
  priceRange?: string;
  notes?: string;
}

export interface AccommodationIdeasContent {
  options: AccommodationOption[];
}

export interface ActivityItem {
  name: string;
  category?: string;
  notes?: string;
}

export interface ActivityIdeasContent {
  items: ActivityItem[];
}

export interface FlightNotesContent {
  summary: string;
  notes: string[];
}
