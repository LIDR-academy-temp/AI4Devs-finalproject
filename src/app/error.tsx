"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

// A page that failed to load: what happened, and a way to try again
// (docs/02-UX-DESIGN.md, section 2.7).
export default function PageError({ reset }: { reset: () => void }) {
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <TriangleAlertIcon className="text-destructive size-12" aria-hidden />
      <h1 className="text-headline-lg font-bold">
        {tErrors("INTERNAL_ERROR")}
      </h1>
      <Button onClick={reset}>
        <RotateCwIcon aria-hidden />
        {tCommon("tryAgain")}
      </Button>
    </main>
  );
}
