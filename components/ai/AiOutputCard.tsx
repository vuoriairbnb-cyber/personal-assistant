"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, formatCurrency } from "@/lib/utils/format";
import { TRIP_AI_OUTPUT_LABELS } from "@/types/trip";
import type { TripAiOutput } from "@/types/trip";
import type {
  StructuredPlanContent,
  BriefContent,
  ItineraryContent,
  BudgetContent,
  EmailDraftContent,
  AccommodationIdeasContent,
  ActivityIdeasContent,
  FlightNotesContent,
} from "@/types/ai-content";

export function AiOutputCard({ output }: { output: TripAiOutput }) {
  const [copied, setCopied] = useState(false);

  async function copyEmail(body: string) {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {TRIP_AI_OUTPUT_LABELS[output.type]}
          </p>
          <h3 className="mt-1 font-serif text-lg text-text-primary">{output.title}</h3>
        </div>
        <Badge tone={output.status === "approved" ? "success" : "neutral"}>
          {output.status === "approved" ? "Approved" : "Draft"}
        </Badge>
      </div>

      <div className="mt-4">
        <OutputContent output={output} onCopyEmail={copyEmail} copied={copied} />
      </div>

      <p className="mt-4 font-mono text-xs text-text-tertiary">
        Saved {formatDateTime(output.created_at)}
      </p>
    </Card>
  );
}

function OutputContent({
  output,
  onCopyEmail,
  copied,
}: {
  output: TripAiOutput;
  onCopyEmail: (body: string) => void;
  copied: boolean;
}) {
  const content = output.content as Record<string, unknown>;

  switch (output.type) {
    case "structured_plan": {
      const c = content as unknown as StructuredPlanContent;
      return (
        <div className="space-y-3 text-sm text-text-primary">
          <p>{c.summary}</p>
          {c.sections?.map((section) => (
            <div key={section.heading}>
              <p className="text-sm font-medium text-text-secondary">{section.heading}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    case "brief": {
      const c = content as unknown as BriefContent;
      return (
        <div className="space-y-3 text-sm text-text-primary">
          <p>{c.summary}</p>
          {c.highlights?.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {c.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    case "itinerary": {
      const c = content as unknown as ItineraryContent;
      return (
        <div className="space-y-4">
          {c.days?.map((day) => (
            <div key={day.day} className="rounded-md border border-border-subtle bg-sand-100 p-3">
              <p className="font-mono text-xs text-text-tertiary">
                Day {day.day}
                {day.date ? ` · ${day.date}` : ""}
              </p>
              <p className="mt-0.5 text-sm font-medium text-text-primary">{day.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                {day.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    case "budget": {
      const c = content as unknown as BudgetContent;
      return (
        <div className="space-y-2">
          {c.items?.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{item.label}</span>
              <span className="font-mono text-text-secondary">
                {formatCurrency(item.estimate, c.currency)}
              </span>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3 text-sm font-medium">
            <span>Total estimate</span>
            <span className="font-mono">{formatCurrency(c.total, c.currency)}</span>
          </div>
        </div>
      );
    }

    case "email_draft": {
      const c = content as unknown as EmailDraftContent;
      return (
        <div className="space-y-3">
          <p className="rounded-sm bg-accent-subtle px-3 py-2 text-xs font-medium text-accent-active">
            Draft ready — review before sending. Nothing is sent automatically.
          </p>
          {c.to && <p className="text-sm text-text-secondary">To: {c.to}</p>}
          <p className="text-sm font-medium text-text-primary">Subject: {c.subject}</p>
          <p className="whitespace-pre-wrap rounded-md border border-border-subtle bg-sand-100 p-3 text-sm text-text-primary">
            {c.body}
          </p>
          <button
            type="button"
            onClick={() => onCopyEmail(`Subject: ${c.subject}\n\n${c.body}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy draft"}
          </button>
        </div>
      );
    }

    case "accommodation_ideas": {
      const c = content as unknown as AccommodationIdeasContent;
      return (
        <div className="space-y-3">
          {c.options?.map((option, i) => (
            <div key={i} className="rounded-md border border-border-subtle bg-sand-100 p-3">
              <p className="text-sm font-medium text-text-primary">{option.name}</p>
              <p className="text-xs text-text-tertiary">
                {[option.area, option.priceRange].filter(Boolean).join(" · ")}
              </p>
              {option.notes && <p className="mt-1 text-sm text-text-secondary">{option.notes}</p>}
            </div>
          ))}
        </div>
      );
    }

    case "activity_ideas": {
      const c = content as unknown as ActivityIdeasContent;
      return (
        <ul className="space-y-2">
          {c.items?.map((item, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-text-primary">{item.name}</span>
              {item.category && <span className="text-text-tertiary"> · {item.category}</span>}
              {item.notes && <p className="text-text-secondary">{item.notes}</p>}
            </li>
          ))}
        </ul>
      );
    }

    case "flight_notes": {
      const c = content as unknown as FlightNotesContent;
      return (
        <div className="space-y-2 text-sm">
          <p className="text-text-primary">{c.summary}</p>
          <ul className="list-disc space-y-1 pl-5 text-text-secondary">
            {c.notes?.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      );
    }

    default:
      return (
        <pre className="overflow-x-auto rounded-md bg-sand-100 p-3 text-xs text-text-secondary">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
  }
}
