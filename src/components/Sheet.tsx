import { type ReactNode, useEffect } from "react";

import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

export function Sheet({ open, onClose, children, title }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-label={title ?? "Details"}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card px-5 pb-8 pt-3 shadow-pop transition-transform duration-400 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
        {children}
      </div>
    </>
  );
}
