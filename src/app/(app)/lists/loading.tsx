import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

// Lists loading, announced to screen readers (docs/02-UX-DESIGN.md, section
// 2.7): placeholders in the shapes of the list box, the quick-add card, the
// two filter rows, and the item cards, so nothing jumps when the list loads.
export default function Loading() {
  const t = useTranslations("states");
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-5 lg:max-w-[380px] xl:max-w-[420px]"
    >
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-[76px] w-full rounded-xl" />
      <Skeleton className="h-[124px] w-full rounded-xl" />
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-1.5">
          <Skeleton className="h-[22px] w-20 rounded-sm" />
          <div className="flex gap-2 overflow-hidden py-1">
            <Skeleton className="h-12 w-24 shrink-0 rounded-full" />
            <Skeleton className="h-12 w-28 shrink-0 rounded-full" />
            <Skeleton className="h-12 w-24 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((card) => (
          <Skeleton key={card} className="h-[108px] w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
