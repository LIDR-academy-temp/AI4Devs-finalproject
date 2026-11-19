import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { ItemView } from "@/server/services/items";
import { itemActions } from "@/shared/items";

import { ItemActions } from "./item-actions";
import { ListColumn, sideBySideClassName } from "./list-column";
import { ItemStatusChip } from "./status-chip";

// The item page (docs/02-UX-DESIGN.md, sections 2.4 and 2.5; FR-07, FR-23):
// the status, who it is for, the quantity, the notes as plain text, Open in
// store, and the actions the user has for the status. For members, from
// 1024px, the item's list is beside it (design decision 6).

export function ItemPage({
  item,
  userId,
  isMember,
  groupId,
  lists,
  listItems,
}: {
  item: ItemView;
  userId: string;
  isMember: boolean;
  groupId: string;
  lists: readonly { id: string; name: string }[];
  listItems: readonly ItemView[];
}) {
  const t = useTranslations("item");
  const { main, menu } = itemActions(item, { userId, isMember });
  const list = lists.find(({ id }) => id === item.listId);

  const details = (
    <ItemActions
      item={item}
      backHref={isMember ? `/lists?list=${item.listId}` : "/to-buy"}
      main={main}
      menu={menu}
    >
      <div className="flex flex-col gap-3">
        <ItemStatusChip item={item} userId={userId} className="self-start" />
        <p className="text-body-lg text-muted-foreground flex flex-wrap gap-x-4">
          {item.recipient && (
            <span className="[overflow-wrap:anywhere]">
              {t("for", { name: item.recipient.name })}
            </span>
          )}
          <span>{t("quantity", { count: item.quantity })}</span>
        </p>
      </div>
      {item.notes && (
        <section className="border-border bg-card shadow-card flex flex-col gap-2 rounded-lg border-[1.5px] p-4">
          <h2 className="text-label-lg text-muted-foreground font-semibold">
            {t("notes")}
          </h2>
          {/* Shown as typed: React escapes the text (AC-95). */}
          <p className="text-body-lg [overflow-wrap:anywhere] whitespace-pre-wrap">
            {item.notes}
          </p>
        </section>
      )}
      {item.url && (
        <Button asChild variant="secondary">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {t("openInStore")}
            <ExternalLinkIcon aria-hidden />
            <span className="sr-only">({t("opensInNewTab")})</span>
          </a>
        </Button>
      )}
    </ItemActions>
  );

  if (!isMember || !list) return details;

  return (
    <div data-layout="wide" className={sideBySideClassName}>
      <div className="hidden lg:block">
        <ListColumn
          groupId={groupId}
          lists={lists}
          list={list}
          items={listItems}
          userId={userId}
          openItemId={item.id}
        />
      </div>
      <div className="lg:sticky lg:top-24">{details}</div>
    </div>
  );
}
