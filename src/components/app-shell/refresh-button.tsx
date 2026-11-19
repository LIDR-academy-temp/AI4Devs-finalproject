"use client";

import { RotateCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

// Refresh (docs/02-UX-DESIGN.md, section 2.2): reloads the current screen's
// data from the server, keeping the address and what the user typed in client
// components. The icon turns while it works, and screen readers hear it.
export function RefreshButton() {
  const t = useTranslations("shell");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        variant="secondary"
        className="px-3"
        aria-busy={pending || undefined}
        onClick={() => startTransition(() => router.refresh())}
      >
        <RotateCwIcon
          className={pending ? "motion-safe:animate-spin" : undefined}
          aria-hidden
        />
        {t("refresh")}
      </Button>
      <span aria-live="polite" className="sr-only">
        {pending ? t("refreshing") : ""}
      </span>
    </>
  );
}
