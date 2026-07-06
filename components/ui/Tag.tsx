import { cn } from "@/lib/utils/cn";

export function Tag({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border-default bg-sand-100 px-2.5 py-0.5 text-xs text-text-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
