import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

// The item page loading: its header, status, details, and button shapes,
// announced to screen readers (docs/02-UX-DESIGN.md, section 2.7).
export default function Loading() {
  const t = useTranslations("states");
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-5">
      <span className="sr-only">{t("loading")}</span>
      <div className="flex items-center gap-2">
        <Skeleton className="size-12 rounded-lg" />
        <Skeleton className="h-9 flex-1" />
      </div>
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-13 w-full rounded-lg" />
    </div>
  );
}
