import { cn } from "@/lib/utils/cn";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-text-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-tertiary">{hint}</span>}
    </label>
  );
}
