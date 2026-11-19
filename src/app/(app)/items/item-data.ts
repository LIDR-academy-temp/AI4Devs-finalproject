import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/server/db/client";
import { NotAvailableError } from "@/server/services/errors";
import { getItem, listItems } from "@/server/services/items";
import { listLists, loadList } from "@/server/services/lists";

import { loadShell } from "../shell-data";

// What the item page and the edit form read about an item, through the
// services (design decision 1). An item the user can't see gets the "not
// available" state, the same as one that doesn't exist (BR-13). Read once
// per request, for the page and its title.

export const loadItemPage = cache(async (itemId: string) => {
  const { user } = await loadShell();
  const language = user.language ?? "es";

  const item = await getItem(db, user.id, itemId, language).catch(
    (error: unknown) => {
      if (error instanceof NotAvailableError) notFound();
      throw error;
    },
  );
  const list = await loadList(db, item.listId);
  const membership =
    list && user.memberships.find(({ groupId }) => groupId === list.groupId);
  if (!list || !membership) notFound();
  const isMember = membership.type === "member";

  // Members see the item's list beside the item on desktop (design decision 6).
  const [lists, items] = isMember
    ? await Promise.all([
        listLists(db, user.id, list.groupId),
        listItems(db, user.id, list.id, {}, language),
      ])
    : [[], []];

  return {
    user,
    item,
    groupId: list.groupId,
    isMember,
    lists,
    listItems: items,
  };
});

export type ItemPageData = Awaited<ReturnType<typeof loadItemPage>>;
