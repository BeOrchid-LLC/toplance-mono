"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toasts announce through the same status semantics as the rest of the
 * system, and carry `aria-live="polite"` by default from Sonner.
 */
function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-surface !text-ink !border !border-border-strong !rounded-md !shadow-[var(--shadow-lg)] !text-base",
          description: "!text-ink-2",
          success: "!border-l-[3px] !border-l-success",
          warning: "!border-l-[3px] !border-l-warning",
          error: "!border-l-[3px] !border-l-danger",
          info: "!border-l-[3px] !border-l-info",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
