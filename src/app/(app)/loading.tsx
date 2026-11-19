import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

// A screen loading inside the shell: card-shaped placeholders where the
// content will be, announced to screen readers (docs/02-UX-DESIGN.md, section
// 2.7).
export default function Loading() {
  const t = useTranslations("states");
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}
