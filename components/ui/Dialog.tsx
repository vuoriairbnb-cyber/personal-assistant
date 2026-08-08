"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[rgba(21,21,33,0.32)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border-subtle bg-card p-6 shadow-lg",
          className
        )}
      >
        {title && (
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-serif text-xl text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-tertiary transition-colors duration-150 hover:bg-sand-200 hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
        <div className={cn(title || description ? "mt-4" : undefined)}>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
