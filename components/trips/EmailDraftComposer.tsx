"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { runGenerateEmailDraft } from "@/lib/actions/ai";

type Tone = "neutral" | "friendly" | "professional";

export function EmailDraftComposer({ tripId }: { tripId: string }) {
  const [operatorName, setOperatorName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [language, setLanguage] = useState("English");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!operatorName.trim() || !purpose.trim()) {
      setError("Operator name and purpose are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await runGenerateEmailDraft(tripId, {
          operatorName,
          purpose,
          tone,
          language,
          recipientEmail: recipientEmail || undefined,
        });
        setOperatorName("");
        setPurpose("");
        setRecipientEmail("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not draft the email. Try again.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border-subtle bg-sand-100 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Local operator">
          <Input
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Kyoto Rickshaw Tours"
            required
          />
        </Field>
        <Field label="Operator email (optional)">
          <Input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
        </Field>
      </div>
      <Field label="What should the email cover?">
        <Textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          rows={3}
          placeholder="Ask about availability for a private tour on..."
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tone">
          <Select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="neutral">Neutral</option>
          </Select>
        </Field>
        <Field label="Language">
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
        </Field>
      </div>
      {error && <p className="text-sm text-danger-strong">{error}</p>}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? (
          <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <Sparkles size={16} strokeWidth={1.75} />
        )}
        {isPending ? "Drafting…" : "Draft email"}
      </Button>
    </form>
  );
}
