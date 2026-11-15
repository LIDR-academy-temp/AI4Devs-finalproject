import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

// Group loading, announced to screen readers (docs/02-UX-DESIGN.md, section
// 2.7): placeholders in the shapes of the header, the invite card, and the
// people rows, so nothing jumps when Group loads.
export default function Loading() {
  const t = useTranslations("states");
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-[104px] w-full rounded-xl" />
      <Skeleton className="h-[168px] w-full rounded-xl" />
      {[0, 1].map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-8 w-32 rounded-sm" />
          <Skeleton className="h-[78px] w-full rounded-xl" />
          <Skeleton className="h-[78px] w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
