"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

// A screen that failed to load: what happened, and Try again
// (docs/02-UX-DESIGN.md, sections 2.1 and 2.7).
export function ScreenError({
  onRetry,
  retrying = false,
}: {
  onRetry: () => void;
  retrying?: boolean;
}) {
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  return (
    <section
      role="alert"
      className="flex flex-col items-center gap-6 py-8 text-center"
    >
      <TriangleAlertIcon className="text-destructive size-12" aria-hidden />
      <h1 className="text-headline-lg font-bold">
        {tErrors("INTERNAL_ERROR")}
      </h1>
      <Button onClick={onRetry} disabled={retrying}>
        <RotateCwIcon
          className={retrying ? "motion-safe:animate-spin" : undefined}
          aria-hidden
        />
        {tCommon("tryAgain")}
      </Button>
    </section>
  );
}
