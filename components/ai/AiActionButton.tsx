"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface AiActionButtonProps {
  label: string;
  onRun: () => Promise<void>;
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
}

export function AiActionButton({
  label,
  onRun,
  variant = "secondary",
  className,
  disabled,
}: AiActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await onRun();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      }
    });
  }

  return (
    <div className={cn("inline-flex flex-col items-start gap-1.5", className)}>
      <Button type="button" variant={variant} onClick={handleClick} disabled={disabled || isPending}>
        {isPending ? (
          <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <Sparkles size={16} strokeWidth={1.75} />
        )}
        {isPending ? "Working…" : label}
      </Button>
      {error && <p className="text-xs text-danger-strong">{error}</p>}
    </div>
  );
}
