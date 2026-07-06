import "server-only";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/claude/client";
import type { Trip } from "@/types/trip";
import type {
  StructuredPlanContent,
  BriefContent,
  ItineraryContent,
  BudgetContent,
  EmailDraftContent,
} from "@/types/ai-content";

interface JsonSchemaObject {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

interface StructuredResult<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

const VOICE_SYSTEM_PROMPT = `You are the operational planning assistant inside "Personal Assistant", a calm,
premium travel-planning workspace. Voice: calm, competent, concierge-like — never chatty,
never full of exclamation points or emoji. Write in sentence case. Be concrete and specific
with dates, currency amounts, and place names — never vague.

You only ever produce structured data via the tool provided to you. You never book, purchase,
pay for, or send anything — you only draft and structure information for the user to review
and act on themselves.`;

async function runStructuredAction<T>(params: {
  prompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: JsonSchemaObject;
  model?: string;
  maxTokens?: number;
}): Promise<StructuredResult<T>> {
  const client = getAnthropicClient();
  const model = params.model ?? DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 2048,
    system: VOICE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: params.prompt }],
    tools: [
      {
        name: params.toolName,
        description: params.toolDescription,
        input_schema: params.inputSchema,
      },
    ],
    tool_choice: { type: "tool", name: params.toolName },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("The model did not return structured output. Try again.");
  }

  return {
    data: toolUse.input as T,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  };
}

function tripSummary(trip: Trip) {
  return `Trip: ${trip.title}
Destination: ${trip.destination}
Departure city: ${trip.departure_city ?? "unspecified"}
Date window: ${trip.date_window ?? "unspecified"}
Duration: ${trip.duration_days ? `${trip.duration_days} days` : "unspecified"}
Travelers: ${trip.travelers}
Budget: ${trip.budget_min ?? "?"}-${trip.budget_max ?? "?"} ${trip.currency}
Interests: ${trip.interests.join(", ") || "unspecified"}
Travel style: ${trip.travel_style ?? "unspecified"}
Notes: ${trip.notes ?? "none"}`;
}

export async function parseRawPlan(trip: Trip, rawPlan: string, model?: string) {
  return runStructuredAction<StructuredPlanContent>({
    model,
    prompt: `Structure the following freeform travel plan (likely pasted from a ChatGPT or Claude
chat) into a clean operational summary for this trip.

${tripSummary(trip)}

Raw plan:
"""
${rawPlan}
"""`,
    toolName: "structure_travel_plan",
    toolDescription: "Save a structured summary of a freeform travel plan.",
    inputSchema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "2-4 sentence overview of the plan." },
        sections: {
          type: "array",
          description: "Logical groupings, e.g. Transport, Lodging, Days 1-3, Activities.",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              items: { type: "array", items: { type: "string" } },
            },
            required: ["heading", "items"],
          },
        },
      },
      required: ["summary", "sections"],
    },
  });
}

export async function generateBrief(trip: Trip, context?: string, model?: string) {
  return runStructuredAction<BriefContent>({
    model,
    prompt: `Write a concise trip brief for the traveler(s) to orient them before planning continues.

${tripSummary(trip)}
${context ? `\nAdditional context:\n${context}` : ""}`,
    toolName: "save_trip_brief",
    toolDescription: "Save a concise trip brief.",
    inputSchema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "3-5 sentence overview of the trip." },
        highlights: {
          type: "array",
          description: "4-8 short highlight bullets (key experiences, logistics notes).",
          items: { type: "string" },
        },
      },
      required: ["summary", "highlights"],
    },
  });
}

export async function generateItinerary(trip: Trip, context?: string, model?: string) {
  return runStructuredAction<ItineraryContent>({
    model,
    prompt: `Draft a day-by-day itinerary.

${tripSummary(trip)}
${context ? `\nContext to build from (raw plan, brief, or prior notes):\n${context}` : ""}

Produce one entry per day of the trip. If duration is unspecified, use a sensible default of 5 days.`,
    toolName: "save_itinerary",
    toolDescription: "Save a day-by-day itinerary.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "integer" },
              date: { type: "string", description: "ISO date if known, else omit." },
              title: { type: "string", description: "Short theme for the day." },
              items: { type: "array", items: { type: "string" } },
            },
            required: ["day", "title", "items"],
          },
        },
      },
      required: ["days"],
    },
  });
}

export async function generateBudget(trip: Trip, context?: string, model?: string) {
  return runStructuredAction<BudgetContent>({
    model,
    prompt: `Draft a budget estimate broken into concrete line items (flights, lodging, local
transport, food, activities, buffer/contingency).

${tripSummary(trip)}
${context ? `\nContext to build from:\n${context}` : ""}

Use ${trip.currency} for all figures. Stay within or near the stated budget range where possible,
and note in "notes" if the plan doesn't fit.`,
    toolName: "save_budget",
    toolDescription: "Save a line-item budget estimate.",
    inputSchema: {
      type: "object",
      properties: {
        currency: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              estimate: { type: "number" },
              notes: { type: "string" },
            },
            required: ["label", "estimate"],
          },
        },
        total: { type: "number" },
      },
      required: ["currency", "items", "total"],
    },
  });
}

export interface EmailDraftParams {
  operatorName: string;
  purpose: string;
  tone?: "neutral" | "friendly" | "professional";
  language?: string;
  recipientEmail?: string;
}

export async function generateEmailDraft(trip: Trip, params: EmailDraftParams, model?: string) {
  return runStructuredAction<EmailDraftContent>({
    model,
    prompt: `Draft an email to a local operator on behalf of the traveler. This is a draft only —
it will never be sent automatically; the user copies or approves it manually.

${tripSummary(trip)}

Operator: ${params.operatorName}
Purpose: ${params.purpose}
Tone: ${params.tone ?? "professional"}
Language: ${params.language ?? "English"}`,
    toolName: "save_email_draft",
    toolDescription: "Save a drafted email to a local operator.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        language: { type: "string" },
        tone: { type: "string" },
      },
      required: ["subject", "body"],
    },
  });
}
