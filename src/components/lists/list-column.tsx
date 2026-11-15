import { ListPlusIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/screen-states";
import type { ItemView } from "@/server/services/items";

import { FilteredItems } from "./item-filters";
import { ListMenu } from "./list-menu";
import { QuickAdd } from "./quick-add";

// One list of the current group, as Lists shows it (docs/02-UX-DESIGN.md,
// section 2.4): the list menu, the quick field, the filters and items, and the
// + Add button. Lists and, beside the item on desktop, the item page render
// the same column (design decision 6).

/**
 * The side-by-side grid, marked wide so the shell widens its column from
 * 1024px: the list (380px to 420px) and the item (DESIGN.md, Responsive
 * Layout Model).
 */
export const sideBySideClassName =
  "lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-gutter-desktop xl:grid-cols-[420px_minmax(0,1fr)]";

export function ListColumn({
  groupId,
  lists,
  list,
  items,
  userId,
  openItemId,
}: {
  groupId: string;
  lists: readonly { id: string; name: string }[];
  list: { id: string; name: string };
  items: readonly ItemView[];
  userId: string;
  openItemId?: string;
}) {
  const t = useTranslations("lists");
  return (
    <div className="flex min-w-0 flex-col gap-5 pb-20 md:pb-0">
      <ListMenu groupId={groupId} lists={lists} currentListId={list.id} />
      {/* Keyed by list, so the quick field and the filters start over when
          the list changes; sibling keys must differ. */}
      <QuickAdd key={`quick-add-${list.id}`} listId={list.id} />
      {items.length === 0 ? (
        <EmptyState icon={ListPlusIcon}>{t("noItems")}</EmptyState>
      ) : (
        <FilteredItems
          key={`items-${list.id}`}
          items={items}
          userId={userId}
          openItemId={openItemId}
        />
      )}
      {/* 16px above the bottom bar's real height on phones (tab-nav.tsx);
          from 768px, at the column's bottom right. */}
      <Link
        href={`/items/new?list=${list.id}`}
        aria-label={t("addItem")}
        className="bg-primary text-label-lg text-primary-foreground shadow-floating hover:bg-primary-hover focus-visible:ring-ring fixed right-4 bottom-[calc(var(--tab-bar-height,var(--tab-bar-fallback))+1rem)] z-30 inline-flex min-h-14 items-center gap-2 rounded-full px-6 font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none md:sticky md:right-auto md:bottom-6 md:self-end"
      >
        <PlusIcon className="size-6" aria-hidden />
        {t("add")}
      </Link>
    </div>
  );
}
