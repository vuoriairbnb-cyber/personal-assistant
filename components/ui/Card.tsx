import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
  padded = true,
  hoverable = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean; hoverable?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-subtle bg-card shadow-sm",
        padded && "p-5",
        hoverable && "transition-colors duration-150 hover:bg-card-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
