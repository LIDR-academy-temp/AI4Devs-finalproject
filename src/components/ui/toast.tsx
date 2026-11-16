"use client";

import { CircleCheckIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Toast as ToastPrimitive } from "radix-ui";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cn } from "./utils";

// The success toast (DESIGN.md, Toast; docs/02-UX-DESIGN.md, section 2.7): one
// at a time, a new one replacing the last, announced politely, and closing
// after 5 seconds, waiting while the pointer is over it or it has focus.
// Errors never use it. The provider is mounted once, in the app shell.

const DURATION_IN_MS = 5000;

type ShownToast = { id: number; message: string };

const ToastContext = createContext<((message: string) => void) | null>(null);

/** Shows a success toast with the action's own message. */
export function useToast(): (message: string) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast needs the ToastProvider.");
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [toast, setToast] = useState<ShownToast | null>(null);
  const show = useCallback((message: string) => {
    // A new key opens a fresh toast, so it replaces the one shown, if any.
    setToast((last) => ({ id: (last?.id ?? 0) + 1, message }));
  }, []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider
        duration={DURATION_IN_MS}
        swipeDirection="down"
        label={t("notifications")}
      >
        {children}
        {toast && (
          <ToastPrimitive.Root
            key={toast.id}
            type="background"
            defaultOpen
            onOpenChange={(open) => {
              if (!open) setToast(null);
            }}
            className={cn(
              "bg-accent text-accent-foreground shadow-floating text-body-md flex w-full items-center gap-3 rounded-lg px-4 py-3",
              "data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]",
            )}
          >
            <CircleCheckIcon className="size-6 shrink-0" aria-hidden />
            <ToastPrimitive.Title className="min-w-0 flex-1 font-semibold">
              {toast.message}
            </ToastPrimitive.Title>
            <ToastPrimitive.Close className="focus-visible:ring-ring text-label-lg -my-2 -mr-2 inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-1 rounded-lg px-2 font-semibold outline-none focus-visible:ring-2">
              <XIcon className="size-5" aria-hidden />
              {t("close")}
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )}
        <ToastPrimitive.Viewport
          className={cn(
            "fixed z-50 flex flex-col outline-none",
            // Below 768px: full width inside the page margins, 16px above the bottom bar.
            "inset-x-margin bottom-[calc(var(--tab-bar-height,var(--tab-bar-fallback))+1rem)]",
            // From 768px: the bottom right of the content area.
            "md:right-6 md:bottom-6 md:left-auto md:w-[400px] md:max-w-[calc(100vw-272px-3rem)]",
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
