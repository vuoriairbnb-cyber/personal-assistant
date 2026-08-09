import { EmptyState } from "@/components/ui/EmptyState";

export default function GolfPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-text-primary">Golf</h1>
        <p className="mt-1 text-text-secondary">
          See your golf club&apos;s available tee times without leaving this app.
        </p>
      </div>
      <EmptyState
        title="Golf isn't connected yet"
        description="The goal is to surface available WiseGolf tee times here. WiseGolf has no public API, so no account is connected and nothing is automated yet — how that gets built safely is still an open question."
      />
    </div>
  );
}
