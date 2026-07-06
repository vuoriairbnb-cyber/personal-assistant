import { EmptyState } from "@/components/ui/EmptyState";

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-text-primary">Inbox</h1>
        <p className="mt-1 text-text-secondary">
          Track replies from operators and summarize offers once email is connected.
        </p>
      </div>
      <EmptyState
        title="Inbox isn't connected yet"
        description="This module is planned for a future release. No email account is connected, and nothing is ever sent automatically."
      />
    </div>
  );
}
