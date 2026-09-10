"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { StoryTone } from "@/components/morning-brief/mock-data";

const tones: Record<StoryTone, string> = {
  violet: "bg-accent-subtle text-accent-active",
  green: "bg-success-bg text-success-strong",
  sand: "bg-warning-bg text-warning-strong",
  blue: "bg-sand-200 text-text-primary",
  rose: "bg-danger-bg text-danger-strong",
};

type StoryImageProps = {
  imageUrl: string | null;
  imageAlt?: string | null;
  label: string;
  tone: StoryTone;
  featured?: boolean;
};

export function StoryImage({ imageUrl, imageAlt, label, tone, featured = false }: StoryImageProps) {
  const [didFail, setDidFail] = useState(false);
  const hasImage = Boolean(imageUrl) && !didFail;

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg", featured ? "aspect-video w-full" : "h-[76px] w-[112px] sm:h-[92px] sm:w-[136px]", !hasImage && tones[tone])}>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- future adapters supply permitted image URLs; this UI needs a runtime fallback.
        <img src={imageUrl ?? undefined} alt={imageAlt ?? ""} className="h-full w-full object-cover" onError={() => setDidFail(true)} />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/10 to-transparent p-3">
          <ImageOff size={featured ? 18 : 14} aria-hidden className="mb-auto opacity-45" />
          <span className="border-t border-current/20 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</span>
        </div>
      )}
    </div>
  );
}
