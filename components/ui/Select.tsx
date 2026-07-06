import { cn } from "@/lib/utils/cn";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-sm border border-border-default bg-canvas px-3 text-sm text-text-primary transition-colors duration-150 focus-visible:border-accent",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
