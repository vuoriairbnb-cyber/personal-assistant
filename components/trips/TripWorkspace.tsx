"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { EmptyState } from "@/components/ui/EmptyState";
import { AiActionButton } from "@/components/ai/AiActionButton";
import { AiOutputCard } from "@/components/ai/AiOutputCard";
import { RawPlanEditor } from "@/components/trips/RawPlanEditor";
import { NotesEditor } from "@/components/trips/NotesEditor";
import { EmailDraftComposer } from "@/components/trips/EmailDraftComposer";
import { TripSection } from "@/components/trips/TripSection";
import { formatCurrency } from "@/lib/utils/format";
import {
  runParsePlan,
  runGenerateBrief,
  runGenerateItinerary,
  runGenerateBudget,
} from "@/lib/actions/ai";
import type { Trip, TripAiOutput, TripAiOutputType } from "@/types/trip";

const SECTIONS = [
  { value: "overview", label: "Overview" },
  { value: "raw-plan", label: "Raw plan" },
  { value: "parsed-plan", label: "Parsed plan" },
  { value: "brief", label: "Brief" },
  { value: "itinerary", label: "Itinerary" },
  { value: "budget", label: "Budget" },
  { value: "emails", label: "Email drafts" },
  { value: "activities", label: "Activities" },
  { value: "accommodation", label: "Accommodation" },
  { value: "notes", label: "Notes" },
];

export function TripWorkspace({ trip, outputs }: { trip: Trip; outputs: TripAiOutput[] }) {
  const [active, setActive] = useState("overview");

  const byType = (type: TripAiOutputType) => outputs.filter((o) => o.type === type);

  return (
    <div className="space-y-6">
      <Tabs items={SECTIONS} value={active} onChange={setActive} />

      {active === "overview" && <OverviewPanel trip={trip} />}

      {active === "raw-plan" && (
        <TripSection
          title="Raw plan"
          description="Paste a plan you sparred on elsewhere (ChatGPT, Claude chat) — this app structures and operationalizes it from here."
        >
          <RawPlanEditor tripId={trip.id} initialValue={trip.raw_plan ?? ""} />
          <AiActionButton
            label="Parse plan"
            onRun={() => runParsePlan(trip.id)}
            disabled={!trip.raw_plan?.trim()}
          />
        </TripSection>
      )}

      {active === "parsed-plan" && (
        <OutputsPanel
          title="Parsed plan"
          description="Structured summary generated from your raw plan."
          outputs={byType("structured_plan")}
          emptyHint="Paste a raw plan and parse it to see a structured summary here."
        />
      )}

      {active === "brief" && (
        <OutputsPanel
          title="Brief"
          action={<AiActionButton label="Generate trip brief" onRun={() => runGenerateBrief(trip.id)} />}
          outputs={byType("brief")}
          emptyHint="No brief yet. Generate one from the trip details."
        />
      )}

      {active === "itinerary" && (
        <OutputsPanel
          title="Itinerary"
          action={
            <AiActionButton label="Generate itinerary" onRun={() => runGenerateItinerary(trip.id)} />
          }
          outputs={byType("itinerary")}
          emptyHint="No itinerary yet."
        />
      )}

      {active === "budget" && (
        <OutputsPanel
          title="Budget"
          action={
            <AiActionButton label="Generate budget estimate" onRun={() => runGenerateBudget(trip.id)} />
          }
          outputs={byType("budget")}
          emptyHint="No budget estimate yet."
        />
      )}

      {active === "emails" && (
        <TripSection
          title="Email drafts"
          description="Drafted for your review — approve and send yourself. Nothing is ever sent automatically."
        >
          <EmailDraftComposer tripId={trip.id} />
          <OutputsList outputs={byType("email_draft")} emptyHint="No email drafts yet." />
        </TripSection>
      )}

      {active === "activities" && (
        <OutputsPanel
          title="Activities"
          outputs={byType("activity_ideas")}
          emptyHint="No activity ideas saved yet."
        />
      )}

      {active === "accommodation" && (
        <OutputsPanel
          title="Accommodation"
          outputs={byType("accommodation_ideas")}
          emptyHint="No accommodation ideas saved yet."
        />
      )}

      {active === "notes" && <NotesEditor tripId={trip.id} initialValue={trip.notes ?? ""} />}
    </div>
  );
}

function OverviewPanel({ trip }: { trip: Trip }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Destination</p>
        <p className="mt-1 text-text-primary">{trip.destination}</p>
        {trip.departure_city && (
          <>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Departure city
            </p>
            <p className="mt-1 text-text-primary">{trip.departure_city}</p>
          </>
        )}
      </Card>
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Dates</p>
        <p className="mt-1 font-mono text-sm text-text-primary">{trip.date_window ?? "Not set"}</p>
        {trip.duration_days && (
          <p className="mt-1 text-sm text-text-secondary">{trip.duration_days} days</p>
        )}
      </Card>
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Budget</p>
        <p className="mt-1 font-mono text-sm text-text-primary">
          {formatCurrency(trip.budget_min, trip.currency)} –{" "}
          {formatCurrency(trip.budget_max, trip.currency)}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {trip.travelers} traveler{trip.travelers === 1 ? "" : "s"}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
          Style &amp; interests
        </p>
        <p className="mt-1 text-sm text-text-secondary">{trip.travel_style ?? "Not set"}</p>
        {trip.interests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {trip.interests.map((interest) => (
              <Tag key={interest}>{interest}</Tag>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function OutputsPanel({
  title,
  description,
  outputs,
  emptyHint,
  action,
}: {
  title: string;
  description?: string;
  outputs: TripAiOutput[];
  emptyHint: string;
  action?: React.ReactNode;
}) {
  return (
    <TripSection title={title} description={description} action={action}>
      <OutputsList outputs={outputs} emptyHint={emptyHint} />
    </TripSection>
  );
}

function OutputsList({ outputs, emptyHint }: { outputs: TripAiOutput[]; emptyHint: string }) {
  if (outputs.length === 0) {
    return <EmptyState title="Nothing saved yet" description={emptyHint} />;
  }
  return (
    <div className="space-y-4">
      {outputs.map((output) => (
        <AiOutputCard key={output.id} output={output} />
      ))}
    </div>
  );
}
