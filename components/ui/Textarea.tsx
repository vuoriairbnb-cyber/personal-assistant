import { cn } from "@/lib/utils/cn";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-sm border border-border-default bg-canvas px-3 py-2 text-sm text-text-primary transition-colors duration-150 placeholder:text-text-tertiary focus-visible:border-accent",
        className
      )}
      {...props}
    />
  );
}
