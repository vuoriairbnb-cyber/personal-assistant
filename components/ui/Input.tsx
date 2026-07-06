import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-sm border border-border-default bg-canvas px-3 text-sm text-text-primary transition-colors duration-150 placeholder:text-text-tertiary focus-visible:border-accent",
        className
      )}
      {...props}
    />
  );
}
