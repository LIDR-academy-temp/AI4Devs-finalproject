"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { Button } from "./button";
import { cn } from "./utils";

// The shadcn/ui dialog, with the parts the app uses, styled to DESIGN.md:
// level 3 (the dialog shadow over a dimmed backdrop), the 16px radius, and
// 16px text or larger.
//
// Two presentations (DESIGN.md, Layout & Spacing and Collapsible Groups &
// Sheets):
// - "dialog", the default: centered on every screen size. Escape and the
//   dialog's own Cancel button close it, so it has no close button.
// - "sheet", for short tasks such as Mark as shipped: below 768px a bottom
//   sheet with 16px top corners, a handle, a Close button, and its footer
//   fixed at the bottom; from 768px a centered dialog with the same Close
//   button.

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export function DialogTrigger(
  props: ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(
  props: ComponentProps<typeof DialogPrimitive.Close>,
) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const centered =
  "top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl";

// A sheet ends with its DialogFooter, which holds the bottom padding so it can
// stick to the bottom edge while the content scrolls.
const sheet = cn(
  // Below 768px: along the bottom edge.
  "inset-x-0 bottom-0 w-full rounded-t-xl border-b-0 pt-2 pb-0",
  // From 768px: the centered dialog.
  "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:w-[calc(100%-2rem)] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b-[1.5px] md:pt-6 md:pb-0",
);

export function DialogContent({
  className,
  children,
  variant = "dialog",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  variant?: "dialog" | "sheet";
}) {
  const t = useTranslations("common");
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="bg-foreground/50 fixed inset-0 z-50"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-variant={variant}
        className={cn(
          "group/dialog border-border bg-card text-card-foreground shadow-dialog fixed z-50 flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto border-[1.5px] p-5 outline-none md:p-6",
          variant === "sheet" ? sheet : centered,
          className,
        )}
        {...props}
      >
        {variant === "sheet" && (
          <div className="-mb-3 flex flex-col gap-1">
            <span
              aria-hidden
              className="bg-sheet-handle mx-auto h-[5px] w-9 rounded-full md:hidden"
            />
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" className="self-end px-4">
                <XIcon aria-hidden />
                {t("close")}
              </Button>
            </DialogPrimitive.Close>
          </div>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
        // In a sheet the actions stay at the bottom edge, clear of the home
        // indicator, while the content scrolls.
        "group-data-[variant=sheet]/dialog:bg-card group-data-[variant=sheet]/dialog:sticky group-data-[variant=sheet]/dialog:bottom-0 group-data-[variant=sheet]/dialog:-mx-5 group-data-[variant=sheet]/dialog:px-5 group-data-[variant=sheet]/dialog:pt-3 group-data-[variant=sheet]/dialog:pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:group-data-[variant=sheet]/dialog:-mx-6 md:group-data-[variant=sheet]/dialog:px-6 md:group-data-[variant=sheet]/dialog:pb-6",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-headline-md font-semibold [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-body-lg text-muted-foreground", className)}
      {...props}
    />
  );
}
